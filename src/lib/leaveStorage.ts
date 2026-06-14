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
  tarikh: string;
  hari: string;
  jam: number;
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
