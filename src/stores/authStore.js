import { createStore } from 'solid-js/store';
import { supabase } from '../lib/supabase';

const [authState, setAuthState] = createStore({
  user: null,
  session: null,
  profile: null,
  loading: true,
});

export const authStore = {
  get state() { return authState; },
  
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setAuthState('session', session);
    setAuthState('user', session?.user || null);
    
    if (session?.user) {
      await authStore.fetchProfile(session.user.id);
    }
    
    setAuthState('loading', false);

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setAuthState('session', newSession);
      setAuthState('user', newSession?.user || null);
      if (newSession?.user) {
        await authStore.fetchProfile(newSession.user.id);
      } else {
        setAuthState('profile', null);
      }
    });
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (!error && data) {
      setAuthState('profile', data);
    } else if (!error && !data) {
      // Profile not found, let's create it
      const { data: { session } } = await supabase.auth.getSession();
      const defaultProfile = {
        id: userId,
        display_name: session?.user?.user_metadata?.full_name || 'Sequent User',
        avatar_url: session?.user?.user_metadata?.avatar_url || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        updated_at: new Date().toISOString()
      };
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(defaultProfile)
        .select()
        .maybeSingle();
        
      if (!insertError && newProfile) {
        setAuthState('profile', newProfile);
      } else {
        console.error('Failed to auto-create profile:', insertError);
        if (insertError?.code === '23503' || insertError?.message?.includes('violates foreign key constraint')) {
          console.warn('Stale user session detected. Signing out...');
          authStore.signOut();
        }
      }
    } else if (error) {
      console.error('Error fetching profile:', error);
      if (error?.code === '23503' || error?.message?.includes('violates foreign key constraint')) {
        console.warn('Stale user session detected. Signing out...');
        authStore.signOut();
      }
    }
  },

  signInWithOAuth: async (provider) => {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
  },

  signInWithEmail: async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  },
  
  signUpWithEmail: async (email, password, fullName) => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
  },

  signOut: async () => {
    // Clear local IndexedDB tables to prevent leaking user data to another session
    const { localDB } = await import('../lib/db');
    try {
      await Promise.all([
        localDB.clear('tasks'),
        localDB.clear('events'),
        localDB.clear('lists'),
        localDB.clear('calendars'),
        localDB.clear('syncQueue')
      ]);
    } catch (err) {
      console.error('Failed to clear local DB on signOut:', err);
    }
    return supabase.auth.signOut();
  }
};
