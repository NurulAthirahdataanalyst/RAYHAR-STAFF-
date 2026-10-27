import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/api";

export type UserRole =
  | "employee"
  | "branch_leader"
  | "hr_admin"
  | "managing_director"
  | "operation_manager"
  | "branch_officer"
  | "head_of_department"
  | (string & {});

interface RoleContextType {
  role: string;
  roleName: string;
  roleId?: string;
  isSystemRole: boolean;
  permissions: string[];
  permissionLevels: Record<string, 'view' | 'edit'>;
  hasPermission: (permission: string | string[]) => boolean;
  canEdit: (permissionKey: string) => boolean;
  canView: (permissionKey: string) => boolean;
  setRole: (role: string) => void;
  userName: string;
  userBranch: string;
  userDepartment: string;
  userId: string | undefined;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const normalizeRole = (rawRole?: string): string => {
  if (!rawRole) return "employee";
  const r = String(rawRole).trim().toLowerCase();
  if (r === 'hr' || r === 'hr admin' || r === 'hr_admin' || r === 'admin' || r.includes('hr admin') || r.includes('hr_admin')) return 'hr_admin';
  if (r === 'md' || r === 'managing director' || r === 'managing_director' || r.includes('managing director')) return 'managing_director';
  if (r.includes('branch leader') || r.includes('branch_leader')) return 'branch_leader';
  if (r.includes('branch officer') || r.includes('branch_officer')) return 'branch_officer';
  if (r.includes('finance manager') || r.includes('operation manager') || r.includes('operations manager') || r.includes('operation_manager')) return 'operation_manager';
  if (r.includes('head of department') || r.includes('hod') || r.includes('head_of_department')) return 'head_of_department';
  if (r.includes('employee') || r.includes('staff') || r === 'user') return 'employee';
  return r;
};

export const formatRoleDisplayName = (roleStr?: string): string => {
  if (!roleStr) return "Employee";
  const norm = normalizeRole(roleStr);
  switch (norm) {
    case 'hr_admin': return 'HR Admin';
    case 'managing_director': return 'Managing Director';
    case 'operation_manager': return 'Operation Manager';
    case 'head_of_department': return 'Head of Department';
    case 'branch_leader': return 'Branch Leader';
    case 'employee': return 'Employee';
    default:
      return roleStr.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserLocal } = useAuth();
  const resolvedUserId = user?.user_id || user?.id;

  const getInitialRole = (): string => {
    if (user?.role) return normalizeRole(user.role);
    try {
      const cached = sessionStorage.getItem("presence_cached_role");
      if (cached) return normalizeRole(cached);
    } catch {}
    return "employee";
  };

  const getInitialRoleName = (): string => {
    if (user?.role_name) return user.role_name;
    try {
      const cached = sessionStorage.getItem("presence_cached_role_name");
      if (cached) return cached;
    } catch {}
    return formatRoleDisplayName(user?.role || "employee");
  };

  const getInitialPermissions = (): string[] => {
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    try {
      const cached = sessionStorage.getItem("presence_cached_permissions");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const getInitialBranch = (): string => {
    if (user?.branch) return user.branch;
    try {
      return sessionStorage.getItem("presence_cached_branch") || "HQ";
    } catch {}
    return "HQ";
  };

  const getInitialDept = (): string => {
    if (user?.department) return user.department;
    try {
      return sessionStorage.getItem("presence_cached_department") || "";
    } catch {}
    return "";
  };

  const getInitialName = (): string => {
    if (user?.full_name || user?.name || user?.email) return user.full_name || user.name || user.email;
    try {
      return sessionStorage.getItem("presence_cached_name") || "";
    } catch {}
    return "";
  };

  const [role, setRole] = useState<string>(getInitialRole);
  const [roleName, setRoleName] = useState<string>(getInitialRoleName);
  const [roleId, setRoleId] = useState<string | undefined>(user?.role_id);
  const [isSystemRole, setIsSystemRole] = useState<boolean>(user?.is_system_role ?? true);
  const [permissions, setPermissions] = useState<string[]>(getInitialPermissions);
  const [permissionLevels, setPermissionLevels] = useState<Record<string, 'view' | 'edit'>>({});
  const [userName, setUserName] = useState<string>(getInitialName);
  const [userBranch, setUserBranch] = useState<string>(getInitialBranch);
  const [userDepartment, setUserDepartment] = useState<string>(getInitialDept);
  const [loading, setLoading] = useState(!user);
  const lastFetchedUserRef = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  const hasPermission = useCallback((permission: string | string[]): boolean => {
    // HR Admin super-bypass
    const norm = (role || "").toLowerCase();
    if (norm === "hr_admin" || norm === "hr admin" || norm === "admin") {
      return true;
    }
    if (permissions.includes("*")) {
      return true;
    }
    if (Array.isArray(permission)) {
      return permission.some(p => permissions.includes(p));
    }
    return permissions.includes(permission);
  }, [role, permissions]);

  const canEdit = useCallback((permissionKey: string): boolean => {
    const norm = (role || "").toLowerCase();
    if (norm === "hr_admin" || norm === "hr admin" || norm === "admin") {
      return true;
    }
    if (permissions.includes("*")) {
      return true;
    }
    if (!permissions.includes(permissionKey)) {
      return false;
    }
    const level = permissionLevels[permissionKey] || 'edit';
    return level === 'edit';
  }, [role, permissions, permissionLevels]);

  const canView = useCallback((permissionKey: string): boolean => {
    return hasPermission(permissionKey);
  }, [hasPermission]);

  const fetchUserData = useCallback(async (force = false) => {
    const targetId = resolvedUserId || user?.email;
    if (!targetId) return;
    if (!force && lastFetchedUserRef.current === targetId) return;
    if (isFetchingRef.current) return;

    lastFetchedUserRef.current = targetId;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-details/${targetId}`);
      const data = await response.json();

      if (response.ok && data.success && data.profile) {
        const fetchedName = data.profile.full_name || user?.full_name || user?.name || user?.email || "User";
        const fetchedBranch = data.profile.branch || "HQ";
        const fetchedDept = data.profile.department || "";
        const parsedRole = normalizeRole(data.role || user?.role);
        const resolvedRName = data.role_name || data.profile.role_name || formatRoleDisplayName(parsedRole);
        const resolvedRId = data.role_id || data.profile.role_id;
        const resolvedIsSys = data.is_system_role ?? data.profile.is_system_role ?? true;
        const fetchedPerms = Array.isArray(data.permissions) ? data.permissions : [];
        const fetchedPermLevels = (data.permission_levels && typeof data.permission_levels === 'object') ? data.permission_levels : {};

        setUserName(fetchedName);
        setUserBranch(fetchedBranch);
        setUserDepartment(fetchedDept);
        setRole(parsedRole);
        setRoleName(resolvedRName);
        setRoleId(resolvedRId);
        setIsSystemRole(resolvedIsSys);
        setPermissions(fetchedPerms);
        setPermissionLevels(fetchedPermLevels);

        try {
          sessionStorage.setItem("presence_cached_role", parsedRole);
          sessionStorage.setItem("presence_cached_role_name", resolvedRName);
          sessionStorage.setItem("presence_cached_branch", fetchedBranch);
          sessionStorage.setItem("presence_cached_department", fetchedDept);
          sessionStorage.setItem("presence_cached_name", fetchedName);
          sessionStorage.setItem("presence_cached_permissions", JSON.stringify(fetchedPerms));
          if (resolvedRId) sessionStorage.setItem("presence_cached_role_id", resolvedRId);
        } catch {}

        if (updateUserLocal) {
          updateUserLocal({
            full_name: fetchedName,
            name: fetchedName,
            branch: fetchedBranch,
            department: fetchedDept,
            role: parsedRole,
            role_name: resolvedRName,
            role_id: resolvedRId,
            is_system_role: resolvedIsSys,
            permissions: fetchedPerms
          });
        }
      }
    } catch (error) {
      console.error("Role & permission fetch error:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [resolvedUserId, user?.email, updateUserLocal]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setUserName("");
      setUserBranch("");
      setUserDepartment("");
      setRole("employee");
      setRoleName("Employee");
      setPermissions([]);
      return;
    }

    // Immediate sync from session user
    if (user.role) {
      const norm = normalizeRole(user.role);
      setRole(norm);
    }
    if (user.role_name) {
      setRoleName(user.role_name);
    }
    if (Array.isArray(user.permissions)) {
      setPermissions(user.permissions);
    }
    if (user.branch) setUserBranch(user.branch);
    if (user.department) setUserDepartment(user.department);
    if (user.full_name || user.name || user.email) {
      setUserName(user.full_name || user.name || user.email);
    }

    fetchUserData();
  }, [resolvedUserId, user?.email, fetchUserData]);

  const contextValue = useMemo(() => ({
    role,
    roleName,
    roleId,
    isSystemRole,
    permissions,
    permissionLevels,
    hasPermission,
    canEdit,
    canView,
    setRole,
    userName,
    userBranch,
    userDepartment,
    userId: resolvedUserId,
    loading,
    refreshPermissions: () => fetchUserData(true)
  }), [
    role,
    roleName,
    roleId,
    isSystemRole,
    permissions,
    permissionLevels,
    hasPermission,
    canEdit,
    canView,
    setRole,
    userName,
    userBranch,
    userDepartment,
    resolvedUserId,
    loading,
    fetchUserData
  ]);

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};
