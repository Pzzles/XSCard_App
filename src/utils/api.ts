export const API_BASE_URL = 'https://61c4-197-184-168-6.ngrok-free.app';
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
    SAVE_CONTACT: '/saveContact',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

export const buildSaveContactUrl = (userId: string) => {
    return `${API_BASE_URL}${ENDPOINTS.SAVE_CONTACT}?userId=${userId}`;
};