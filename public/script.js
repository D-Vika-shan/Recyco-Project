let userDetails = {};
let wasteDetails = [];
let map; 
let mapInitialized = false; 

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 

    const formData = new FormData(this);

    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        email: formData.get('email'),
        location: formData.get('location')
    };

    try {
        const response = await fetch('/submit-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('Login details submitted successfully.');
            userDetails = data; 

            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('greetings').style.display = 'block';
            document.getElementById('welcomePage').style.display = 'block';
            document.getElementById('welcomeMessage').innerText = `Welcome, ${data.username}!`;
            document.getElementById('loc').innerHTML = `<span style="text-align:right"><img src='icons/location.png' height=25 width=30></img> ${data.location}</span>`;
        } else {
            console.error('Error submitting login details:', response.statusText);
        }
    } catch (error) {
        console.error('Error submitting login details:', error);
    }
});

document.getElementById('logoutButton').addEventListener('click', function() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('welcomePage').style.display = 'none';
    document.getElementById('centerPage').style.display = 'none';
    document.getElementById('greetings').style.display = 'none';
});

document.querySelectorAll('.wasteButton').forEach(button => {
    button.addEventListener('click', function() {
        const category = this.dataset.category;
        document.getElementById('categoryTitle').innerText = `Description for ${category}`;
        document.getElementById('descriptionForm').style.display = 'block';
    });
});

document.getElementById('submitDescription').addEventListener('click', async function() {
    const description = document.getElementById('description').value;
    const category = document.getElementById('categoryTitle').innerText.split(' ')[2];
    const userId = userDetails.username; 

    if (description) {
        try {
            const response = await fetch('/storeOrderDetails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, category, description }),
            });

            if (!response.ok) {
                throw new Error('Failed to store order details');
            }

            wasteDetails.push({ category, description });
            alert(`Description submitted: ${description}`);
            document.getElementById('descriptionForm').style.display = 'none';
            document.getElementById('description').value = '';
        } catch (error) {
            alert('Failed to store order details.');
            console.error(error);
        }
    } else {
        alert('Please enter a description');
    }
});

document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        const sectionId = this.dataset.section;
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('wasteCategories').style.display = 'none';
        document.getElementById('camPage').style.display = 'none';
        document.getElementById('centerPage').style.display = 'none';
        document.getElementById('logoutButton').style.display = 'none';

        document.querySelectorAll('.contentSection').forEach(section => {
            section.style.display = 'none';
        });

        if (sectionId === 'profile') {
            document.getElementById('profile').innerHTML = `
                <h3>Profile</h3>
                <img src="icons/user.png" height=100 width=100 ></img>
                <p>Username: ${userDetails.username}</p>
                <p>Email: ${userDetails.email}</p>
                <p>Location: ${userDetails.location}</p>
            `;
            document.getElementById('logoutButton').style.display = 'block';
        } else if (sectionId === 'orderDetails') {
            let detailsHtml = '<h3>Order Details</h3>';
            wasteDetails.forEach(detail => {
                detailsHtml += `<p><b>Category:</b> ${detail.category}<br><b>Description:</b> ${detail.description}</p>`;
            });
            document.getElementById('orderDetails').innerHTML = detailsHtml;
        } else if (sectionId === 'home') {
            document.getElementById('welcomePage').style.display = 'block';
            document.getElementById('welcomeMessage').innerText = `Hello, ${userDetails.username}!`;
            document.getElementById('loc').innerHTML = `<span style="text-align:right"><img src='icons/location.png' height=25 width=30></img> ${userDetails.location}<span>`;
            document.getElementById('wasteCategories').style.display = 'block';
        } else if (sectionId === 'cam') {
            document.getElementById('camPage').style.display = 'block';
        } else if (sectionId === 'centers') {
            document.getElementById('centerPage').style.display = 'block';
            if (!mapInitialized) {
                initMap();
            }
        }

        document.getElementById(sectionId).style.display = 'block';
    });
});

async function uploadAndClassifyImage() {
    const imageUpload = document.getElementById('imageUpload');
    const file = imageUpload.files[0];

    if (!file) {
        alert('Please select an image first.');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const imageData = reader.result.split(',')[1]; 
        const prediction = await classifyImage(imageData);
        displayResults(prediction);
    };
    reader.readAsDataURL(file);
}

async function classifyImage(imageData) {
    const endpoint = 'https://rcam-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/3b7e53bb-334c-43a3-9e66-2cd401b9b4ab/classify/iterations/Iteration4/image';
    const predictionKey = 'fbba078651ab4a4e866b0f2c41b182a7';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Prediction-Key': predictionKey,
        },
        body: new Blob([new Uint8Array(atob(imageData).split("").map(char => char.charCodeAt(0)))])
    });

    if (!response.ok) {
        alert('Error in classification. Please try again.');
        return null;
    }

    const result = await response.json();
    return result.predictions;
}

function displayResults(predictions) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!predictions || predictions.length === 0) {
        resultsDiv.textContent = 'No predictions found.';
        return;
    }

    predictions.forEach((prediction, index) => {
        const p = document.createElement('p');
        if (index === 0) {
            p.innerHTML = `Tag: <b>${prediction.tagName}</b>, Probability: <b>${(prediction.probability * 100).toFixed(2)}%</b>`;
        } else {
            p.textContent = `Tag: ${prediction.tagName}, Probability: ${(prediction.probability * 100).toFixed(2)}%`;
        }
        resultsDiv.appendChild(p);
    });
}

function initMap() {
    map = new atlas.Map('map', {
        center: [78.9629, 20.5937], 
        zoom: 4, 
        view: 'Auto',
        style: 'road',
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: '1Dj4SDQvb4Zz66icjdcKKs1LaVVddBv2jbU2vVoSioA7X7cFUa5jJQQJ99AEACYeBjFGpqfEAAAgAZMPvuSb'
        }
    });

    map.events.add('ready', () => {
        const datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        const recyclingLayer = new atlas.layer.SymbolLayer(datasource, null, {
            iconOptions: {
                image: 'pin-round-darkblue',
                size: 0.5
            },
            textOptions: {
                textField: ['get', 'name'], 
                offset: [0, -1.2] 
            }
        });
        map.layers.add(recyclingLayer);

        const recyclingCenters = [
            new atlas.data.Feature(new atlas.data.Point([78.4867, 17.3850]), {
                name: 'Hyderabad Recycling Center'
            }),
            new atlas.data.Feature(new atlas.data.Point([72.8777, 19.0760]), {
                name: 'Mumbai Recycling Center'
            }),
            new atlas.data.Feature(new atlas.data.Point([77.2090, 28.6139]), {
                name: 'Delhi Recycling Center'
            }),
            new atlas.data.Feature(new atlas.data.Point([88.3639, 22.5726]), {
                name: 'Kolkata Recycling Center'
            }),
            new atlas.data.Feature(new atlas.data.Point([80.2707, 13.0827]), {
                name: 'Chennai Recycling Center'
            })
        ];

        datasource.add(recyclingCenters);
    });

    mapInitialized = true;
}
