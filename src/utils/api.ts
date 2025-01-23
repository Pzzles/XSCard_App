// Base URL for the API
// export const API_BASE_URL = 'https://dd9e-197-184-173-167.ngrok-free.app';
export const API_BASE_URL = 'https://934b-197-184-173-167.ngrok-free.app';
// API endpoints
export const ENDPOINTS = {
    ADD_USER: '/AddUser',
    GENERATE_QR_CODE: '/generateQR',
    SIGN_IN: '/SignIn',
    GET_USER: '/Users',
    GET_CARD: '/Cards',
    ADD_CARD: '/AddCard',
    GET_CONTACTS: '/Contacts',
    // Add other endpoints here as needed
};

// Helper function to build complete URLs
export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;