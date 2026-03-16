import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminRoute, ProtectedRoute, PublicRoute } from '../components/RouteGuards';
import LoadingSpinner from '../components/LoadingSpinner';
// ❌ REMOVE this line - it's conflicting with the lazy import below
// import AdminPanel from '../../pages/Admin/AdminPanel';

const LoginPage = lazy(() => import('../../pages/LandPage/LoginPage'));
const RegisterPage = lazy(() => import('../../pages/LandPage/RegisterPage'));
const Dashboard = lazy(() => import('../../pages/Dashboard/Dashboard'));
const AdminPanel = lazy(() => import('../../pages/Admin/AdminPanel')); // ✅ Keep this

//const AdminUsers = lazy(() => import('../../pages/Admin/AdminUsers'));
const AdminInventory = lazy(() => import('../../pages/Admin/AdminInventory'));
//const AdminRequests = lazy(() => import('../../pages/Admin/AdminRequests'));
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
      <ProtectedRoute>
        <AdminPanel/>
      </ProtectedRoute>
    )
  },
  {
  path: '/admin/inventory',
  element: withSuspense(
    <ProtectedRoute>
      <AdminInventory/>
    </ProtectedRoute>
  )
  }
]);