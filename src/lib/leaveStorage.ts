export type LeaveType = 
  | "Annual/Emergency Leave" 
  | "Replacement Leave" 
  | "Unpaid Leave" 
  | "Sick Leave"
  | "Cuti Tahunan" 
  | "Cuti Ganti" 
  | "Cuti Tanpa Gaji" 
  | "Cuti Sakit";

export type LeaveRequest = {
  id: string;
  userId?: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  status: "Pending Branch Leader" | "Pending HOD" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
  reason: string;
  appliedAt: string;
  formFileName: string;
  attachmentName?: string;
  waris_nama?: string;
  waris_phone?: string;
  waris_alamat?: string;
  waris_hubungan?: string;
};

export const LEAVE_STORAGE_KEY = "rayhar_leave_requests";

export const leaveTypeLabels: Record<LeaveType, string> = {
  "Annual/Emergency Leave": "ANNUAL/EMERGENCY LEAVE",
  "Replacement Leave": "REPLACEMENT LEAVE",
  "Unpaid Leave": "UNPAID LEAVE",
  "Sick Leave": "SICK LEAVE",
  "Cuti Tahunan": "ANNUAL/EMERGENCY LEAVE",
  "Cuti Ganti": "REPLACEMENT LEAVE",
  "Cuti Tanpa Gaji": "UNPAID LEAVE",
  "Cuti Sakit": "SICK LEAVE",
};

export const getLeaveRequests = (): LeaveRequest[] => {
  if (typeof window === "undefined") return [];

  try {
    const storedRequests = window.localStorage.getItem(LEAVE_STORAGE_KEY);
    return storedRequests ? (JSON.parse(storedRequests) as LeaveRequest[]) : [];
  } catch (error) {
    console.error("Unable to read leave requests:", error);
    return [];
  }
};

export const saveLeaveRequest = (request: LeaveRequest) => {
  const requests = getLeaveRequests();
  window.localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify([request, ...requests]));
};

export const getUsedLeaveDays = (
  requests: LeaveRequest[],
  type: LeaveType,
  userId?: string
) => {
  return requests
    .filter((request) => {
      let isSameType = request.type === type;

      // Special quota logic: Sick Leave auto-deducts from Annual/Emergency Leave quota!
      if (type === "Annual/Emergency Leave" || type === "Cuti Tahunan") {
        isSameType = 
          request.type === "Annual/Emergency Leave" ||
          request.type === "Cuti Tahunan" ||
          request.type === "Sick Leave" ||
          request.type === "Cuti Sakit";
      } else if (type === "Sick Leave" || type === "Cuti Sakit") {
        isSameType = request.type === "Sick Leave" || request.type === "Cuti Sakit";
      } else if (type === "Replacement Leave" || type === "Cuti Ganti") {
        isSameType = request.type === "Replacement Leave" || request.type === "Cuti Ganti";
      } else if (type === "Unpaid Leave" || type === "Cuti Tanpa Gaji") {
        isSameType = request.type === "Unpaid Leave" || request.type === "Cuti Tanpa Gaji";
      }

      const isApproved = request.status === "Approved";
      const isSameEmployee = userId
        ? request.userId === userId
        : true;

      return isSameType && isApproved && isSameEmployee;
    })
    .reduce((total, request) => total + request.days, 0);
};

export const getLeaveFormFileName = (appliedAt: string, type: LeaveType, employeeName?: string) => {
  const submitDate = appliedAt.slice(0, 10);
  const leaveTypeName = type.toLowerCase().replace(/\s+/g, "-");
  
  if (employeeName) {
    const safeName = employeeName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    return `${safeName}-${submitDate}-${leaveTypeName}-form.pdf`;
  }

  return `${submitDate}-${leaveTypeName}-form.pdf`;
};

// Types and helper functions for dynamic multiple Cuti Ganti rows
export type CutiGantiRow = {
  tarikhCuti: string;
  tarikhGanti: string;
  keterangan: string;
  jamGanti: string | number;
};

