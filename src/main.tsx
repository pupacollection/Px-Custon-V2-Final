import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Safety listeners contra erros não capturados fora da árvore React
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.warn('[PX CUSTOM Runtime Warning]:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[PX CUSTOM Unhandled Rejection]:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
