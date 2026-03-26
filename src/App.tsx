import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Skeleton } from './components/Skeleton';
import { DashboardLayout } from './layouts/DashboardLayout';

// Lazy loading all pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MortalityLogsPage = lazy(() => import('./pages/MortalityLogsPage').then(m => ({ default: m.MortalityLogsPage })));
const FeedingLogsPage = lazy(() => import('./pages/FeedingLogsPage').then(m => ({ default: m.FeedingLogsPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const StoragePage = lazy(() => import('./pages/StoragePage').then(m => ({ default: m.StoragePage })));
const AdminStockPage = lazy(() => import('./pages/AdminStockPage').then(m => ({ default: m.AdminStockPage })));
const SalesRecordsPage = lazy(() => import('./pages/SalesRecordsPage').then(m => ({ default: m.SalesRecordsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-muted-foreground font-medium animate-pulse">Life-Line is preparing your view...</p>
    <div className="w-64 mt-6">
      <Skeleton height={8} borderRadius={4} />
    </div>
  </div>
);

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  useLayout?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, useLayout = true }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if restricted
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return useLayout ? <DashboardLayout>{children}</DashboardLayout> : <>{children}</>;
};

// Route wrappers with parameter extraction
const MortalityLogsRoute: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  return farmId ? <MortalityLogsPage farmId={farmId} /> : <Navigate to="/dashboard" />;
};

const FeedingLogsRoute: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  return farmId ? <FeedingLogsPage farmId={farmId} /> : <Navigate to="/dashboard" />;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const getHomePath = () => {
    if (!user) return '/login';
    if (user.role === 'sales_staff' || user.role === 'sales') return '/sales';
    if (user.role === 'inventory_staff' || user.role === 'inventory_officer') return '/stock';
    return '/dashboard';
  };

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={getHomePath()} replace /> : <Navigate to="/login" replace />}
      />

      <Route path="/login" element={<LoginPage />} />

      {/* Admin Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Sales Management */}
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager', 'sales', 'sales_staff']}>
            <SalesPage />
          </ProtectedRoute>
        }
      />

      {/* Stock Management */}
      <Route
        path="/stock"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager', 'inventory_officer', 'inventory_staff']}>
            <StoragePage />
          </ProtectedRoute>
        }
      />

      {/* Compatibility alias */}
      <Route path="/storage" element={<Navigate to="/stock" replace />} />

      {/* Admin: Stock Approval Dashboard */}
      <Route
        path="/admin/stock"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <AdminStockPage />
          </ProtectedRoute>
        }
      />

      {/* Admin: Sales Records Dashboard */}
      <Route
        path="/admin/sales"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <SalesRecordsPage />
          </ProtectedRoute>
        }
      />

      {/* Administration */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/activity"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <ActivityLogsPage />
          </ProtectedRoute>
        }
      />

      {/* Operational Pages */}
      <Route
        path="/farms/:farmId/mortality-logs"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager', 'inventory_officer', 'inventory_staff']}>
            <MortalityLogsRoute />
          </ProtectedRoute>
        }
      />

      <Route
        path="/farms/:farmId/feeding-logs"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager', 'inventory_officer', 'inventory_staff']}>
            <FeedingLogsRoute />
          </ProtectedRoute>
        }
      />

      <Route
        path="/farms/:farmId/expenses"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/farms/:farmId/analytics"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'manager']}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;