export const parseCutiGantiRows = (
  reason: string,
  fallbackTarikh?: string,
  fallbackHari?: string,
  fallbackJam?: number
): CutiGantiRow[] => {
  if (!reason) {
    if (fallbackTarikh) {
      return [{
        tarikh: fallbackTarikh,
        hari: fallbackHari || "",
        jam: fallbackJam || 0
      }];
    }
    return [];
  }

  const match = reason.match(/\[CUTI_GANTI_DATA:(.*?)\]/);
  if (match) {
    try {
      return JSON.parse(match[1]) as CutiGantiRow[];
    } catch (e) {
      console.error("Failed to parse cuti ganti rows:", e);
    }
  }

  if (fallbackTarikh) {
    return [{
      tarikh: fallbackTarikh,
      hari: fallbackHari || "",
      jam: fallbackJam || 0
    }];
  }

  return [];
};

export const getCleanReason = (reason: string): string => {
  if (!reason) return "";
  return reason.replace(/\[CUTI_GANTI_DATA:.*?\]/g, "").trim();
};

export const getEmployeeLeaveBalances = (employeeIdOrName: string): {
  "Annual & Emergency Leave": number;
  "Replacement Leave": number;
  "Sick Leave (MC)": number;
  "Unpaid Leave": number;
} => {
  const defaultBalances = {
    "Annual & Emergency Leave": 14,
    "Replacement Leave": 0,
    "Sick Leave (MC)": 14,
    "Unpaid Leave": 0
  };

  if (typeof window === "undefined" || !employeeIdOrName) return defaultBalances;

  try {
    const stored = window.localStorage.getItem("rayhar_employee_leave_balances");
    if (stored) {
      const allBalances = JSON.parse(stored);
      const key = employeeIdOrName.toLowerCase().trim();
      
      for (const k of Object.keys(allBalances)) {
        if (k.toLowerCase().trim() === key) {
          return { ...defaultBalances, ...allBalances[k] };
        }
      }
    }
  } catch (err) {
    console.error("Error loading employee balances:", err);
  }

  return defaultBalances;
};

export const updateEmployeeLeaveBalance = (
  employeeId: string,
  employeeName: string,
  leaveType: string,
  newTotal: number
) => {
  if (typeof window === "undefined") return;

  try {
    const stored = window.localStorage.getItem("rayhar_employee_leave_balances");
    const allBalances = stored ? JSON.parse(stored) : {};

    const idKey = employeeId.toLowerCase().trim();
    const nameKey = employeeName.toLowerCase().trim();

    // Get existing balances or initialize
    let existing = allBalances[idKey] || allBalances[nameKey] || {
      "Annual & Emergency Leave": 14,
      "Replacement Leave": 0,
      "Sick Leave (MC)": 14,
      "Unpaid Leave": 0
    };

    const mappedType = leaveType === "Annual Leave" || leaveType === "Annual/Emergency Leave" || leaveType === "Annual & Emergency Leave"
      ? "Annual & Emergency Leave"
      : leaveType === "Sick Leave" || leaveType === "Sick Leave (MC)" || leaveType === "Medical Leave"
      ? "Sick Leave (MC)"
      : leaveType === "Replacement Leave"
      ? "Replacement Leave"
      : "Unpaid Leave";

    const diff = newTotal - existing[mappedType];

    existing[mappedType] = newTotal;

    allBalances[idKey] = existing;
    allBalances[nameKey] = existing;

    window.localStorage.setItem("rayhar_employee_leave_balances", JSON.stringify(allBalances));

    // Async sync to backend (fire and forget)
    if (diff !== 0) {
      import("../config/api").then(({ API_BASE_URL }) => {
        fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(employeeId)}/leave-adjustments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveType: mappedType,
            adjustmentDays: diff,
            reason: "Adjustment from UI",
            approvedBy: "HR Admin"
          })
        }).catch(err => console.error("Failed to sync leave balance adjustment to backend:", err));
      }).catch(console.error);
    }

    try {
      const bc = new BroadcastChannel("rayhar_leave_refresh");
      bc.postMessage("refresh");
    } catch (e) {
      // BroadcastChannel might fail in some sandboxed contexts
    }
  } catch (err) {
    console.error("Error saving employee balance:", err);
  }
};
