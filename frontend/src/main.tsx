import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { CompanyProvider } from './company/CompanyProvider.tsx';
import { RequirePasswordChange } from './components/RequirePasswordChange.tsx';
import { GeoProvider } from './geo/GeoProvider.tsx';
import { RequireGeolocation } from './components/RequireGeolocation.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RequirePasswordChange>
            <GeoProvider>
              <RequireGeolocation>
                <CompanyProvider>
                  <App />
                </CompanyProvider>
              </RequireGeolocation>
            </GeoProvider>
          </RequirePasswordChange>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
