import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  getStoredAuthData, 
  storeAuthData, 
  clearAuthData, 
  getKeepLoggedInPreference,
  setKeepLoggedInPreference,
  updateLastLoginTime,
  AuthData
} from '../utils/authStorage';
import { ErrorHandler, ERROR_CODES, handleAuthError, handleStorageError, createAppError } from '../utils/errorHandler';

// User interface
export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  plan?: string;
  [key: string]: any;
}

// Authentication state interface
interface AuthState {
  user: User | null;
  userToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  keepLoggedIn: boolean;
  lastLoginTime: number | null;
  error: string | null;
}

// Authentication context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string, keepLoggedIn: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setKeepLoggedIn: (value: boolean) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// Action types for the reducer
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string; keepLoggedIn: boolean; lastLoginTime: number } }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_KEEP_LOGGED_IN'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESTORE_AUTH'; payload: AuthData };

// Initial state
const initialState: AuthState = {
  user: null,
  userToken: null,
  isLoading: true, // Start with loading true while we check stored auth
  isAuthenticated: false,
  keepLoggedIn: false,
  lastLoginTime: null,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        userToken: action.payload.token,
        isAuthenticated: true,
        keepLoggedIn: action.payload.keepLoggedIn,
        lastLoginTime: action.payload.lastLoginTime,
        isLoading: false,
        error: null,
      };
    
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        userToken: null,
        isAuthenticated: false,
        lastLoginTime: null,
        isLoading: false,
        error: null,
        // Note: keepLoggedIn preference is preserved
      };
    
    case 'SET_KEEP_LOGGED_IN':
      return {
        ...state,
        keepLoggedIn: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'RESTORE_AUTH':
      return {
        ...state,
        user: action.payload.userData,
        userToken: action.payload.userToken,
        isAuthenticated: !!(action.payload.userToken && action.payload.userData),
        keepLoggedIn: action.payload.keepLoggedIn,
        lastLoginTime: action.payload.lastLoginTime,
        isLoading: false,
        error: null,
      };
    
    default:
      return state;
  }
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore authentication state on app start
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const authData = await getStoredAuthData();
        
        if (authData) {
          dispatch({ type: 'RESTORE_AUTH', payload: authData });
        } else {
          // No stored auth data, get keepLoggedIn preference only
          const keepLoggedIn = await getKeepLoggedInPreference();
          dispatch({ type: 'SET_KEEP_LOGGED_IN', payload: keepLoggedIn });
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error restoring auth state:', error);
        
        // Handle storage errors gracefully
        await handleStorageError(error);
        
        dispatch({ type: 'SET_ERROR', payload: 'Failed to restore authentication state' });
      }
    };

    restoreAuthState();
  }, []);

  // Login function
  const login = async (email: string, password: string, keepLoggedIn: boolean): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // This will be implemented in Phase 3 when we update SignInScreen
      // For now, this is a placeholder that maintains the existing flow
      const error = createAppError(ERROR_CODES.AUTHENTICATION_FAILED, new Error('Login implementation will be completed in Phase 3'));
      await handleAuthError(error);
      throw error;
      
    } catch (error) {
      // Handle authentication errors with proper error handling
      if (error && typeof error === 'object' && 'code' in error) {
        // Already an AppError, just update UI state
        dispatch({ type: 'SET_ERROR', payload: (error as any).userMessage });
      } else {
        // Convert to AppError and handle
        const appError = createAppError(ERROR_CODES.AUTHENTICATION_FAILED, error as Error);
        await handleAuthError(appError);
        dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
      }
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Clear auth data from storage
      await clearAuthData();
      
      // Update state
      dispatch({ type: 'CLEAR_USER' });
      
      // Get the keepLoggedIn preference (which was cleared) and restore it to false
      dispatch({ type: 'SET_KEEP_LOGGED_IN', payload: false });
      
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Handle storage errors during logout
      await handleStorageError(error);
      
      dispatch({ type: 'SET_ERROR', payload: 'Failed to logout' });
      throw error;
    }
  };

  // Refresh token function (placeholder for Phase 4)
  const refreshToken = async (): Promise<void> => {
    try {
      // This will be implemented in Phase 4 with Firebase integration
      console.log('Token refresh will be implemented in Phase 4');
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Handle token refresh errors
      const appError = createAppError(ERROR_CODES.TOKEN_REFRESH_FAILED, error as Error);
      await handleAuthError(appError);
      
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
      throw error;
    }
  };

  // Set keep logged in preference
  const setKeepLoggedIn = (value: boolean): void => {
    dispatch({ type: 'SET_KEEP_LOGGED_IN', payload: value });
    
    // Also update in storage with error handling
    setKeepLoggedInPreference(value).catch(async (error) => {
      console.error('Error saving keep logged in preference:', error);
      await handleStorageError(error);
    });
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Set loading state
  const setLoading = (loading: boolean): void => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  // Context value
  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
    setKeepLoggedIn,
    clearError,
    setLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to manually set user data (for Phase 3 integration)
export const setAuthUser = async (user: User, token: string, keepLoggedIn: boolean): Promise<void> => {
  const now = Date.now();
  
  // Store in AsyncStorage
  await storeAuthData({
    userToken: token,
    userData: user,
    userRole: user.plan === 'admin' ? 'admin' : 'user',
    keepLoggedIn,
    lastLoginTime: now,
  });
  
  // Update last login time
  await updateLastLoginTime();
};

export default AuthContext; 