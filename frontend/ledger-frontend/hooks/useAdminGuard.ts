import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAdminGuard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Get current user ID
        const meResponse = await fetch('http://localhost:3001/api/auth/me', {
          credentials: 'include'
        });
        
        if (!meResponse.ok) {
          navigate('/login');
          return;
        }
        
        const me = await meResponse.json();
        
        // Verify actual role from truth source
        const usersResponse = await fetch('http://localhost:3001/api/users', {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!usersResponse.ok) {
          navigate('/dashboard');
          return;
        }
        
        const users = await usersResponse.json();
        const currentUser = users.find((u: any) => u.id === me.userId);
        
        if (!currentUser || currentUser.role !== 'Admin') {
          navigate('/dashboard');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Admin verification failed:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [navigate]);

  return { isAdmin, loading };
};