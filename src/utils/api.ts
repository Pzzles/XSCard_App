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
    if (__DEV__) {  // Development mode
       // return 'http://192.168.124.148:8383'; // home

       // return 'https://5e1e-197-184-170-54.ngrok-free.app'; // internet
       return 'http://192.168.0.193:8383'; // work

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
    UPDATE_COMPANY_LOGO: '/Users/:id/company-logo', // Add this line
    UPDATE_USER_COLOR: '/Users/:id/color', // Changed from Cards to Users
    ADD_TO_WALLET: '/Users/:id/wallet',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;
