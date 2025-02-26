import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

   //return 'https://xscard-app.onrender.com';
<<<<<<< HEAD
    return 'http://192.168.11.220:8383';
   // return 'http://192.168.8.7:8383';
=======
    return 'http://192.168.2.242:8383';
   /// return 'http://192.168.119.148:8383';
>>>>>>> 1b990a0 (almost)
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
    ADD_TO_WALLET: '/Users/:id/wallet',
    DELETE_CONTACT: '/Contacts',
    UPDATE_CARD: '/Cards/:id',  // Update this line
    UPDATE_CARD_COLOR: '/Cards/:id/color',  // Add this line
    CREATE_MEETING: '/meetings',
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
