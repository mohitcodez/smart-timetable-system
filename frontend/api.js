// frontend/api.js

// Function to handle API calls
const apiCall = async (url, method = 'GET', body = null) => {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
};

// Example GET request
const getData = async () => {
    return await apiCall('/api/data');
};

// Example POST request
const postData = async (data) => {
    return await apiCall('/api/data', 'POST', data);
};