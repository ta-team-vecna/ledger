import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminRoute, ProtectedRoute, PublicRoute } from '../components/RouteGuards';
import LoadingSpinner from '../components/LoadingSpinner';
import RequestsTable from '../../pages/PublicRequest/PublicRequestTable';

const LoginPage = lazy(() => import('../../pages/LandPage/LoginPage'));
const RegisterPage = lazy(() => import('../../pages/LandPage/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../../pages/LandPage/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../../pages/LandPage/ResetPasswordPage'));
const Dashboard = lazy(() => import('../../pages/Dashboard/Dashboard'));
const AdminReports = lazy(() => import('../../pages/Admin/AdminReports'))
const AdminPanel = lazy(() => import('../../pages/Admin/AdminPanel')); 

const AdminUsers = lazy(() => import('../../pages/Admin/AdminUsers'));
const AdminInventory = lazy(() => import('../../pages/Admin/AdminInventory'));
const AdminRequests = lazy(() => import('../../pages/Admin/AdminRequests'));
const AdminLatestActions = lazy(() => import('../../pages/Admin/AdminLatestActions'));
const UserInventory = lazy(() => import('../../pages/Inventory/UserInventory'));
//const AdminSettings = lazy(() => import('../../pages/Admin/AdminSettings'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: withSuspense(
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: withSuspense(
      <PublicRoute>
        <RegisterPage/>
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: withSuspense(
      <PublicRoute>
        <ForgotPasswordPage/>
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: withSuspense(
      <PublicRoute>
        <ResetPasswordPage/>
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: withSuspense(
      <ProtectedRoute>
        <Dashboard/>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin', 
    element: withSuspense(
      <AdminRoute>
        <AdminPanel/>
      </AdminRoute>
    )
  },
  {
    path: '/admin/inventory',
    element: withSuspense(
      <AdminRoute>
        <AdminInventory/>
      </AdminRoute>
    )
  },
  {
    path: '/admin/users',
    element: withSuspense(
      <AdminRoute>
        <AdminUsers/>
      </AdminRoute>
    )
  },
  {
    path:'/admin/requests',
     element: withSuspense(
      <AdminRoute>
        <AdminRequests/>
      </AdminRoute>
    )
  },
  {
    path: '/inventory',
    element: withSuspense(
      <ProtectedRoute>
        <UserInventory />
      </ProtectedRoute>
    )
  },
  {
    path:'/requests',
     element: withSuspense(
      <ProtectedRoute>
        <RequestsTable/>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/reports',
    element: withSuspense(
      <AdminRoute>
        <AdminReports/>
      </AdminRoute>
    )
  },
  {
    path: '/admin/latest-actions',
    element: withSuspense(
      <AdminRoute>
        <AdminLatestActions/>
      </AdminRoute>
    )
  }
]);