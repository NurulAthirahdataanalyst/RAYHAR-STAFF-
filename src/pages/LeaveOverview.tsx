import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock3, FileText, Plus, XCircle } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import {
  getLeaveFormFileName,
  getLeaveRequests,
  getUsedLeaveDays,
  leaveTypeLabels,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leaveStorage";

const leaveTypes: Array<{ type: LeaveType; total?: number }> = [
  { type: "Cuti Tahunan", total: 14 },
  { type: "Cuti Ganti" },
  { type: "Cuti Tanpa Gaji" },
  { type: "Cuti Sakit" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "Approved": return "default";
    case "Rejected": return "destructive";
    default: return "secondary";
  }
};

const approvalProgress = (status: string) => {
  switch (status) {
    case "Approved": return 100;
    case "Rejected": return 100;
    case "Pending HOD": return 25;
    case "Pending Finance": return 50;
    case "Pending MD": return 75;
    default: return 25;
  }
};

const approvalStatusIcon = (status: string) => {
  switch (status) {
    case "Approved": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "Rejected": return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock3 className="h-4 w-4 text-amber-600" />;
  }
};

const formatDate = (value: string) => value ? value.slice(0, 10) : "";

export default function LeaveOverview() {
  const navigate = useNavigate();
  const { userId } = useRole();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (!userId) {
        setLeaveRequests(getLeaveRequests());
        return;
      }

      try {
        const response = await fetch(`https://rayhar-staff-portal.onrender.com/api/leave-requests?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load leave requests");
        }

        const formattedRequests = data.leaveRequests.map((request: any) => {
          const type = request.leave_type as LeaveType;
          const appliedAt = request.created_at || new Date().toISOString();

          return {
            id: String(request.leave_id),
            type,
            from: formatDate(request.start_date),
            to: formatDate(request.end_date),
            days: Number(request.days || 0),
            status: request.status || "Pending HOD",
            reason: request.reason || "",
            appliedAt,
            formFileName: getLeaveFormFileName(appliedAt, type),
          };
        });

        setLeaveRequests(formattedRequests);
      } catch (error) {
        console.error("Unable to fetch leave requests:", error);
        setLeaveRequests(getLeaveRequests());
      }
    };

    void fetchLeaveRequests();
  }, [userId]);

  const leaveBalances = useMemo(() => {
    return leaveTypes.map((item) => ({
      label: leaveTypeLabels[item.type],
      used: getUsedLeaveDays(leaveRequests, item.type),
      total: item.total,
    }));
  }, [leaveRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Apply for leave and check your balances</p>
        </div>
        <Button
          onClick={() => navigate("/leave/apply")}
          className="gap-2 bg-[#601b8a] text-white shadow-lg shadow-purple-900/20 hover:bg-[#4b1470]"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveBalances.map((item) => (
          <Card key={item.label} className="border-white/60 bg-white/90 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#601b8a]">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold font-heading text-foreground">{item.used}</span>
                <span className="text-sm text-muted-foreground">
                  {item.total ? `/ ${item.total} days` : "days used"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-purple-100">
                <div
                  className="h-full rounded-full bg-[#601b8a]"
                  style={{
                    width: item.total
                      ? `${Math.min((item.used / item.total) * 100, 100)}%`
                      : item.used > 0
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Requests Table */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">From</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">To</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Days</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((req, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 text-foreground">{leaveTypeLabels[req.type]}</td>
                      <td className="py-4 px-4 text-muted-foreground font-mono text-xs">{req.from}</td>
                      <td className="py-4 px-4 text-muted-foreground font-mono text-xs">{req.to}</td>
                      <td className="py-4 px-4 text-center text-foreground">{req.days}</td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant={statusVariant(req.status)} className="text-[10px] font-semibold">
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm font-medium text-muted-foreground">
                      No leave applications yet. Click Apply for Leave to submit your first request.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approval Section */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">Approval Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaveRequests.length > 0 ? (
            leaveRequests.map((req) => {
              const fileName = req.formFileName || getLeaveFormFileName(req.appliedAt, req.type);

              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-border/60 bg-white/80 p-4 shadow-sm hover:shadow-md hover:border-[#601b8a]/30 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate("/leave/forms")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/leave/forms");
                    }
                  }}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-purple-50 p-3 text-[#601b8a]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{fileName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {leaveTypeLabels[req.type]} submitted on {req.appliedAt.slice(0, 10)}
                        </p>
                        {req.attachmentName && (
                          <p className="mt-1 text-xs font-medium text-[#601b8a]">
                            MC attachment: {req.attachmentName}
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge variant={statusVariant(req.status)} className="w-fit text-[10px] font-semibold">
                      {req.status}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {approvalStatusIcon(req.status)}
                        Approval Progress
                      </span>
                      <span>{req.status}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-purple-100">
                      <div
                        className={`h-full rounded-full ${
                          req.status === "Rejected"
                            ? "bg-red-500"
                            : req.status === "Approved"
                              ? "bg-emerald-500"
                              : "bg-[#601b8a]"
                        }`}
                        style={{ width: `${approvalProgress(req.status)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                      <span>Submit</span>
                      <span>HOD</span>
                      <span>Finance</span>
                      <span>MD</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No submitted leave forms waiting for approval yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
