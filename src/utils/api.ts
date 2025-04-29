import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add these types near the top of the file
export interface PasscreatorResponse {
    message: string;
    passUri: string;
    passFileUrl: string;
    passPageUrl: string;
    identifier: string;
    colorScheme?: string; // Add default color support
}

// Helper function to get the appropriate base URL
const getBaseUrl = () => {

    return 'https://xscard-app.onrender.com';
   //  return 'http://192.168.68.110:8383';

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
    ADD_CONTACT: '/AddContact',
    UPDATE_USER: '/UpdateUser',
    UPDATE_PROFILE_IMAGE: '/Users/:id/profile-image',
    UPDATE_COMPANY_LOGO: '/Users/:id/company-logo', 
    UPDATE_USER_COLOR: '/Users/:id/color', 
    ADD_TO_WALLET: '/Cards/:userId/wallet/:cardIndex',
    DELETE_CONTACT: '/Contacts',
    UPDATE_CARD: '/Cards/:id',
    UPDATE_CARD_COLOR: '/Cards/:id/color',
    CREATE_MEETING: '/meetings',
    MEETING_INVITE: '/meetings/invite',
    DELETE_CARD: '/Cards/:id',  // Change this to match the working endpoint
    UPGRADE_USER: '/Users/:id/upgrade',
    INITIALIZE_PAYMENT: '/payment/initialize',
    SUBSCRIPTION_STATUS: '/subscription/status',
    CANCEL_SUBSCRIPTION: '/subscription/cancel',
};

export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

// Add this utility function to get headers with authentication
export const getAuthHeaders = async (additionalHeaders = {}) => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Authorization': token || '',
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
};

export const getUserId = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData).id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Helper function to make authenticated requests
export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `${token}`, // Token from login is used here
      ...options.headers,
    };

    const response = await fetch(buildUrl(endpoint), {
      ...options, 
      headers,
    });

    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};
