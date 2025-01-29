export const API_BASE_URL = 'https://eda0-41-13-28-8.ngrok-free.app';
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
    UPDATE_PROFILE_IMAGE: '/Users/:id/profile-image',
    UPDATE_USER_COLOR: '/Users/:id/color', // Changed from Cards to Users
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;