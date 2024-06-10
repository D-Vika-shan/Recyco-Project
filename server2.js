require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const app = express();
const port = process.env.PORT || 3000;

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const azureMapsSubscriptionKey = process.env.AZURE_MAPS_API_KEY;
const customVisionEndpoint = process.env.AZURE_CUSTOM_VISION_ENDPOINT;
const customVisionPredictionKey = process.env.AZURE_CUSTOM_VISION_API_KEY;

const credential = new AzureNamedKeyCredential(accountName, accountKey);
const loginTableName = "LoginDetails2";
const orderTableName = "OrderDetails";

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
            rowKey: "1",
            password: password,
            email: email,
            location: location
        };

        console.log("Entity to be inserted:", entity);

        await tableClient.createEntity(entity);
        console.log("Login details inserted successfully.");
    } catch (error) {
        console.error("Error inserting login details:", error);
    }
}

app.post('/submit-login', async (req, res) => {
    const { username, password, email, location } = req.body;
    console.log("Form data received:", req.body);
    await insertLoginDetails(username, password, email, location);
    res.send('Login details submitted successfully.');
});

async function insertOrderDetails(userId, category, description) {
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

        console.log("Entity to be inserted:", entity);

        await tableClient.createEntity(entity);
        console.log("Order details inserted successfully.");
    } catch (error) {
        console.error("Error inserting order details:", error);
    }
}

app.post('/storeOrderDetails', async (req, res) => {
    const { userId, category, description } = req.body;
    console.log("Order data received:", req.body);
    await insertOrderDetails(userId, category, description);
    res.send('Order details submitted successfully.');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
