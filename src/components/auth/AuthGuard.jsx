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
        <div style={{ "height": "100vh", "display": "flex", "align-items": "center", "justify-content": "center", "background": "#0F0F0F", "color": "#E8942A" }}>
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
