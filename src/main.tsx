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

// Initialize database and render app
const initializeAndRender = async () => {
  try {
    const provider = import.meta.env.VITE_DATABASE_PROVIDER || 'external-api';
    const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';

    console.log(`🔧 Initializing app with ${provider} provider`);
    console.log(`📍 Using API: ${apiUrl}`);

    // Initialize database with proper provider selection
    await initializeDatabase({ provider: provider as any });
    console.log(`✅ Database initialized successfully with ${provider} provider`);
  } catch (error) {
    console.error('⚠️  Database initialization error (will use fallback):', error);
  }

  // Removed auto-migration imports for production safety

  const queryClient = new QueryClient();

  // Render app after database is initialized
  const root = createRoot(document.getElementById("root")!);
  root.render(
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

  console.log('✅ App rendered successfully');
};

// Start initialization
initializeAndRender().catch((error) => {
  console.error('❌ Fatal error during app initialization:', error);
  // Show minimal error UI
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Application Error</h1>
      <p>Failed to initialize the application. Please refresh the page.</p>
      <details style={{ marginTop: '20px' }}>
        <summary>Details</summary>
        <pre>{error.message}</pre>
      </details>
    </div>
  );
});
