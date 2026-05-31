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
      .single();
      
    if (!error && data) {
      setAuthState('profile', data);
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
    return supabase.auth.signOut();
  }
};
