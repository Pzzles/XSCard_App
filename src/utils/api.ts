// Base URL for the API
export const API_BASE_URL = 'https://8ae4-41-13-5-187.ngrok-free.app';

// API endpoints
export const ENDPOINTS = {
    ADD_USER: '/AddUser',
    GENERATE_QR_CODE: '/GenerateQRCode',
    // Add other endpoints here as needed
};

// Helper function to build complete URLs
export const buildUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;