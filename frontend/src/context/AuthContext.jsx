import { useEffect, useState } from "react";
import { api } from "../services/api";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem("lms_access_token")));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("lumina_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("lms_access_token");
    if (!token) return;

    let mounted = true;
    api.me()
      .then((freshUser) => {
        if (!mounted) return;
        setUser(freshUser);
        localStorage.setItem("lumina_user", JSON.stringify(freshUser));
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        localStorage.removeItem("lumina_user");
        localStorage.removeItem("lms_access_token");
        localStorage.removeItem("lms_refresh_token");
      })
      .finally(() => {
        if (mounted) {
          setAuthLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const completeOAuthLogin = ({ user: oauthUser, accessToken, refreshToken }) => {
    setAuthLoading(false);
    setUser(oauthUser);
    localStorage.setItem("lumina_user", JSON.stringify(oauthUser));
    localStorage.setItem("lms_access_token", accessToken);
    localStorage.setItem("lms_refresh_token", refreshToken);
    return oauthUser;
  };

  const syncUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("lumina_user", JSON.stringify(nextUser));
    return nextUser;
  };

  const login = async (credentials) => {
    const response = await api.login(credentials);
    return completeOAuthLogin({
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    });
  };

  const register = async (details) => {
    const response = await api.register(details);
    return completeOAuthLogin({
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    });
  };

  const logout = () => {
    setAuthLoading(false);
    setUser(null);
    localStorage.removeItem("lumina_user");
    localStorage.removeItem("lms_access_token");
    localStorage.removeItem("lms_refresh_token");
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, register, logout, completeOAuthLogin, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
};
