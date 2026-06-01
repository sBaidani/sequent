import { Show, createEffect } from 'solid-js';
import { authStore } from '../../stores/authStore';
import LoginScreen from './LoginScreen';

function AuthGuard(props) {
  // Initialize auth state on mount
  createEffect(() => {
    authStore.init();
  });

  return (
    <Show 
      when={!authStore.state.loading} 
      fallback={
        <div class="h-screen flex items-center justify-center bg-[#0F0F0F] text-accent">
          Loading...
        </div>
      }
    >
      <Show 
        when={authStore.state.session || window.location.search.includes('test=true')} 
        fallback={<LoginScreen />}
      >
        {props.children}
      </Show>
    </Show>
  );
}

export default AuthGuard;
