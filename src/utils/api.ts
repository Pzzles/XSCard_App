import { Platform } from 'react-native';

// Helper function to get the appropriate base URL
const getBaseUrl = () => {
    if (__DEV__) {  // Development mode
        // Replace with your computer's IP address
        return 'http://192.168.0.101:8383';  // Use your actual local IP here
    }
    // Production URL (you can change this later)
    return 'https://your-production-url.com';
};

export const API_BASE_URL = getBaseUrl();

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