import { ReactNode, useState, useEffect, memo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLogin } from '@/components/auth/EnhancedLogin';
import { AdminInventoryPermissionFix } from '@/components/AdminInventoryPermissionFix';
import { APIUnavailableBanner } from '@/components/connectivity/APIUnavailableBanner';
import { ensureAuditLogSchema } from '@/utils/auditLogger';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useAPIConnectivity } from '@/hooks/useAPIConnectivity';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const [loadingStartTime] = useState(Date.now());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isConnected, retry } = useAPIConnectivity();

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

  // Allow public access - skip auth loading check

  // Show authenticated layout
  return (
    <>
      <AdminInventoryPermissionFix />
      <div className="flex h-screen bg-background">
        <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

export default memo(Layout);
