import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getKeepLoggedInPreference, 
  clearAuthData, 
  getStoredAuthData,
  updateLastLoginTime 
} from './authStorage';
import { validateAuthToken, shouldRefreshToken, refreshAuthToken } from './api';
import { validateCurrentToken, scheduleTokenRefresh, clearTokenRefreshTimer } from '../services/tokenValidationService';
// Firebase integration
import { auth } from '../config/firebaseConfig';
import { signOut as firebaseSignOut } from 'firebase/auth';

export class AuthManager {
  private static tokenRefreshTimer: NodeJS.Timeout | null = null;
  private static isTokenRefreshActive = false;

  /**
   * Handle app going to background - ENHANCED for Firebase
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
        // With Firebase, we don't need manual token refresh timers
        // Firebase handles token refresh automatically through auth state listener
        console.log('Firebase will maintain authentication state automatically');
      }
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  /**
   * Handle app coming to foreground - ENHANCED for Firebase
   * Firebase auth state listener handles token validation automatically
   */
  static async handleAppForeground(): Promise<void> {
    try {
      console.log('AuthManager: Handling app foreground');
      
      const keepLoggedIn = await getKeepLoggedInPreference();
      console.log('Keep logged in preference:', keepLoggedIn);
      
      if (keepLoggedIn) {
        console.log('Keep logged in is enabled');
        
        // Check if Firebase user is still authenticated
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          console.log('Firebase user is still authenticated:', firebaseUser.uid);
          // Firebase auth state listener will handle token refresh automatically
          
          // Update last activity time
          await updateLastLoginTime();
        } else {
          console.log('No Firebase user found, performing auto logout');
          await this.performAutoLogout();
        }
      } else {
        console.log('Keep logged in is disabled, no validation needed');
      }
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  /**
   * Validate token when app resumes - SIMPLIFIED for Firebase
   */
  static async validateTokenOnResume(): Promise<boolean> {
    try {
      console.log('AuthManager: Validating token on resume');
      
      // Check if Firebase user exists
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.log('No Firebase user found');
        return false;
      }

      // Check if we have stored auth data
      const authData = await getStoredAuthData();
      if (!authData || !authData.userToken) {
        console.log('No stored auth data found');
        return false;
      }

      console.log('Firebase user and stored data both exist');
      
      // Firebase handles token validation automatically
      // We just need to update last login time
      await updateLastLoginTime();
      
      return true;
    } catch (error) {
      console.error('Error validating token on resume:', error);
      return false;
    }
  }

  /**
   * Setup automatic token refresh timer - DEPRECATED with Firebase
   * Firebase handles token refresh automatically, but keeping for compatibility
   */
  static setupTokenRefreshTimer(): void {
    console.log('AuthManager: Token refresh now handled automatically by Firebase');
    console.log('AuthManager: Manual token refresh timers are no longer needed');
    
    // Clean up any existing timers
    this.clearTokenRefreshTimer();
    
    // Firebase auth state listener handles all token refresh automatically
    // No manual timers needed
  }

  /**
   * Clear token refresh timer - SIMPLIFIED
   */
  static clearTokenRefreshTimer(): void {
    console.log('AuthManager: Clearing any existing token refresh timers');
    
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Clear service timer as well for compatibility
    clearTokenRefreshTimer();
    this.isTokenRefreshActive = false;
    
    console.log('Token refresh timers cleared - Firebase handles refresh automatically');
  }

  /**
   * Perform automatic logout - ENHANCED for Firebase
   */
  static async performAutoLogout(): Promise<void> {
    try {
      console.log('AuthManager: Performing auto logout');
      
      // Clear token refresh timer (though not needed with Firebase)
      this.clearTokenRefreshTimer();
      
      // Sign out from Firebase first
      try {
        if (auth.currentUser) {
          await firebaseSignOut(auth);
          console.log('AuthManager: Firebase signout successful');
        }
      } catch (firebaseError) {
        console.error('AuthManager: Firebase signout error:', firebaseError);
        // Continue with local logout even if Firebase signout fails
      }
      
      // Clear all authentication data
      await clearAuthData();
      
      console.log('Auto logout completed');
    } catch (error) {
      console.error('Error during auto logout:', error);
    }
  }

  /**
   * Handle token refresh failures - DEPRECATED with Firebase
   */
  private static async handleTokenRefreshFailure(error: any): Promise<void> {
    console.log('AuthManager: Token refresh failure handling is now managed by Firebase');
    console.log('AuthManager: Firebase auth state listener will handle authentication errors');
    
    // If we get here, it's likely a network error during app-specific operations
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      console.log('Network error detected, Firebase will retry automatically');
      return;
    }
    
    // For authentication errors, perform logout
    if (error.message?.includes('Authentication') || error.message?.includes('401')) {
      console.log('Authentication error detected, performing auto logout');
      await this.performAutoLogout();
    }
  }

  /**
   * Initialize AuthManager - ENHANCED for Firebase
   */
  static async initialize(): Promise<void> {
    try {
      console.log('AuthManager: Initializing with Firebase integration');
      
      const keepLoggedIn = await getKeepLoggedInPreference();
      console.log('AuthManager: Keep logged in preference:', keepLoggedIn);
      
      if (keepLoggedIn) {
        // Check if Firebase user exists
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          console.log('AuthManager: Firebase user found during initialization:', firebaseUser.uid);
          // Firebase auth state listener will handle the rest
        } else {
          console.log('AuthManager: No Firebase user found, waiting for auth state');
        }
      }
      
      console.log('AuthManager initialized successfully with Firebase integration');
    } catch (error) {
      console.error('Error initializing AuthManager:', error);
    }
  }

  /**
   * Clean up AuthManager - SIMPLIFIED
   */
  static cleanup(): void {
    console.log('AuthManager: Cleaning up');
    this.clearTokenRefreshTimer();
    console.log('AuthManager cleanup completed - Firebase handles auth state cleanup');
  }

  /**
   * Get current authentication status - ENHANCED for Firebase
   */
  static async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    keepLoggedIn: boolean;
    tokenValid: boolean;
    firebaseUser: boolean;
  }> {
    try {
      const authData = await getStoredAuthData();
      const keepLoggedIn = await getKeepLoggedInPreference();
      const firebaseUser = !!auth.currentUser;
      
      // With Firebase, if user exists, token is automatically valid
      const tokenValid = firebaseUser;
      
      return {
        isAuthenticated: !!authData && firebaseUser,
        keepLoggedIn,
        tokenValid,
        firebaseUser,
      };
    } catch (error) {
      console.error('Error getting auth status:', error);
      return {
        isAuthenticated: false,
        keepLoggedIn: false,
        tokenValid: false,
        firebaseUser: false,
      };
    }
  }

  /**
   * Force token refresh - ENHANCED for Firebase
   */
  static async forceTokenRefresh(): Promise<void> {
    try {
      console.log('AuthManager: Force token refresh with Firebase');
      
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        // Force token refresh from Firebase
        const newToken = await firebaseUser.getIdToken(true);
        console.log('AuthManager: Firebase token force-refreshed');
        
        // Update stored token
        const authData = await getStoredAuthData();
        if (authData) {
          await AsyncStorage.setItem('userToken', `Bearer ${newToken}`);
          await updateLastLoginTime();
          console.log('AuthManager: Refreshed token updated in storage');
        }
      } else {
        throw new Error('No Firebase user for token refresh');
      }
    } catch (error) {
      console.error('AuthManager: Error during force token refresh:', error);
      throw error;
    }
  }
} 