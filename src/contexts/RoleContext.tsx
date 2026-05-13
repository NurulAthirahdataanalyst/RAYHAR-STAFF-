import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

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
        const response = await fetch(`https://rayhar-staff-production.up.railway.app/api/user-details/${resolvedUserId || user.email}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setUserName(data.profile.full_name);
          setUserBranch(data.profile.branch || "HQ");
          setUserDepartment(data.profile.department || "");
          setRole(data.role || "employee");
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
