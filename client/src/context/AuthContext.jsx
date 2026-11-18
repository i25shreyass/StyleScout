import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { loginRequest, signupRequest } from '../services/api';

const AuthContext = createContext(null);
const KEY = 'stylescout_auth';

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const login = useCallback(async (email, password, captchaToken) => {
    const cleanEmail = email.trim().toLowerCase();
    const data = await loginRequest({ email: cleanEmail, password, captchaToken });
    const next = { token: data.token, user: { ...data.user, email: cleanEmail } };
    localStorage.setItem(KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }, []);

  // Signing up no longer logs you in: the account must be verified by email first.
  const signup = useCallback(
    (name, email, password, captchaToken) =>
      signupRequest({ name: name.trim(), email: email.trim().toLowerCase(), password, captchaToken }),
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ user: session?.user || null, token: session?.token || null, login, signup, logout }),
    [session, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
