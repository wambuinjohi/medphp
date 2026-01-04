import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import { AuthStatusIndicator } from '@/components/auth/AuthStatusIndicator';
import { enableResizeObserverErrorSuppression } from '@/utils/resizeObserverErrorHandler';
import { initializeDatabase } from '@/integrations/database';
import App from './App.tsx'
import './index.css'

// Suppress ResizeObserver errors before any components render
enableResizeObserverErrorSuppression();

// Initialize database with external API provider only
const initApp = async () => {
  try {
    const provider = 'external-api'; // Force external-api provider - Supabase support removed
    const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';
    console.log(`🔧 Initializing app with external API provider`);
    console.log(`📍 Using external API: ${apiUrl}`);

    await initializeDatabase({ provider: 'external-api' as any });
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Continue app startup even if database fails
  }
};

// Initialize before rendering
initApp();

// Removed auto-migration imports for production safety

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthErrorBoundary>
      <AuthProvider>
        <AuthStatusIndicator />
        <CompanyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  </QueryClientProvider>
);
