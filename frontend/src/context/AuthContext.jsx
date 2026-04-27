import { useState } from "react";
import { api } from "../services/api";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("lumina_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = async (credentials) => {
    const response = await api.login(credentials);
    setUser(response.user);
    localStorage.setItem("lumina_user", JSON.stringify(response.user));
    localStorage.setItem("lms_access_token", response.access_token);
    localStorage.setItem("lms_refresh_token", response.refresh_token);
    return response.user;
  };

  const register = async (details) => {
    const response = await api.register(details);
    setUser(response.user);
    localStorage.setItem("lumina_user", JSON.stringify(response.user));
    localStorage.setItem("lms_access_token", response.access_token);
    localStorage.setItem("lms_refresh_token", response.refresh_token);
    return response.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lumina_user");
    localStorage.removeItem("lms_access_token");
    localStorage.removeItem("lms_refresh_token");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
