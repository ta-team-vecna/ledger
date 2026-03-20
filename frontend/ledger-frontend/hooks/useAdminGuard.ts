import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/useAuth';

export const useAdminGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!location.pathname.startsWith('/admin')) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'Admin') {
      navigate('/dashboard');
      return;
    }
  }, [user, isLoading, navigate, location.pathname]);

  return { isAdmin: user?.role === 'Admin', loading: isLoading };
};
