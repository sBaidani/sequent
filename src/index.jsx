import { render } from 'solid-js/web';
import App from './App';
import AuthGuard from './components/auth/AuthGuard';
import ErrorBoundary from './components/ui/ErrorBoundary';
import '../styles.css';

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
