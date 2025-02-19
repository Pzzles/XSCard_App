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
    return 'http://192.168.8.30:8383';
   // return 'http://192.168.8.7:8383';
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

// Add this utility function to get headers with authentication
export const getAuthHeaders = async (additionalHeaders = {}) => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Authorization': token || '',
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
};

// Add this utility function to get the user ID
export const getUserId = async () => {
  const userData = await AsyncStorage.getItem('userData');
  if (!userData) return null;
  
  const parsed = JSON.parse(userData);
  return parsed.id || parsed.uid || null;
};

// Helper function to make authenticated requests
export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const headers = await getAuthHeaders(options.headers);
  const response = await fetch(buildUrl(endpoint), {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Handle token expiration
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      throw new Error('Authentication token expired');
    }
    
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response;
};
