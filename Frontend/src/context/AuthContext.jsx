import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../data/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'glp1_token';
const USER_KEY  = 'glp1_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]   = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
    });

  const _persist = (accessToken, userObj) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    setToken(accessToken);
    setUser(userObj);
  };

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    _persist(data.access_token, data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    const data = await api.register({ email, password });
    _persist(data.access_token, data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: !!token, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}