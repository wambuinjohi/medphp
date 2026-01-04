import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { enableResizeObserverErrorSuppression } from "@/utils/resizeObserverErrorHandler";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import DeliveryNotes from "./pages/DeliveryNotes";
import Proforma from "./pages/Proforma";
import SalesReports from "./pages/reports/SalesReports";
import InventoryReports from "./pages/reports/InventoryReports";
import StatementOfAccounts from "./pages/reports/StatementOfAccounts";
import CompanySettings from "./pages/settings/CompanySettings";
import UserManagement from "./pages/settings/UserManagement";
import RemittanceAdvice from "./pages/RemittanceAdvice";
import AuditLogs from "./pages/AuditLogs";
import LPOs from "./pages/LPOs";
import CreditNotes from "./pages/CreditNotes";
import WebManager from "./pages/WebManager";
import NotFound from "./pages/NotFound";
import PaymentSynchronizationPage from "./pages/PaymentSynchronization";
import OptimizedInventory from "./pages/OptimizedInventory";
import PerformanceOptimizerPage from "./pages/PerformanceOptimizerPage";
import OptimizedCustomers from "./pages/OptimizedCustomers";
import CustomerPerformanceOptimizerPage from "./pages/CustomerPerformanceOptimizerPage";
import SetupAndTest from "./components/SetupAndTest";
import AuthTest from "./components/AuthTest";
import DatabaseDebug from "./pages/DatabaseDebug";
import AdminInit from "./pages/AdminInit";

const App = () => {

  useEffect(() => {
    // Suppress ResizeObserver loop errors
    enableResizeObserverErrorSuppression();
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        {/* Admin initialization route - Accessible without authentication */}
        <Route path="/admin-init" element={<AdminInit />} />

        {/* Debug routes - Accessible without authentication */}
        <Route path="/debug/database" element={<DatabaseDebug />} />

        {/* All other routes wrapped in Layout */}
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                {/* Redirect root to app dashboard */}
                <Route path="/" element={<Navigate to="/app" replace />} />

                {/* App Routes - Protected */}
                {/* Dashboard */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                {/* Sales & Customer Management */}
                <Route
                  path="/app/quotations"
                  element={
                    <ProtectedRoute>
                      <Quotations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/quotations/new"
                  element={
                    <ProtectedRoute>
                      <Quotations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/customers"
                  element={
                    <ProtectedRoute>
                      <Customers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/customers/new"
                  element={
                    <ProtectedRoute>
                      <Customers />
                    </ProtectedRoute>
                  }
                />

                {/* Financial Management */}
                <Route
                  path="/app/invoices"
                  element={
                    <ProtectedRoute>
                      <Invoices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/invoices/new"
                  element={
                    <ProtectedRoute>
                      <Invoices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payments"
                  element={
                    <ProtectedRoute>
                      <Payments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/payments/new"
                  element={
                    <ProtectedRoute>
                      <Payments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/credit-notes"
                  element={
                    <ProtectedRoute>
                      <CreditNotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/credit-notes/new"
                  element={
                    <ProtectedRoute>
                      <CreditNotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/proforma"
                  element={
                    <ProtectedRoute>
                      <Proforma />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/app/admin/audit-logs"
                  element={
                    <ProtectedRoute>
                      <AuditLogs />
                    </ProtectedRoute>
                  }
                />

                {/* Procurement & Inventory */}
                <Route
                  path="/app/lpos"
                  element={
                    <ProtectedRoute>
                      <LPOs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/lpos/new"
                  element={
                    <ProtectedRoute>
                      <LPOs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/inventory"
                  element={
                    <ProtectedRoute>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/inventory/new"
                  element={
                    <ProtectedRoute>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/delivery-notes"
                  element={
                    <ProtectedRoute>
                      <DeliveryNotes />
                    </ProtectedRoute>
                  }
                />

                {/* Additional Features */}
                <Route
                  path="/app/remittance"
                  element={
                    <ProtectedRoute>
                      <RemittanceAdvice />
                    </ProtectedRoute>
                  }
                />

                {/* Reports */}
                <Route
                  path="/app/reports/sales"
                  element={
                    <ProtectedRoute>
                      <SalesReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/reports/inventory"
                  element={
                    <ProtectedRoute>
                      <InventoryReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/reports/statements"
                  element={
                    <ProtectedRoute>
                      <StatementOfAccounts />
                    </ProtectedRoute>
                  }
                />

                {/* Web Manager */}
                <Route
                  path="/app/web-manager"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <WebManager />
                    </ProtectedRoute>
                  }
                />

                {/* Settings */}
                <Route
                  path="/app/settings/company"
                  element={
                    <ProtectedRoute>
                      <CompanySettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/settings/users"
                  element={
                    <ProtectedRoute>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/app/setup-test"
                  element={
                    <ProtectedRoute>
                      <SetupAndTest />
                    </ProtectedRoute>
                  }
                />

                {/* Authentication Test - No protection needed */}
                <Route path="/auth-test" element={<AuthTest />} />

                {/* Payment Synchronization - No protection needed for setup */}
                <Route path="/payment-sync" element={<PaymentSynchronizationPage />} />

                {/* Optimized Inventory - Performance-optimized inventory page */}
                <Route
                  path="/app/optimized-inventory"
                  element={
                    <ProtectedRoute>
                      <OptimizedInventory />
                    </ProtectedRoute>
                  }
                />

                {/* Performance Optimizer - Database and inventory performance optimization */}
                <Route path="/app/performance-optimizer" element={<PerformanceOptimizerPage />} />

                {/* Optimized Customers - Performance-optimized customers page */}
                <Route
                  path="/app/optimized-customers"
                  element={
                    <ProtectedRoute>
                      <OptimizedCustomers />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Performance Optimizer - Database and customer performance optimization */}
                <Route path="/app/customer-performance-optimizer" element={<CustomerPerformanceOptimizerPage />} />

                {/* 404 Page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </TooltipProvider>
  );
};

export default App;
