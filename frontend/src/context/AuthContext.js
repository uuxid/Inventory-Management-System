import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { login as apiLogin, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await apiLogin({ username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Even if backend logout fails, clear local state so user is signed out locally.
    }
    localStorage.clear();
    setUser(null);
  };

  const isAdmin = () => user?.role === 'ROLE_ADMIN';
  const isManager = () => user?.role === 'ROLE_MANAGER' || isAdmin();
  const isEmployee = () => !!user;

  const value = useMemo(() => ({
    user,
    login,
    logout,
    loading,
    isAdmin,
    isManager,
    isEmployee
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
