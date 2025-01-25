export const API_BASE_URL = 'https://86e7-102-217-178-202.ngrok-free.app';
// API endpoints
export const ENDPOINTS = {
    ADD_USER: '/AddUser',
    GENERATE_QR_CODE: '/generateQR',
    SIGN_IN: '/SignIn',
    GET_USER: '/Users',
    GET_CARD: '/Cards',
    ADD_CARD: '/AddCard',
    GET_CONTACTS: '/Contacts',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;