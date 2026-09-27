import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LoginGate } from './components/LoginGate';
import './index.css';

// Interceptar avisos transitorios de reconexión/offline de Firestore para evitar falsas alarmas en la consola
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : '';
  if (
    firstArg.includes('Could not reach Cloud Firestore backend') ||
    firstArg.includes('@firebase/firestore') ||
    (firstArg.includes('[code=unavailable]') && firstArg.includes('Firestore'))
  ) {
    console.warn(...args);
    return;
  }
  origConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginGate>
      <App />
    </LoginGate>
  </StrictMode>,
);

// Registra el Service Worker (necesario para que Android/Chrome ofrezca
// "Instalar app"; en iOS no hace falta para el ícono, pero no molesta).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si falla (por ejemplo en desarrollo local sin HTTPS), la app
      // sigue funcionando normal, solo no queda instalable offline.
    });
  });
}

