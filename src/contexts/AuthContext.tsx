import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/integrations/api';
import { toast } from 'sonner';
import { initializeAuth, clearAuthTokens } from '@/utils/authHelpers';
import { logError, getUserFriendlyErrorMessage, isErrorType } from '@/utils/errorLogger';

// Type definitions for authentication
export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  clearTokens: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Use refs to prevent stale closures and unnecessary re-renders
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const forceCompletedRef = useRef(false);

  // Toast spam prevention
  const lastNetworkErrorToast = useRef<number>(0);
  const lastPermissionErrorToast = useRef<number>(0);
  const lastGeneralErrorToast = useRef<number>(0);
  const TOAST_COOLDOWN = 10000; // 10 seconds between similar error toasts

  // Fetch user profile from database with error handling and retry logic
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('📋 Fetching profile for user:', userId);

      const { data: profileData, error } = await apiClient.selectOne('profiles', userId);

      if (error) {
        console.warn('⚠️ Profile fetch error:', error.message);
        // Silently return null instead of crashing - profile might not exist
        return null;
      }

      if (!profileData) {
        console.warn('⚠️ No profile data found for user:', userId);
        // Return a basic user profile when full profile doesn't exist
        return {
          id: userId,
          email: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active' // Default to active
        };
      }

      console.log('✅ Profile fetched successfully:', profileData);
      return profileData;
    } catch (error) {
      console.warn('⚠️ Exception fetching profile:', error);
      logError('Exception fetching profile:', error, { userId, context: 'fetchProfile' });

      // Return a minimal valid profile instead of null
      // This allows the app to function even if full profile data isn't available
      return {
        id: userId,
        email: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };
    }
  }, []);

  // Update last login timestamp silently
  const updateLastLogin = useCallback(async (userId: string) => {
    try {
      await apiClient.update('profiles', userId, {
        last_login: new Date().toISOString()
      });
    } catch (error) {
      logError('Error updating last login:', error, { userId, context: 'updateLastLogin' });
    }
  }, []);

  // Initialize auth state - simplified to prevent repeated re-renders
  // Uses empty dependency array to run only once on mount
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    mountedRef.current = true;

    // Start app immediately - don't block on auth
    setLoading(false);
    setInitialized(true);
    console.log('🏁 App started immediately (auth will continue in background)');

    // Try to restore auth session in background
    const restoreAuthInBackground = async () => {
      try {
        console.log('🔍 Attempting to restore auth session...');

        const sessionResult = await apiClient.auth.getSession();
        const quickSession = sessionResult?.session;

        if (quickSession?.user && mountedRef.current) {
          console.log('✅ Auth session restored');

          setSession(quickSession);
          setUser(quickSession.user);

          // Fetch profile silently in background
          try {
            const userProfile = await fetchProfile(quickSession.user.id);
            if (mountedRef.current) {
              setProfile(userProfile);

              // Update last login silently
              if (userProfile) {
                updateLastLogin(quickSession.user.id).catch(err =>
                  logError('Error updating last login:', err, {
                    userId: quickSession.user.id,
                    context: 'backgroundAuth'
                  })
                );
              }
            }
          } catch (profileError) {
            logError('Error fetching profile in background:', profileError, {
              context: 'backgroundProfileFetch'
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Auth restoration failed:', error);

        // Clear invalid tokens if needed
        if (error instanceof Error) {
          if (error.message.includes('Invalid Refresh Token') ||
              error.message.includes('invalid_token')) {
            console.warn('🧹 Clearing invalid tokens');
            clearAuthTokens();
          }
        }
      }
    };

    // Run background auth restoration after a short delay to let UI render
    const backgroundTimer = setTimeout(restoreAuthInBackground, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(backgroundTimer);
    };
  }, []); // Empty dependency array - run only once on mount

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Starting sign in process...');

      const result = await apiClient.auth.login(email, password);

      if (result.error) {
        console.error('❌ Login failed:', result.error.message);
        setLoading(false);
        return { error: result.error as AuthError };
      }

      if (!result.token || !result.user) {
        const errorMsg = 'Login failed - no token received';
        console.error('❌', errorMsg);
        setLoading(false);
        return { error: new AuthError(errorMsg) };
      }

      console.log('✅ Login successful, creating session...');

      // Create session object
      const newSession: Session = {
        user: {
          id: result.user.id,
          email: result.user.email || email,
          user_metadata: result.user.user_metadata,
          app_metadata: result.user.app_metadata,
        },
        access_token: result.token,
      };

      // Fetch profile to check status
      console.log('📋 Fetching user profile...');
      const userProfile = await fetchProfile(result.user.id);

      // Allow login even if profile fetch fails - better UX
      console.log('✅ Profile fetch completed, setting session...');

      setSession(newSession);
      setUser(newSession.user);
      setProfile(userProfile);

      setTimeout(() => toast.success('Signed in successfully'), 0);
      setLoading(false);
      console.log('🎉 Sign in complete!');
      return { error: null };
    } catch (error) {
      setLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Sign in failed';
      console.error('❌ Sign in exception:', errorMsg);
      const authError = new AuthError(errorMsg);
      return { error: authError };
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);

      // Create user via API
      const result = await apiClient.insert('profiles', {
        email,
        password,
        full_name: fullName,
        status: 'pending'
      });

      if (result.error) {
        setLoading(false);
        return { error: result.error as AuthError };
      }

      setTimeout(() => toast.success('Account created successfully'), 0);
      setLoading(false);
      return { error: null };
    } catch (error) {
      setLoading(false);
      const authError = new AuthError(error instanceof Error ? error.message : 'Sign up failed');
      return { error: authError };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...');
      setLoading(true);

      const result = await apiClient.auth.logout();

      if (result.error) {
        logError('❌ Sign out error:', result.error, { context: 'signOut' });
        setTimeout(() => toast.error('Error signing out'), 0);
      } else {
        console.log('✅ Sign out successful');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear local storage
        clearAuthTokens();

        setTimeout(() => toast.success('Signed out successfully'), 0);
        console.log('🎉 Sign out complete!');

        // Force a reload to ensure the app clears any cached auth state/UI
        try {
          // Use replace so browser history isn't cluttered
          window.location.replace('/');
          return;
        } catch (reloadErr) {
          console.warn('Could not reload after sign out:', reloadErr);
        }
      }
    } catch (error) {
      logError('❌ Sign out exception:', error, { context: 'signOut' });
      setTimeout(() => toast.error('Error signing out'), 0);
    } finally {
      // Ensure loading is cleared if the component is still mounted
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      // Call API to reset password
      const result = await apiClient.select('profiles', { email });

      if (result.error || !result.data) {
        return { error: new AuthError('User not found') };
      }

      // In a real app, the backend would send a password reset email
      setTimeout(() => toast.success('Password reset instructions have been sent to your email'), 0);
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const result = await apiClient.update('profiles', user.id, updates);

      if (result.error) {
        logError('Error updating profile:', result.error, { context: 'updateProfile', userId: user.id });
        setTimeout(() => toast.error('Failed to update profile'), 0);
        return { error: new Error(result.error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      setTimeout(() => toast.success('Profile updated successfully'), 0);
      return { error: null };
    } catch (error) {
      logError('Error updating profile exception:', error, { context: 'updateProfile', userId: user.id });
      setTimeout(() => toast.error('Failed to update profile'), 0);
      return { error: error as Error };
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    if (userProfile && mountedRef.current) {
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  // Add function to manually clear tokens
  const clearTokens = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.info('Authentication tokens cleared. Please sign in again.');
  }, []);

  // Compute derived state
  const isAuthenticated = !!user && profile?.status === 'active';
  // Treat any role containing 'admin' (case-insensitive) as administrator (covers 'admin', 'super_admin', etc.)
  const isAdmin = typeof profile?.role === 'string' && profile.role.toLowerCase().includes('admin');

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading: loading && !forceCompletedRef.current,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated,
    isAdmin,
    refreshProfile,
    clearTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
