# Recyco 
Future Ready Talent Program 2024 Final Project

## Overview

Recyco is a web application designed to facilitate efficient waste management. It uses core Azure services including Azure Web Apps, Azure Table Storage, Azure Maps, and Azure AI Custom Vision to provide a comprehensive solution for users to log waste details and locate recycling centers.

## Features

- User authentication and login
- Logging of waste details with category and description
- Image classification using Azure Custom Vision
- Display of recycling centers on a map

## Technologies Used

- Node.js with Express.js
- Azure Web Apps
- Azure Table Storage
- Azure Maps
- Azure AI Custom Vision
- HTML/CSS/JavaScript for the frontend

## Prerequisites

- Node.js and npm installed on your machine
- Azure account with necessary services set up
- GitHub repository for your code
- `.env` file with necessary environment variables

## Setup Instructions

### 1. Clone the Repository

```
git clone https://github.com/your_username/your_repository.git
cd your_repository
```

### 2. Install Dependencies

```
npm install
```

### 3. Create a `.env` File

Create a .env file in the root directory of your project and add the following environment variables:
```
AZURE_STORAGE_ACCOUNT_NAME=your_account_name_here
AZURE_STORAGE_ACCOUNT_KEY=your_account_key_here
AZURE_MAPS_API_KEY=your_azure_maps_api_key_here
AZURE_CUSTOM_VISION_ENDPOINT=your_custom_vision_endpoint_here
AZURE_CUSTOM_VISION_API_KEY=your_custom_vision_prediction_key_here
PORT=3000
```

### 4. Configure Azure Services

- Set up Azure Table Storage and obtain the account name and key.
- Set up an Azure Maps account and obtain the subscription key.
- Set up Azure Custom Vision and obtain the prediction endpoint and key.

### 5. Run the Application Locally

```
node server2.js
```
Visit `http://localhost:3000` in your browser to view the application.

### 6. Deploy to Azure Web Apps
Ensure you have the necessary Azure resources set up and configure your GitHub repository secrets with the publish profile.

## Usage

### Logging In
Enter your username, password, email, and location to log in.
After logging in, you will be greeted with a welcome message.

### Logging Waste Details
Select a waste category and enter a description.
Submit the details to log the waste information.

### Image Classification
Upload an image of the waste item.
The application will classify the image using Azure Custom Vision and display the results.

### Viewing Recycling Centers
Navigate to the "Centers" section to view nearby recycling centers on the map.

## Deployment Screenshots
Created resources in azure:
![Azure portal Screenshot](https://github.com/D-Vika-shan/Recyco-Project/blob/master/assets/azure%20portal.png)

Deploying in web app through git hub:
![Azure web apps Screenshot](https://github.com/D-Vika-shan/Recyco-Project/blob/master/assets/azure%20web%20app.png)

Pushing code to git hub from VScode:
![VScode terminal Screenshot](https://github.com/D-Vika-shan/Recyco-Project/blob/master/assets/vscode%20terminal.png)

Git hub deploying to azure web app:
![Git hub deployments Screenshot](https://github.com/D-Vika-shan/Recyco-Project/blob/master/assets/git%20hub%20deployments.png)


