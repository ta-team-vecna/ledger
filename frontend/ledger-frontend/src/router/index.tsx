import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components/RouteGuards';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = lazy(() => import('../../pages/LandPage/LoginPage'));
const RegisterPage = lazy(() => import('../../pages/LandPage/RegisterPage'));
const Dashboard = lazy(() => import('../../pages/Dashboard/Dashboard'));

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
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: withSuspense(
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
]);
