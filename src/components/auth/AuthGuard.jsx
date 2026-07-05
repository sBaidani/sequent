// AuthGuard — Phase 4 migration onto the kit (Astryx spec).
// The plain "Loading..." text fallback is now the kit Spinner (accessible
// role=status with a visible label) inside a token-styled centered frame.
// Auth gating logic and the authStore contract are unchanged.
import { Show, createEffect } from 'solid-js';
import { authStore } from '../../stores/authStore';
import { Spinner } from '../kit';
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
        <div class="flex h-screen w-full items-center justify-center bg-body">
          <Spinner size="lg" label="Loading..." />
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
