export const API_BASE_URL = 'https://951b-197-184-168-6.ngrok-free.app';
// API endpoints
export const ENDPOINTS = {
    ADD_USER: '/AddUser',
    GENERATE_QR_CODE: '/generateQR',
    SIGN_IN: '/SignIn',
    GET_USER: '/Users',
    GET_CARD: '/Cards',
    ADD_CARD: '/AddCard',
    GET_CONTACTS: '/Contacts',
    UPDATE_USER: '/UpdateUser',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;