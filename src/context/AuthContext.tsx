import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types";
import { apiRequest } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    college?: string;
    department?: string;
    rollNumber?: string;
    position?: string;
    dob?: string;
    mobileNumber?: string;
    tenthMark?: string;
    twelfthMark?: string;
    cgpa?: string;
    role?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("izeon_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("izeon_token");
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem("izeon_token");
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: User }>("/auth/me");
      setUser(data.user);
      localStorage.setItem("izeon_user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Auth refresh failed:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await apiRequest<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("izeon_token", data.token);
    localStorage.setItem("izeon_user", JSON.stringify(data.user));
    return data.user;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    college?: string;
    department?: string;
    rollNumber?: string;
    position?: string;
    dob?: string;
    mobileNumber?: string;
    tenthMark?: string;
    twelfthMark?: string;
    cgpa?: string;
    role?: string;
  }) => {
    const res = await apiRequest<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("izeon_token", res.token);
    localStorage.setItem("izeon_user", JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("izeon_token");
    localStorage.removeItem("izeon_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
