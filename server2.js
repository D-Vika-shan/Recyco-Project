require('dotenv').config();
const express = require('express');
const path = require('path');
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



async function insertLoginDetails(username, password, email, location) {
    try {
        const tableClient = new TableClient(
            `https://${accountName}.table.core.windows.net`,
            loginTableName,
            credential
        );

        const entity = {
            partitionKey: username,
            rowKey: '1',
            password: password,
            email: email,
            location: location
        };

        console.log('Entity to be inserted:', entity);

        await tableClient.createEntity(entity);
        console.log('Login details inserted successfully.');
    } catch (error) {
        console.error('Error inserting login details:', error);
    }
}

app.post('/submit-login', async (req, res) => {
    const { username, password, email, location } = req.body;
    console.log('Form data received:', req.body);
    await insertLoginDetails(username, password, email, location);
    res.send('Login details submitted successfully.');
});

async function insertOrderDetails(userId, category, description, userEmail) {
    try {
        const tableClient = new TableClient(
            `https://${accountName}.table.core.windows.net`,
            orderTableName,
            credential
        );

        const entity = {
            partitionKey: userId.toString(),
            rowKey: new Date().toISOString(),
            category: category,
            description: description
        };

        console.log('Entity to be inserted:', entity);

        await tableClient.createEntity(entity);
        console.log('Order details inserted successfully.');

        // Send email notification
        const emailMessage = {
            senderAddress: process.env.ACS_SENDER_ADDRESS,
            content: {
                subject: 'Order Details Submitted',
                plainText: `Hello, ${userId}. Your order for ${category} has been successfully submitted with the following description: ${description}.`,
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
    const userId = req.query.userId; // Get the user ID from query parameter

    if (!userId) {
        return res.status(400).send('User ID is required.');
    }

    try {
        const tableClient = new TableClient(
            `https://${accountName}.table.core.windows.net`,
            orderTableName,
            credential
        );

        // Fetch entities filtered by userId (partitionKey)
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${userId}'`
            }
        });

        // Convert entities to an array and sort by timestamp in descending order
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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
