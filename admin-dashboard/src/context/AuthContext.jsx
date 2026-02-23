import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ridehail_admin_token'));
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (token) localStorage.setItem('ridehail_admin_token', token);
    else localStorage.removeItem('ridehail_admin_token');
  }, [token]);

  const signIn = (newToken, adminData) => {
    setToken(newToken);
    setAdmin(adminData);
  };

  const signOut = () => {
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ token, admin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
