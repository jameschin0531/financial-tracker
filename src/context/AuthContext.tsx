import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { initializeSupabase, getSupabase, isSupabaseInitialized } from '../services/supabaseClient';
import { setAlphaVantageApiKey } from '../services/stockPriceService';

interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  alphaVantageApiKey?: string;
  coingeckoApiKey?: string;
  exchangeRateApiKey?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  config: AppConfig | null;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    // Fetch config and initialize Supabase
    const initializeAuth = async () => {
      try {
        // Fetch config from API
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        
        const configData = await response.json();
        
        if (!configData.supabaseUrl || !configData.supabaseAnonKey) {
          throw new Error('Missing Supabase credentials in config');
        }

        setConfig({
          supabaseUrl: configData.supabaseUrl,
          supabaseAnonKey: configData.supabaseAnonKey,
          alphaVantageApiKey: configData.alphaVantageApiKey,
          coingeckoApiKey: configData.coingeckoApiKey,
          exchangeRateApiKey: configData.exchangeRateApiKey,
        });

        // Set API keys for services
        if (configData.alphaVantageApiKey) {
          setAlphaVantageApiKey(configData.alphaVantageApiKey);
        }

        // Initialize Supabase client
        const supabase = initializeSupabase(configData.supabaseUrl, configData.supabaseAnonKey);

        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Upsert profile if user is logged in
        if (initialSession?.user) {
          await upsertProfile(initialSession.user);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log('Auth state changed:', event);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          // Upsert profile on sign in
          if (event === 'SIGNED_IN' && currentSession?.user) {
            await upsertProfile(currentSession.user);
          }

          // Clear profile on sign out
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        });

        setLoading(false);

        // Cleanup subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const upsertProfile = async (user: User) => {
    try {
      if (!isSupabaseInitialized()) {
        console.warn('Supabase not initialized, skipping profile upsert');
        return;
      }

      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error upserting profile:', error);
      }
    } catch (error) {
      console.error('Error in upsertProfile:', error);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase not initialized');
      }

      const supabase = getSupabase();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with OAuth:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (!isSupabaseInitialized()) {
        throw new Error('Supabase not initialized');
      }

      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        config,
        signInWithOAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

