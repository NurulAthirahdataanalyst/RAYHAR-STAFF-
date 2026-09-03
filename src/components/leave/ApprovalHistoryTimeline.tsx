import React from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ApprovalHistoryRecord {
  id?: number;
  approver_id?: string;
  approver_role?: string;
  approver_name?: string;
  status: string;
  remarks?: string;
  created_at?: string;
  approver_department?: string;
  approver_branch?: string;
}

interface ApprovalHistoryTimelineProps {
  status: string;
  approverRole?: string;
  approvalHistory?: ApprovalHistoryRecord[];
  branch?: string;
  department?: string;
  pendingApproverName?: string;
}

const formatRoleWithContext = (role?: string, department?: string, branch?: string) => {
  if (!role) return "Management";
  const r = role.toLowerCase().trim();
  if (r === "head_of_department" || r === "hod") {
    return department ? `Head of Department (${department})` : `Head of Department`;
  }
  if (r === "branch_leader") {
    return branch ? `Branch Leader (${branch})` : `Branch Leader`;
  }
  if (r === "operation_manager" || r === "finance_manager") {
    return "Operation Manager";
  }
  if (r === "managing_director" || r === "md") {
    return "Managing Director";
  }
  if (r === "hr_admin") {
    return "HR Admin";
  }
  if (r === "branch_officer") {
    return "Branch Officer";
  }
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({
  status,
  approverRole,
  approvalHistory = [],
  branch = "HQ",
  department = "",
  pendingApproverName,
}) => {
  const isHQ = String(branch).toUpperCase() === 'HQ';

  // Build the list of display items
  let displayItems: Array<{
    status: 'Approved' | 'Rejected' | 'Pending';
    name?: string;
    roleLabel: string;
    dateStr?: string;
    remarks?: string;
  }> = [];

  if (approvalHistory && approvalHistory.length > 0) {
    displayItems = approvalHistory.map(h => {
      const isApproved = String(h.status).toLowerCase() === 'approved';
      const isRejected = String(h.status).toLowerCase() === 'rejected';
      const d = h.created_at ? new Date(h.created_at) : null;
      const dateFormatted = d ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : "";
      
      const roleText = formatRoleWithContext(h.approver_role, h.approver_department, h.approver_branch);

      return {
        status: isRejected ? 'Rejected' : (isApproved ? 'Approved' : 'Pending'),
        name: h.approver_name || h.approver_id || "Approver",
        roleLabel: roleText,
        dateStr: dateFormatted,
        remarks: h.remarks,
      };
    });

    // If overall leave status is Rejected, ensure the final approval action is marked as Rejected
    if (status && status.toLowerCase().startsWith("rejected")) {
      const hasRejectedItem = displayItems.some(i => i.status === 'Rejected');
      if (!hasRejectedItem && displayItems.length > 0) {
        displayItems[displayItems.length - 1].status = 'Rejected';
      }
    }

    // If overall leave status is still Pending, append current pending step
    if (status && status.startsWith("Pending")) {
      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = `Head of Department (${department}) (${branch})`;
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole, department, branch);
      } else {
        pendingRoleName = isHQ ? `Head of Department (${department}) (${branch})` : `Branch Leader (${branch})`;
      }
      pendingRoleName = pendingRoleName.replace(' ()', '').trim();

      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }
  } else {
    // If no approval history yet, generate from current status
    if (status === 'Approved') {
      const defaultApprover = isHQ ? "Head of Department" : `Branch Leader (${branch})`;
      displayItems.push({
        status: 'Approved',
        name: "Management",
        roleLabel: defaultApprover,
        dateStr: new Date().toLocaleDateString('en-GB'),
      });
    } else if (status && status.toLowerCase().startsWith('rejected')) {
      let rejectRole = "Management";
      const sUpper = status.toUpperCase();
      if (sUpper.includes("BRANCH LEADER") || approverRole === "branch_leader") {
        rejectRole = `Branch Leader (${branch})`;
      } else if (sUpper.includes("HOD") || approverRole === "head_of_department") {
        rejectRole = "Head of Department";
      } else if (sUpper.includes("OPERATION") || approverRole === "operation_manager") {
        rejectRole = "Operation Manager";
      } else if (sUpper.includes("MD") || approverRole === "managing_director") {
        rejectRole = "Managing Director";
      } else if (approverRole) {
        rejectRole = formatRoleWithContext(approverRole, undefined, branch);
      }
      displayItems.push({
        status: 'Rejected',
        name: "Management",
        roleLabel: rejectRole,
        dateStr: new Date().toLocaleDateString('en-GB'),
      });
    } else {
      // Pending
      let pendingRoleName = "";
      if (status === "Pending HOD") {
        pendingRoleName = `Head of Department (${department}) (${branch})`;
      } else if (status === "Pending Branch Leader") {
        pendingRoleName = `Branch Leader (${branch})`;
      } else if (status === "Pending Operation Manager" || status === "Pending Finance") {
        pendingRoleName = "Operation Manager";
      } else if (status === "Pending MD") {
        pendingRoleName = "Managing Director";
      } else if (approverRole) {
        pendingRoleName = formatRoleWithContext(approverRole, department, branch);
      } else {
        pendingRoleName = isHQ ? `Head of Department (${department}) (${branch})` : `Branch Leader (${branch})`;
      }
      pendingRoleName = pendingRoleName.replace(' ()', '').trim();
      displayItems.push({
        status: 'Pending',
        name: pendingApproverName || "Approver",
        roleLabel: pendingRoleName,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-foreground" />
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
          APPROVAL HISTORY
        </h3>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-gray-200 dark:before:bg-slate-700">
        {displayItems.map((item, index) => {
          const isApproved = item.status === 'Approved';
          const isRejected = item.status === 'Rejected';
          const isPending = item.status === 'Pending';

          return (
            <div key={index} className="relative flex items-center group">
              {/* Dot on connecting vertical timeline line */}
              <div
                className={`absolute -left-[19px] w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-10 ${
                  isApproved
                    ? 'bg-emerald-500'
                    : isRejected
                    ? 'bg-rose-500'
                    : 'bg-amber-400'
                }`}
              />

              {/* Approval Step Card */}
              <div className="w-full bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800 rounded-[18px] p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-slate-900">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Badge */}
                  {isApproved && (
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      APPROVED
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      REJECTED
                    </span>
                  )}
                  {isPending && (
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      PENDING
                    </span>
                  )}

                  {/* Approver Details */}
                  <div className="text-xs">
                    {isApproved || isRejected ? (
                      <p className="font-medium text-foreground">
                        by{' '}
                        <span className="font-black text-foreground uppercase">
                          {item.name}
                        </span>{' '}
                        <span className="font-bold text-foreground/80">
                          ({item.roleLabel})
                        </span>
                      </p>
                    ) : (
                      <p className="font-bold text-foreground/80">
                        Pending approval by{' '}
                        <span className="font-black text-foreground uppercase">
                          {item.name}
                        </span>{' '}
                        <span className="font-bold text-foreground/80">
                          ({item.roleLabel})
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                {item.dateStr && (
                  <div className="text-right sm:text-right shrink-0">
                    <span className="text-xs font-black text-foreground tracking-tight">
                      {item.dateStr}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
      <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest flex-wrap">
        <span>
          TOTAL SHOWING {fromIndex} TO {toIndex} OF {totalItems} ENTRIES
        </span>
        <div className="flex items-center gap-2">
          <span>Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[65px] bg-white dark:bg-card">
              <SelectValue placeholder={String(pageSize)}>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                ...
              </span>
            );
          }
          const pageNum = page as number;
          const isActive = currentPage === pageNum;
          return (
            <Button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={`h-7 min-w-[28px] px-2 rounded-md text-[11px] font-bold ${
                isActive
                  ? 'bg-[#942392] hover:bg-[#5e0080] text-white border-[#942392]'
                  : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground'
              }`}
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 rounded-md border-gray-200 dark:border-slate-800 bg-white dark:bg-card text-foreground disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};