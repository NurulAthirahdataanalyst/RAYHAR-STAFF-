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
    const savedLocalUser = sessionStorage.getItem("user");
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
    const savedLocalUser = sessionStorage.getItem("user");
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
  }, []);

  const loginLocal = (userData: any) => {
    try {
      sessionStorage.setItem("user", JSON.stringify(userData));
      if (userData?.role) sessionStorage.setItem("presence_cached_role", userData.role);
      if (userData?.branch) sessionStorage.setItem("presence_cached_branch", userData.branch);
      if (userData?.department) sessionStorage.setItem("presence_cached_department", userData.department);
      if (userData?.full_name || userData?.name) sessionStorage.setItem("presence_cached_name", userData.full_name || userData.name);
    } catch {}
    setUser(userData);
  };

  const updateUserLocal = (updatedFields: Partial<any>) => {
    setUser((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      try {
        sessionStorage.setItem("user", JSON.stringify(updated));
        if (updated?.role) sessionStorage.setItem("presence_cached_role", updated.role);
        if (updated?.branch) sessionStorage.setItem("presence_cached_branch", updated.branch);
        if (updated?.department) sessionStorage.setItem("presence_cached_department", updated.department);
        if (updated?.full_name || updated?.name) sessionStorage.setItem("presence_cached_name", updated.full_name || updated.name);
      } catch {}
      return updated;
    });
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("presence_cached_role");
      sessionStorage.removeItem("presence_cached_branch");
      sessionStorage.removeItem("presence_cached_department");
      sessionStorage.removeItem("presence_cached_name");
      sessionStorage.removeItem("activeAttendanceSession");
      sessionStorage.removeItem("latestAttendanceUpdate");
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