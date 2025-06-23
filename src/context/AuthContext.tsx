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
// Firebase integration
import { auth } from '../config/firebaseConfig';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';

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

  // Firebase Auth State Listener - NEW INTEGRATION
  useEffect(() => {
    console.log('AuthProvider: Setting up Firebase auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        console.log('Firebase auth state changed:', !!firebaseUser);
        
        if (firebaseUser) {
          console.log('Firebase user authenticated:', firebaseUser.uid);
          
          // Get fresh token from Firebase
          const token = await firebaseUser.getIdToken();
          console.log('Firebase token refreshed automatically');
          
          // Check if we have stored auth data
          const storedAuthData = await getStoredAuthData();
          
          if (storedAuthData && storedAuthData.userData) {
            // Update token in storage with fresh Firebase token
            await storeAuthData({
              ...storedAuthData,
              userToken: `Bearer ${token}`,
              lastLoginTime: Date.now()
            });
            
            // Update context state
            dispatch({
              type: 'SET_USER',
              payload: {
                user: storedAuthData.userData,
                token: `Bearer ${token}`,
                keepLoggedIn: storedAuthData.keepLoggedIn,
                lastLoginTime: Date.now()
              }
            });
            
            console.log('AuthProvider: Firebase token updated in context and storage');
          } else {
            console.log('AuthProvider: Firebase user authenticated but no stored user data');
            // Firebase user exists but no stored data - might be a fresh login
          }
        } else {
          console.log('Firebase user signed out');
          
          // Check if this was an intentional logout
          const keepLoggedIn = await getKeepLoggedInPreference();
          if (!keepLoggedIn) {
            console.log('AuthProvider: Firebase signout detected with keepLoggedIn=false');
            // Clear local auth data if user doesn't want to stay logged in
            await clearAuthData();
            dispatch({ type: 'CLEAR_USER' });
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error in Firebase auth state listener:', error);
        // Don't throw error here - let the app continue functioning
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, []);

  // Restore authentication state on app start - ENHANCED
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const authData = await getStoredAuthData();
        
        if (authData) {
          console.log('AuthProvider: Restoring auth state from storage');
          dispatch({ type: 'RESTORE_AUTH', payload: authData });
          
          // Firebase auth state listener will handle token refresh automatically
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

  // Login function - ENHANCED for Firebase
  const login = async (email: string, password: string, keepLoggedIn: boolean): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      console.log('AuthProvider: Starting Firebase-enhanced login process');
      
      // Note: The actual Firebase authentication will be handled in SignInScreen
      // This function will be called after successful Firebase authentication
      // to update the context state with user data from backend
      
      // For now, this maintains backward compatibility
      const error = createAppError(ERROR_CODES.AUTHENTICATION_FAILED, new Error('Login implementation updated to use Firebase client SDK in SignInScreen'));
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

  // Logout function - ENHANCED for Firebase
  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('AuthProvider: Starting Firebase-enhanced logout process');
      
      // Sign out from Firebase first
      try {
        await firebaseSignOut(auth);
        console.log('AuthProvider: Firebase signout successful');
      } catch (firebaseError) {
        console.error('AuthProvider: Firebase signout error:', firebaseError);
        // Continue with local logout even if Firebase signout fails
      }
      
      // Clear auth data from storage
      await clearAuthData();
      
      // Update state
      dispatch({ type: 'CLEAR_USER' });
      
      // Get the keepLoggedIn preference (which was cleared) and restore it to false
      dispatch({ type: 'SET_KEEP_LOGGED_IN', payload: false });
      
      console.log('AuthProvider: Logout complete');
      
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Handle storage errors during logout
      await handleStorageError(error);
      
      dispatch({ type: 'SET_ERROR', payload: 'Failed to logout' });
      throw error;
    }
  };

  // Refresh token function - ENHANCED with Firebase
  const refreshToken = async (): Promise<void> => {
    try {
      console.log('AuthProvider: Firebase-enhanced token refresh');
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force token refresh from Firebase
        const newToken = await currentUser.getIdToken(true);
        console.log('AuthProvider: Firebase token force-refreshed');
        
        // Update stored token
        const authData = await getStoredAuthData();
        if (authData) {
          await storeAuthData({
            ...authData,
            userToken: `Bearer ${newToken}`,
            lastLoginTime: Date.now()
          });
          console.log('AuthProvider: Refreshed token stored');
        }
      } else {
        console.log('AuthProvider: No Firebase user for token refresh');
        throw new Error('No authenticated user for token refresh');
      }
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