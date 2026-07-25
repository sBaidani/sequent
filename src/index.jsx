import { render } from 'solid-js/web';
import { createEffect, createRoot } from 'solid-js';
import App from './App';
import AuthGuard from './components/auth/AuthGuard';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { uiStore } from './stores/uiStore';
import '../styles.css';

// Keep the platform chrome (<meta name="theme-color">) in sync with the
// active mode. Matches --color-background-body in src/theme/sequentTheme.ts.
const CHROME_COLORS = { dark: '#1c1c1e', light: '#f4f5f7' };
createRoot(() => {
  createEffect(() => {
    const color = CHROME_COLORS[uiStore.state.mode] || CHROME_COLORS.dark;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', color);
    });
  });
});

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

render(() => (
  <ErrorBoundary>
    <AuthGuard>
      <App />
    </AuthGuard>
  </ErrorBoundary>
), root);
