import { useState, useEffect } from 'react';

interface AuthUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // First, get current user ID
      const meResponse = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include'
      });
      
      if (!meResponse.ok) {
        setUser(null);
        return null;
      }
      
      const me = await meResponse.json();
      
      // Then get ALL users (with REAL roles)
      const token = localStorage.getItem('token');
      const usersResponse = await fetch('http://localhost:3001/api/users', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        // Find myself in the REAL data
        const currentUser = users.find((u: any) => u.id === me.userId);
        
        if (currentUser) {
          const userData: AuthUser = {
            userId: currentUser.id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
            role: currentUser.role  
          };
          setUser(userData);
          return userData;
        }
      }
      
      setUser(null);
      return null;
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return { user, loading, checkAuth };
};