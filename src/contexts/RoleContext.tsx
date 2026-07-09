import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

export type UserRole = "employee" | "branch_leader" | "hr_admin" | "managing_director" | "finance_manager" | "branch_officer" | "head_of_department";

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

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const resolvedUserId = user?.user_id || user?.id;
  const [role, setRole] = useState<UserRole>("employee");
  const [userName, setUserName] = useState("");
  const [userBranch, setUserBranch] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setUserName(""); // Clear name on logout
      return;
    }

    // 1. IMMEDIATE UPDATE: Set the name from the Auth session right away
    if (user.full_name) {
      setUserName(user.full_name);
    } else if (user.name) {
      setUserName(user.name);
    } else if (user.email) {
      setUserName(user.email);
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user-details/${resolvedUserId || user.email}`);
        const data = await response.json();

        if (response.ok && data.success && data.profile) {
          setUserName(data.profile.full_name || user.full_name || user.name || user.email || "User");
          setUserBranch(data.profile.branch || "HQ");
          setUserDepartment(data.profile.department || "");
          let parsedRole = (data.role ? data.role.trim().toLowerCase() : "employee");
          if (parsedRole === 'hr' || parsedRole === 'hr admin') parsedRole = 'hr_admin';
          if (parsedRole === 'md' || parsedRole === 'managing director') parsedRole = 'managing_director';
          if (parsedRole === 'branch leader') parsedRole = 'branch_leader';
          if (parsedRole === 'finance manager') parsedRole = 'finance_manager';
          if (parsedRole === 'head of department' || parsedRole === 'hod') parsedRole = 'head_of_department';
          
          setRole(parsedRole as UserRole);
        } else {
          setUserName(user.full_name || user.name || user.email || "User");
          setUserBranch("HQ");
          setUserDepartment("");
          setRole("employee");
        }
      } catch (error) {
        console.error("Role fetch error:", error);
        setUserName(user.full_name || user.name || user.email || "User");
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
