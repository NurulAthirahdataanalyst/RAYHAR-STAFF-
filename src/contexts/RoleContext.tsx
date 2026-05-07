import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export type UserRole = "employee" | "branch_leader" | "hr_admin" | "managing_director" | "finance_manager" | "branch_officer" | "head_of_department";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  userBranch: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setUserName(""); // Clear name on logout
      return;
    }

    // 1. IMMEDIATE UPDATE: Set the name from the Auth session right away
    // This stops the dashboard from showing "User" while the API is fetching
    if (user.full_name) {
      setUserName(user.full_name);
    } else if (user.email) {
      setUserName(user.email);
    }

    const fetchUserData = async () => {
      try {
        // Fetch fresh profile and role from your LOCAL API
        const response = await fetch(`http://localhost:5000/api/user-details/${resolvedUserId || user.email}`);
        const data = await response.json();

        if (response.ok && data.success) {
          // 2. SYNC UPDATE: Update with the most fresh data from the database
          setUserName(data.profile.full_name);
          setUserBranch(data.profile.branch || "HQ");
          setRole(data.role || "employee");
        } else {
          // Fallback logic if API is unreachable
          setUserName(user.full_name || user.email || "User");
          setUserBranch("HQ");
          setRole("employee");
        }
      } catch (error) {
        console.error("Role fetch error (API might be offline):", error);
        // Ensure we still have the name from the user object if the server is down
        setUserName(user.full_name || user.email || "User");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, resolvedUserId]);

  return (
    <RoleContext.Provider value={{ role, setRole, userName, userBranch, userId: resolvedUserId, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};
