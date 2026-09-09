import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  loginLocal: (userData: any) => void;
  updateUserLocal: (updatedFields: Partial<any>) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialUser = () => {
  try {
    const savedLocalUser = sessionStorage.getItem("user") || localStorage.getItem("presence_user");
    if (savedLocalUser) {
      return JSON.parse(savedLocalUser);
    }
  } catch (e) {
    console.error("Failed to parse stored user", e);
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(getInitialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedLocalUser = sessionStorage.getItem("user") || localStorage.getItem("presence_user");
    if (savedLocalUser && !user) {
      try {
        const parsedUser = JSON.parse(savedLocalUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse local user", e);
        sessionStorage.removeItem("user");
        localStorage.removeItem("presence_user");
      }
    }
    setLoading(false);

    // Sync user state if changed in another tab/window
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "presence_user") {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loginLocal = (userData: any) => {
    sessionStorage.setItem("user", JSON.stringify(userData));
    try {
      localStorage.setItem("presence_user", JSON.stringify(userData));
      if (userData?.role) localStorage.setItem("presence_cached_role", userData.role);
      if (userData?.branch) localStorage.setItem("presence_cached_branch", userData.branch);
      if (userData?.department) localStorage.setItem("presence_cached_department", userData.department);
      if (userData?.full_name || userData?.name) localStorage.setItem("presence_cached_name", userData.full_name || userData.name);
    } catch {}
    setUser(userData);
  };

  const updateUserLocal = (updatedFields: Partial<any>) => {
    setUser((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      sessionStorage.setItem("user", JSON.stringify(updated));
      try {
        localStorage.setItem("presence_user", JSON.stringify(updated));
        if (updated?.role) localStorage.setItem("presence_cached_role", updated.role);
        if (updated?.branch) localStorage.setItem("presence_cached_branch", updated.branch);
        if (updated?.department) localStorage.setItem("presence_cached_department", updated.department);
        if (updated?.full_name || updated?.name) localStorage.setItem("presence_cached_name", updated.full_name || updated.name);
      } catch {}
      return updated;
    });
  };

  const signOut = async () => {
    sessionStorage.removeItem("user");
    try {
      localStorage.removeItem("presence_user");
      localStorage.removeItem("presence_cached_role");
      localStorage.removeItem("presence_cached_branch");
      localStorage.removeItem("presence_cached_department");
      localStorage.removeItem("presence_cached_name");
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginLocal, updateUserLocal, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};