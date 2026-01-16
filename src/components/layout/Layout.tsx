import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLogin } from '@/components/auth/EnhancedLogin';
import { ensureAuditLogSchema } from '@/utils/auditLogger';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const [loadingStartTime] = useState(Date.now());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Apply company branding colors globally
  useCompanyBranding();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when navigation changes
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Ensure audit logs table exists on app initialization
  useEffect(() => {
    if (isAuthenticated && !loading) {
      ensureAuditLogSchema().catch((err) => {
        console.warn('Failed to ensure audit logs schema:', err);
      });
    }
  }, [isAuthenticated, loading]);

  // Show login if not authenticated
  if (!loading && !isAuthenticated) {
    return <EnhancedLogin />;
  }

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">App appears to be stuck in loading state...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  // Show loading spinner while authenticating
  if (loading) {
    const loadingDuration = Math.floor((Date.now() - loadingStartTime) / 1000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2 w-full max-w-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">Starting up...</p>
          <p className="text-sm text-muted-foreground">This should only take a moment</p>
          {loadingDuration > 2 && (
            <p className="text-sm text-muted-foreground mt-2">Almost ready...</p>
          )}
        </div>
      </div>
    );
  }

  // Show authenticated layout
  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
