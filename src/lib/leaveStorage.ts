export type LeaveType = "Cuti Tahunan" | "Cuti Ganti" | "Cuti Tanpa Gaji" | "Cuti Sakit";

export type LeaveRequest = {
  id: string;
  employeeId?: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  status: "Pending HOD" | "Pending Finance" | "Pending MD" | "Approved" | "Rejected";
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
  "Cuti Tahunan": "CUTI TAHUNAN",
  "Cuti Ganti": "CUTI GANTI",
  "Cuti Tanpa Gaji": "CUTI TANPA GAJI",
  "Cuti Sakit": "CUTI SAKIT (MC)",
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
  employeeId?: string
) => {
  return requests
    .filter((request) => {
      const isSameType = request.type === type;
      const isNotRejected = request.status !== "Rejected";
      const isSameEmployee = employeeId
        ? request.employeeId === employeeId
        : true;

      return isSameType && isNotRejected && isSameEmployee;
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
