import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../../pages/LandPage/LoginPage';
import RegisterPage from '../../pages/LandPage/RegisterPage';
import Dashboard from '../../pages/Dashboard/Dashboard';
import { ProtectedRoute, PublicRoute } from '../components/RouteGuards';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
]);
