import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const persistAuth = useCallback((tokenValue, userValue) => {
    setToken(tokenValue);
    setUser(userValue);
    localStorage.setItem('auth_token', tokenValue);
    localStorage.setItem('auth_user', JSON.stringify(userValue));
  }, []);

  const signup = useCallback(async ({ name, email, password, jobRole, experienceLevel }) => {
    const res = await apiClient.post('/auth/signup', { name, email, password, jobRole, experienceLevel });
    persistAuth(res.data.token, res.data.user);
    return res.data;
  }, [persistAuth]);

  const login = useCallback(async ({ email, password }) => {
    const res = await apiClient.post('/auth/login', { email, password });
    persistAuth(res.data.token, res.data.user);
    return res.data;
  }, [persistAuth]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
