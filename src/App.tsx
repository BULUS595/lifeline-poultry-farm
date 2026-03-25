import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Skeleton } from './components/Skeleton';
import styles from './App.module.css';

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
  <div className={styles.loading}>
    <div className="spinner"></div>
    <p>Preparing view...</p>
    <div style={{ width: '300px', marginTop: '20px' }}>
      <Skeleton height={20} borderRadius={10} />
    </div>
  </div>
);

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if restricted
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
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
