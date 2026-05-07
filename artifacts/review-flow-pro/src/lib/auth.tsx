import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("rfp_token"));
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("rfp_token"));
    return () => setAuthTokenGetter(null);
  }, []);

  const setToken = (newToken: string) => {
    localStorage.setItem("rfp_token", newToken);
    setTokenState(newToken);
    setAuthTokenGetter(() => newToken);
  };

  const logout = () => {
    localStorage.removeItem("rfp_token");
    setTokenState(null);
    setAuthTokenGetter(null);
    setLocation("/login");
  };

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        setToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
