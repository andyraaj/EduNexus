import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';


window.alert = (message: string) => {
    const isError = message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('invalid');
    const toast = document.createElement('div');
    toast.textContent = (isError ? '⚠️ ' : '✅ ') + message;
    Object.assign(toast.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '12px 20px', borderRadius: '10px',
        backgroundColor: isError ? '#fee2e2' : '#d1fae5',
        color: isError ? '#991b1b' : '#065f46',
        border: `1px solid ${isError ? '#fca5a5' : '#6ee7b7'}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: '9999', fontSize: '14px', fontFamily: '"Inter", sans-serif', fontWeight: '500'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
};


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
