import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '../api/client';

const AuthContext = createContext(null);

// Decode the JWT payload client-side just to read role/schoolOrRegion for
// UI purposes. This is NOT a security boundary — the backend re-checks
// everything server-side regardless of what's shown here.
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const claims = decodeJwt(token);
      if (claims) setUser(claims);
    }
    setReady(true);
  }, []);

  async function signIn(phone, password) {
    const { user: loggedInUser, accessToken, refreshToken } = await authApi.login(phone, password);
    setTokens({ accessToken, refreshToken });
    const claims = decodeJwt(accessToken);
    setUser({ ...claims, name: loggedInUser.name });
  }

  async function signOut() {
    try {
      await authApi.logout(getRefreshToken());
    } catch {
      // ignore — clear local state regardless
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
