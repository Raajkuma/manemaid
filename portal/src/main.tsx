import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackProvider } from './components/ui';
import './index.css';
import { installGlobalErrorReporting } from './lib/errors';
import { SessionProvider } from './lib/session';
import { applyStoredTheme } from './lib/theme';

applyStoredTheme();
installGlobalErrorReporting();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <FeedbackProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </FeedbackProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
