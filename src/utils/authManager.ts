import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getKeepLoggedInPreference, 
  clearAuthData, 
  getStoredAuthData,
  updateLastLoginTime 
} from './authStorage';
import { validateAuthToken, shouldRefreshToken, refreshAuthToken } from './api';
import { validateCurrentToken, scheduleTokenRefresh, clearTokenRefreshTimer } from '../services/tokenValidationService';

export class AuthManager {
  private static tokenRefreshTimer: NodeJS.Timeout | null = null;
  private static isTokenRefreshActive = false;

  /**
   * Handle app going to background
   * If keepLoggedIn is false, clear authentication data
   */
  static async handleAppBackground(): Promise<void> {
    try {
      console.log('AuthManager: Handling app background');
      
      const keepLoggedIn = await getKeepLoggedInPreference();
      console.log('Keep logged in preference:', keepLoggedIn);
      
      if (!keepLoggedIn) {
        console.log('Keep logged in is disabled, clearing auth data on background');
        await this.performAutoLogout();
      } else {
        console.log('Keep logged in is enabled, maintaining session');
        // Clear any active token refresh timers to save battery
        this.clearTokenRefreshTimer();
      }
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  /**
   * Handle app coming to foreground
   * Validate token if keepLoggedIn is enabled
   */
  static async handleAppForeground(): Promise<void> {
    try {
      console.log('AuthManager: Handling app foreground');
      
      const keepLoggedIn = await getKeepLoggedInPreference();
      console.log('Keep logged in preference:', keepLoggedIn);
      
      if (keepLoggedIn) {
        console.log('Keep logged in is enabled, validating token');
        const isValid = await this.validateTokenOnResume();
        
        if (isValid) {
          console.log('Token is valid, setting up refresh timer');
          this.setupTokenRefreshTimer();
        } else {
          console.log('Token is invalid, performing auto logout');
          await this.performAutoLogout();
        }
      } else {
        console.log('Keep logged in is disabled, no token validation needed');
      }
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  /**
   * Validate token when app resumes
   */
  static async validateTokenOnResume(): Promise<boolean> {
    try {
      console.log('AuthManager: Validating token on resume');
      
      const authData = await getStoredAuthData();
      if (!authData || !authData.userToken) {
        console.log('No auth data found');
        return false;
      }

      // Check if token exists in AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found in storage');
        return false;
      }

      // Validate token with backend (Phase 4 will implement full validation)
      const isValid = await validateCurrentToken();
      console.log('Token validation result:', isValid);
      
      if (isValid) {
        // Update last login time to track session
        await updateLastLoginTime();
      }
      
      return isValid;
    } catch (error) {
      console.error('Error validating token on resume:', error);
      return false;
    }
  }

  /**
   * Setup automatic token refresh timer
   */
  static setupTokenRefreshTimer(): void {
    try {
      // Clear any existing timer
      this.clearTokenRefreshTimer();
      
      if (this.isTokenRefreshActive) {
        console.log('Token refresh already active, skipping setup');
        return;
      }

      console.log('AuthManager: Setting up token refresh timer');
      this.isTokenRefreshActive = true;
      
      // Schedule token refresh using the service
      scheduleTokenRefresh();
      
      // Set up periodic check every 30 minutes
      this.tokenRefreshTimer = setInterval(async () => {
        try {
          console.log('AuthManager: Periodic token refresh check');
          
          const keepLoggedIn = await getKeepLoggedInPreference();
          if (!keepLoggedIn) {
            console.log('Keep logged in disabled, stopping token refresh');
            this.clearTokenRefreshTimer();
            return;
          }

          const needsRefresh = await shouldRefreshToken();
          if (needsRefresh) {
            console.log('Token needs refresh, attempting refresh');
            await refreshAuthToken();
            console.log('Token refreshed successfully');
          }
        } catch (error) {
          console.error('Error during periodic token refresh:', error);
          // If refresh fails multiple times, consider auto-logout
          await this.handleTokenRefreshFailure(error);
        }
      }, 30 * 60 * 1000); // 30 minutes

      console.log('Token refresh timer set up successfully');
    } catch (error) {
      console.error('Error setting up token refresh timer:', error);
      this.isTokenRefreshActive = false;
    }
  }

  /**
   * Clear token refresh timer
   */
  static clearTokenRefreshTimer(): void {
    console.log('AuthManager: Clearing token refresh timer');
    
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Clear service timer as well
    clearTokenRefreshTimer();
    this.isTokenRefreshActive = false;
    
    console.log('Token refresh timer cleared');
  }

  /**
   * Perform automatic logout (clear all data)
   */
  static async performAutoLogout(): Promise<void> {
    try {
      console.log('AuthManager: Performing auto logout');
      
      // Clear token refresh timer
      this.clearTokenRefreshTimer();
      
      // Clear all authentication data
      await clearAuthData();
      
      console.log('Auto logout completed');
    } catch (error) {
      console.error('Error during auto logout:', error);
    }
  }

  /**
   * Handle token refresh failures
   */
  private static async handleTokenRefreshFailure(error: any): Promise<void> {
    try {
      console.log('AuthManager: Handling token refresh failure');
      
      // If we get multiple failures, perform auto logout
      // This is a simple implementation - in production, you might want more sophisticated retry logic
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        console.log('Network error during token refresh, will retry later');
        return;
      }
      
      // For authentication errors, perform logout
      if (error.message?.includes('Authentication') || error.message?.includes('401')) {
        console.log('Authentication error during token refresh, performing auto logout');
        await this.performAutoLogout();
      }
    } catch (cleanupError) {
      console.error('Error during token refresh failure handling:', cleanupError);
    }
  }

  /**
   * Initialize AuthManager (called when app starts)
   */
  static async initialize(): Promise<void> {
    try {
      console.log('AuthManager: Initializing');
      
      const keepLoggedIn = await getKeepLoggedInPreference();
      if (keepLoggedIn) {
        const isValid = await this.validateTokenOnResume();
        if (isValid) {
          this.setupTokenRefreshTimer();
        }
      }
      
      console.log('AuthManager initialized successfully');
    } catch (error) {
      console.error('Error initializing AuthManager:', error);
    }
  }

  /**
   * Clean up AuthManager (called when app is destroyed)
   */
  static cleanup(): void {
    console.log('AuthManager: Cleaning up');
    this.clearTokenRefreshTimer();
    console.log('AuthManager cleanup completed');
  }

  /**
   * Get current authentication status
   */
  static async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    keepLoggedIn: boolean;
    tokenValid: boolean;
  }> {
    try {
      const authData = await getStoredAuthData();
      const keepLoggedIn = await getKeepLoggedInPreference();
      const tokenValid = authData ? await validateCurrentToken() : false;
      
      return {
        isAuthenticated: !!authData,
        keepLoggedIn,
        tokenValid,
      };
    } catch (error) {
      console.error('Error getting auth status:', error);
      return {
        isAuthenticated: false,
        keepLoggedIn: false,
        tokenValid: false,
      };
    }
  }
} 