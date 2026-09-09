import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

export type UserRole = "employee" | "branch_leader" | "hr_admin" | "managing_director" | "operation_manager" | "branch_officer" | "head_of_department";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  userBranch: string;
  userDepartment: string;
  userId: string | undefined;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const normalizeRole = (rawRole?: string): UserRole => {
  if (!rawRole) return "employee";
  const r = String(rawRole).trim().toLowerCase();
  if (r === 'hr' || r === 'hr admin' || r === 'hr_admin' || r === 'admin') return 'hr_admin';
  if (r === 'md' || r === 'managing director' || r === 'managing_director') return 'managing_director';
  if (r === 'branch leader' || r === 'branch_leader') return 'branch_leader';
  if (r === 'branch officer' || r === 'branch_officer') return 'branch_officer';
  if (r === 'finance manager' || r === 'finance_manager' || r === 'operation manager' || r === 'operations manager' || r === 'operation_manager') return 'operation_manager';
  if (r === 'head of department' || r === 'hod' || r === 'head_of_department') return 'head_of_department';
  return "employee";
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserLocal } = useAuth();
  const resolvedUserId = user?.user_id || user?.id;

  const getInitialRole = (): UserRole => {
    if (user?.role) return normalizeRole(user.role);
    try {
      const cached = localStorage.getItem("presence_cached_role");
      if (cached) return normalizeRole(cached);
    } catch {}
    return "employee";
  };

  const getInitialBranch = (): string => {
    if (user?.branch) return user.branch;
    try {
      return localStorage.getItem("presence_cached_branch") || "HQ";
    } catch {}
    return "HQ";
  };

  const getInitialDept = (): string => {
    if (user?.department) return user.department;
    try {
      return localStorage.getItem("presence_cached_department") || "";
    } catch {}
    return "";
  };

  const getInitialName = (): string => {
    if (user?.full_name || user?.name || user?.email) return user.full_name || user.name || user.email;
    try {
      return localStorage.getItem("presence_cached_name") || "";
    } catch {}
    return "";
  };

  const [role, setRole] = useState<UserRole>(getInitialRole);
  const [userName, setUserName] = useState<string>(getInitialName);
  const [userBranch, setUserBranch] = useState<string>(getInitialBranch);
  const [userDepartment, setUserDepartment] = useState<string>(getInitialDept);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setUserName(""); // Clear name on logout
      setUserBranch("");
      setUserDepartment("");
      setRole("employee");
      return;
    }

    // 1. IMMEDIATE SYNCHRONOUS SYNC from user object
    if (user.role) {
      const norm = normalizeRole(user.role);
      setRole(norm);
      try { localStorage.setItem("presence_cached_role", norm); } catch {}
    }
    if (user.branch) {
      setUserBranch(user.branch);
      try { localStorage.setItem("presence_cached_branch", user.branch); } catch {}
    }
    if (user.department) {
      setUserDepartment(user.department);
      try { localStorage.setItem("presence_cached_department", user.department); } catch {}
    }
    if (user.full_name || user.name || user.email) {
      const name = user.full_name || user.name || user.email;
      setUserName(name);
      try { localStorage.setItem("presence_cached_name", name); } catch {}
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-details/${resolvedUserId || user.email}`);
        const data = await response.json();

        if (response.ok && data.success && data.profile) {
          const fetchedName = data.profile.full_name || user.full_name || user.name || user.email || "User";
          const fetchedBranch = data.profile.branch || "HQ";
          const fetchedDept = data.profile.department || "";
          const parsedRole = normalizeRole(data.role || user.role);

          setUserName(fetchedName);
          setUserBranch(fetchedBranch);
          setUserDepartment(fetchedDept);
          setRole(parsedRole);

          try {
            localStorage.setItem("presence_cached_role", parsedRole);
            localStorage.setItem("presence_cached_branch", fetchedBranch);
            localStorage.setItem("presence_cached_department", fetchedDept);
            localStorage.setItem("presence_cached_name", fetchedName);
          } catch {}

          if (updateUserLocal) {
            updateUserLocal({
              full_name: fetchedName,
              name: fetchedName,
              branch: fetchedBranch,
              department: fetchedDept,
              role: parsedRole
            });
          }
        } else {
          setUserName(user.full_name || user.name || user.email || "User");
          setUserBranch(user.branch || "HQ");
          setUserDepartment(user.department || "");
          if (user.role) {
            setRole(normalizeRole(user.role));
          }
        }
      } catch (error) {
        console.error("Role fetch error:", error);
        setUserName(user.full_name || user.name || user.email || "User");
        if (user.branch) setUserBranch(user.branch);
        if (user.department) setUserDepartment(user.department);
        if (user.role) setRole(normalizeRole(user.role));
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, resolvedUserId]);

  return (
    <RoleContext.Provider value={{ role, setRole, userName, userBranch, userDepartment, userId: resolvedUserId, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};
