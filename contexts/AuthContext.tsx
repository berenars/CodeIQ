import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);
  const lastRefreshAttempt = useRef<number>(0);
  const appState = useRef(AppState.currentState);

  const refreshUser = async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshing.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }

    // Rate limit: Don't refresh more than once per 10 seconds
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 10000) {
      console.log('⏱️ Refresh rate limited, skipping...');
      return;
    }

    try {
      isRefreshing.current = true;
      lastRefreshAttempt.current = now;
      
      console.log('🔄 Refreshing session...');
      const { data: { session: freshSession }, error } = await supabase.auth.refreshSession();
      
      if (!error && freshSession) {
        setSession(freshSession);
        setUser(freshSession.user);
        console.log('✅ Session refreshed successfully');
      } else if (error) {
        console.warn('⚠️ Session refresh failed:', error.message);
        // Don't sign out on refresh failure - keep existing session
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      // Don't sign out on error - keep existing session
    } finally {
      isRefreshing.current = false;
    }
  };

  useEffect(() => {
    // Force fetch latest data from backend on app start (no cache)
    supabase.auth.refreshSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      // If refresh fails, try getting cached session as fallback
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('🔐 Auth event:', event);
      
      // Only sign out on explicit SIGNED_OUT events, not on TOKEN_REFRESHED failures
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setSession(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully');
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        console.log('✅ Auth state updated:', event);
        setSession(session);
        setUser(session?.user ?? null);
      }
      // Ignore other events that might cause unnecessary state changes
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // App came to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground - refreshing session');
        if (session) {
          await refreshUser();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [session]);

  // Reduced polling for user metadata updates (30 seconds instead of 3)
  useEffect(() => {
    if (!session || !user) return;

    // Store the last known metadata to avoid unnecessary comparisons
    let lastMetadata = JSON.stringify(user?.user_metadata || {});
    let isCheckingForUpdates = false;

    const checkForUpdates = async () => {
      // Prevent concurrent checks
      if (isCheckingForUpdates || isRefreshing.current) return;
      
      try {
        isCheckingForUpdates = true;
        
        // Get current session without forcing refresh
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          // Only update if metadata has actually changed
          const newMetadata = JSON.stringify(currentSession.user.user_metadata || {});
          
          if (lastMetadata !== newMetadata) {
            console.log('🔄 User data changed - syncing...');
            lastMetadata = newMetadata;
            setSession(currentSession);
            setUser(currentSession.user);
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        // Don't sign out on error
      } finally {
        isCheckingForUpdates = false;
      }
    };

    // Run immediately
    checkForUpdates();

    // Poll every 30 seconds (reduced from 3 seconds)
    const pollInterval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(pollInterval);
  }, [session?.user.id]); // Only re-create interval if user ID changes

  const handleSignOut = async () => {
    try {
      // Clear the session from Supabase
      await supabase.auth.signOut();
      
      // Immediately clear local state
      setSession(null);
      setUser(null);
      
      // Clear any cached session data based on platform
      if (Platform.OS === 'web') {
        // Clear localStorage on web
        if (typeof window !== 'undefined') {
          localStorage.clear();
        }
      } else {
        // Clear AsyncStorage on mobile
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, clear local state
      setSession(null);
      setUser(null);
      
      // Try to clear storage anyway
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.clear();
        } else {
          await AsyncStorage.clear();
        }
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut: handleSignOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

