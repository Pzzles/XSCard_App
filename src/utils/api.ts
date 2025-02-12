import { Platform } from 'react-native';

// Add these types near the top of the file
export interface PasscreatorResponse {
    message: string;
    passUri: string;
    passFileUrl: string;
    passPageUrl: string;
    identifier: string;
}

// Helper function to get the appropriate base URL
const getBaseUrl = () => {
    // Always use the production URL in release builds
   //return 'https://xscard-app.onrender.com';
    return 'http://192.168.0.101:8383';
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
    UPDATE_COMPANY_LOGO: '/Users/:id/company-logo', // Add this line
    UPDATE_USER_COLOR: '/Users/:id/color', // Changed from Cards to Users
    ADD_TO_WALLET: '/Users/:id/wallet',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;
