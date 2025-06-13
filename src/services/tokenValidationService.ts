import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateAuthToken, shouldRefreshToken, refreshAuthToken } from '../utils/api';
import { getStoredAuthData, updateLastLoginTime } from '../utils/authStorage';

export class TokenValidationService {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isServiceActive = false;

  /**
   * Validate the current token stored in AsyncStorage
   */
  static async validateCurrentToken(): Promise<boolean> {
    try {
      console.log('TokenValidationService: Validating current token');
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found for validation');
        return false;
      }

      // Use the API utility to validate token
      const isValid = await validateAuthToken();
      console.log('Token validation result:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('Error validating current token:', error);
      return false;
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  static async refreshTokenIfNeeded(): Promise<void> {
    try {
      console.log('TokenValidationService: Checking if token needs refresh');
      
      const needsRefresh = await shouldRefreshToken();
      console.log('Token needs refresh:', needsRefresh);
      
      if (needsRefresh) {
        console.log('Refreshing token...');
        const newToken = await refreshAuthToken();
        console.log('Token refreshed successfully');
        
        // Update last login time after successful refresh
        await updateLastLoginTime();
      } else {
        console.log('Token refresh not needed');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  static scheduleTokenRefresh(): void {
    try {
      if (this.isServiceActive) {
        console.log('Token refresh already scheduled, skipping');
        return;
      }

      console.log('TokenValidationService: Scheduling token refresh');
      this.isServiceActive = true;
      
      // Schedule immediate check
      this.performTokenCheck();
      
      // Schedule periodic checks every 25 minutes
      // (Firebase tokens expire in 1 hour, so we refresh at 25min to be safe)
      this.refreshTimer = setInterval(() => {
        this.performTokenCheck();
      }, 25 * 60 * 1000); // 25 minutes

      console.log('Token refresh scheduled successfully');
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
      this.isServiceActive = false;
    }
  }

  /**
   * Clear token refresh schedule
   */
  static clearTokenRefreshTimer(): void {
    console.log('TokenValidationService: Clearing token refresh timer');
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.isServiceActive = false;
    console.log('Token refresh timer cleared');
  }

  /**
   * Perform token check and refresh if needed
   */
  private static async performTokenCheck(): Promise<void> {
    try {
      console.log('TokenValidationService: Performing token check');
      
      // Check if we still have auth data
      const authData = await getStoredAuthData();
      if (!authData) {
        console.log('No auth data found, stopping token refresh');
        this.clearTokenRefreshTimer();
        return;
      }

      // Validate current token
      const isValid = await this.validateCurrentToken();
      if (!isValid) {
        console.log('Token is invalid, attempting refresh');
        await this.refreshTokenIfNeeded();
      } else {
        console.log('Token is still valid');
      }
    } catch (error) {
      console.error('Error during token check:', error);
      // Don't clear the timer on single failures, allow retry
    }
  }

  /**
   * Get token expiration info
   */
  static async getTokenExpirationInfo(): Promise<{
    hasToken: boolean;
    isExpired: boolean;
    expiresAt?: number;
    lastRefresh?: number;
  }> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const authData = await getStoredAuthData();
      
      if (!token) {
        return {
          hasToken: false,
          isExpired: true,
        };
      }

      const needsRefresh = await shouldRefreshToken();
      
      return {
        hasToken: true,
        isExpired: needsRefresh,
        lastRefresh: authData?.lastLoginTime ?? undefined,
      };
    } catch (error) {
      console.error('Error getting token expiration info:', error);
      return {
        hasToken: false,
        isExpired: true,
      };
    }
  }

  /**
   * Force token validation (useful for testing)
   */
  static async forceTokenValidation(): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      console.log('TokenValidationService: Force validating token');
      const isValid = await this.validateCurrentToken();
      
      return {
        isValid,
      };
    } catch (error) {
      console.error('Error during force token validation:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Force token refresh (useful for testing)
   */
  static async forceTokenRefresh(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('TokenValidationService: Force refreshing token');
      await this.refreshTokenIfNeeded();
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error during force token refresh:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export individual functions for easier imports
export const validateCurrentToken = TokenValidationService.validateCurrentToken.bind(TokenValidationService);
export const refreshTokenIfNeeded = TokenValidationService.refreshTokenIfNeeded.bind(TokenValidationService);
export const scheduleTokenRefresh = TokenValidationService.scheduleTokenRefresh.bind(TokenValidationService);
export const clearTokenRefreshTimer = TokenValidationService.clearTokenRefreshTimer.bind(TokenValidationService);
export const getTokenExpirationInfo = TokenValidationService.getTokenExpirationInfo.bind(TokenValidationService);
export const forceTokenValidation = TokenValidationService.forceTokenValidation.bind(TokenValidationService);
export const forceTokenRefresh = TokenValidationService.forceTokenRefresh.bind(TokenValidationService); 