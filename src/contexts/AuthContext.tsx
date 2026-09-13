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
    const savedLocalUser = sessionStorage.getItem("user") || localStorage.getItem("presence_user") || localStorage.getItem("user");
    if (savedLocalUser) {
      const parsed = JSON.parse(savedLocalUser);
      if (parsed && (parsed.id || parsed.user_id || parsed.email)) {
        return parsed;
      }
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
    const savedLocalUser = sessionStorage.getItem("user") || localStorage.getItem("presence_user") || localStorage.getItem("user");
    if (savedLocalUser && !user) {
      try {
        const parsedUser = JSON.parse(savedLocalUser);
        if (parsedUser && (parsedUser.id || parsedUser.user_id || parsedUser.email)) {
          setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse local user", e);
      }
    }
    setLoading(false);

    // Sync user state if changed in another tab/window
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "presence_user" || e.key === "user") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && (parsed.id || parsed.user_id || parsed.email)) {
              setUser(parsed);
            }
          } catch {}
        } else {
          // If key was removed, verify storage before logging out
          const remaining = sessionStorage.getItem("user") || localStorage.getItem("presence_user") || localStorage.getItem("user");
          if (!remaining) {
            setUser(null);
          }
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loginLocal = (userData: any) => {
    try {
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("presence_user", JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
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
      try {
        sessionStorage.setItem("user", JSON.stringify(updated));
        localStorage.setItem("presence_user", JSON.stringify(updated));
        localStorage.setItem("user", JSON.stringify(updated));
        if (updated?.role) localStorage.setItem("presence_cached_role", updated.role);
        if (updated?.branch) localStorage.setItem("presence_cached_branch", updated.branch);
        if (updated?.department) localStorage.setItem("presence_cached_department", updated.department);
        if (updated?.full_name || updated?.name) localStorage.setItem("presence_cached_name", updated.full_name || updated.name);
      } catch {}
      return updated;
    });
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem("user");
      localStorage.removeItem("user");
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