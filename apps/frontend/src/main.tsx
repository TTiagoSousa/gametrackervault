import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from './Contexts/ThemeContext.tsx';
import { AuthProvider } from './Contexts/Auth_Context.tsx';
import { AlertProvider } from './Contexts/Alert_Context.tsx';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
