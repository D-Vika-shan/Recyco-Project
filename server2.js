require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');
const { EmailClient } = require('@azure/communication-email');

const app = express();
const port = process.env.PORT || 3000;

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const azureMapsSubscriptionKey = process.env.AZURE_MAPS_API_KEY;
const customVisionEndpoint = process.env.AZURE_CUSTOM_VISION_ENDPOINT;
const customVisionPredictionKey = process.env.AZURE_CUSTOM_VISION_API_KEY;

const credential = new AzureNamedKeyCredential(accountName, accountKey);
const connectionString = process.env.ACS_CONNECTION_STRING;
const emailClient = new EmailClient(connectionString);

const loginTableName = 'LoginDetails2';
const orderTableName = 'OrderDetails';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/config', (req, res) => {
    res.json({
        azureMapsSubscriptionKey: azureMapsSubscriptionKey,
        customVisionEndpoint: customVisionEndpoint,
        customVisionPredictionKey: customVisionPredictionKey
    });
});


const logintableClient = new TableClient(
    `https://${accountName}.table.core.windows.net`,
    loginTableName,
    new AzureNamedKeyCredential(accountName, accountKey)
);

app.post('/submit-login', async (req, res) => {
    const { username, password, email, location } = req.body;

    try {
        const existingUser = await logintableClient.getEntity(email, email);
        
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists. Please sign in.' });
        }
    } catch (error) {
        if (error.statusCode !== 404) {
            console.error('Error checking existing email:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const entity = {
            partitionKey: email,
            rowKey: username,
            password: hashedPassword,
            location: location
        };

        await logintableClient.createEntity(entity);
        console.log('Login details inserted successfully.');

        res.status(201).json({ message: 'Login details submitted successfully.' });
    } catch (error) {
        console.error('Error inserting login details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/sign-in', async (req, res) => {
    const { email, password } = req.body;

    try {
        const entities = logintableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${email}'` }
        });

        let userEntity = null;
        for await (const entity of entities) {
            userEntity = entity;
            break;  
        }
        
        const data = {
            username: userEntity.rowKey,
            email: userEntity.partitionKey,
            location: userEntity.location
        };

        if (!userEntity) {
            return res.status(404).send('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, userEntity.password);
        if (!isPasswordValid) {
            return res.status(401).send('Invalid credentials');
        }

        res.json(data);

    } catch (error) {
        console.error('Error signing in:', error);
        res.status(500).send('Internal server error');
    }
});

const ordertableClient = new TableClient(
    `https://${accountName}.table.core.windows.net`,
    orderTableName,
    credential
);

const getNextOrderId = async () => {
    let entities = [];
    try {
        for await (const entity of ordertableClient.listEntities()) {
            entities.push(entity);
        }
        
        if (entities.length === 0) {
            return 1001;
        } else {
            entities.sort((a, b) => parseInt(b.id) - parseInt(a.id));
            const lastOrderId = parseInt(entities[0].id);
            return lastOrderId + 1;
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error;
    }
};


async function insertOrderDetails(userId, category, description, userEmail) {
    try {
        
        const newOrderId = await getNextOrderId();
        const entity = {
            partitionKey: userEmail,
            rowKey: new Date().toISOString(),
            id: `${newOrderId}`,
            category: category,
            description: description
        };

        console.log('Entity to be inserted:', entity);

        await ordertableClient.createEntity(entity);
        console.log('Order details inserted successfully.');

        const emailMessage = {
            senderAddress: process.env.ACS_SENDER_ADDRESS,
            content: {
                subject: 'Order Details Submitted',
                html: `Hello, ${userId}.<br> Order No.: ${entity.id}<br> Your order for ${category} has been successfully submitted with the following description: ${description}.`,
            },
            recipients: {
                to: [{ address: userEmail }],
            },
        };        

        const poller = await emailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        console.log('Email sent successfully:', result);

    } catch (error) {
        console.error('Error inserting order details or sending email:', error);
    }
}

app.post('/storeOrderDetails', async (req, res) => {
    const { userId, category, description, userEmail } = req.body;
    console.log('Order data received:', req.body);
    await insertOrderDetails(userId, category, description, userEmail);
    res.send('Order details submitted successfully.');
});

app.get('/order-history', async (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).send('Email is required.');
    }

    try {
        const ordertableClient = new TableClient(
            `https://${accountName}.table.core.windows.net`,
            orderTableName,
            credential
        );

        const entities = ordertableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${email}'`
            }
        });

        const orderHistory = [];
        for await (const entity of entities) {
            orderHistory.push(entity);
        }

        orderHistory.sort((a, b) => new Date(b.rowKey) - new Date(a.rowKey));
        res.json(orderHistory);

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).send('Error fetching order history.');
    }
});


app.delete('/cancel-order', async (req, res) => {
    const { email, id } = req.body;

    try {
        const orderEntity = await ordertableClient.getEntity(email, id);
        console.log(`Order no: ${orderEntity.id}`);
        if (!orderEntity) {
            return res.status(404).send('Order not found');
        }

        await ordertableClient.deleteEntity(email, id);
        console.log('Order deleted successfully.');

        const emailMessage = {
            senderAddress: process.env.ACS_SENDER_ADDRESS,
            content: {
                subject: 'Order Cancelled',
                plainText: `Hello, your order with ID ${orderEntity.id} has been successfully cancelled.`,
            },
            recipients: {
                to: [{ address: email }],
            },
        };

        const poller = await emailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        console.log('Cancellation email sent successfully:', result);

        res.status(200).send('Order cancelled successfully.');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Error cancelling order.');
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
