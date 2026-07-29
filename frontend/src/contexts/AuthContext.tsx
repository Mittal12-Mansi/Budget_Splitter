import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { User, AuthResponse } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("token"));
  }, []);

  const { data: userData, isLoading: isFetchingUser, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any,
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else if (error) {
      logout();
    }
  }, [userData, error]);

  const login = (authData: AuthResponse) => {
    localStorage.setItem("token", authData.token);
    setToken(authData.token);
    setUser(authData.user);
    setAuthTokenGetter(() => authData.token);
    setLocation("/");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
    queryClient.clear();
    setLocation("/login");
  };

  const isLoading = !!token && isFetchingUser;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
