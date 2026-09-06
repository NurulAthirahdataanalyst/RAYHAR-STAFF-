import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  MapPin,
  ChevronRight,
  Users,
  LineChart
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { API_BASE_URL } from '@/config/api';

export interface EmployeeAttentionData {
  id: string;
  name: string;
  role: string;
  dept: string;
  branch: string;
  taken: number;
  total: number;
}

const getInitials = (name: string) => {
  if (!name) return 'U';
  return name.split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase();
};

const getColors = (percent: number, idx: number) => {
  let progressColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border dark:border-emerald-800/40';
  let takenColor = 'text-emerald-600 dark:text-emerald-400';
  
  if (percent >= 90) {
    progressColor = 'bg-red-600';
    badgeColor = 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 dark:border dark:border-red-800/40';
    takenColor = 'text-red-600 dark:text-red-400';
  } else if (percent >= 75) {
    progressColor = 'bg-amber-500';
    badgeColor = 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 dark:border dark:border-orange-800/40';
    takenColor = 'text-orange-500 dark:text-orange-400';
  }

  const avatarColors = [
    'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300',
    'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
  ];
  const iconColors = [
    'text-purple-400',
    'text-amber-500',
    'text-purple-400',
    'text-emerald-500',
    'text-blue-400',
  ];

  return {
    progressColor,
    badgeColor,
    takenColor,
    avatarColor: avatarColors[idx % avatarColors.length],
    iconColor: iconColors[idx % iconColors.length],
  };
};

export const EmployeesRequiringAttentionCard = ({ data = [], variant = 'grid', onEmployeeClick }: { data?: EmployeeAttentionData[], variant?: 'compact' | 'grid', onEmployeeClick?: (id: string) => void }) => {
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    fetch(`${API_BASE_URL}/api/leave-requests`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setAllLeaves(json.leaveRequests || []);
      })
      .catch(console.error);
  }, [data]);

  const getLeaveBreakdown = (empId: string) => {
    const breakdown = { AL: 0, UL: 0, RL: 0, MC: 0 };
    if (!allLeaves.length) return breakdown;

    const empLeaves = allLeaves.filter((l: any) => l.user_id === empId && l.status !== "Rejected" && l.status !== "Cancelled");
    
    empLeaves.forEach((l: any) => {
       const type = l.leave_type || l.type || "";
       const days = parseFloat(l.days) || 0;
       if (type.includes("Annual") || type.includes("Emergency")) breakdown.AL += days;
       else if (type.includes("Unpaid")) breakdown.UL += days;
       else if (type.includes("Replacement") || type.includes("Cuti Ganti")) breakdown.RL += days;
       else if (type.includes("Medical") || type.includes("Sick") || type.includes("MC")) breakdown.MC += days;
    });
    return breakdown;
  };

  const navigate = useNavigate();
  
  return (
    <Card className="bg-card border border-border/80 rounded-[24px] shadow-sm overflow-hidden flex flex-col w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Employees Requiring Attention</h2>
              <p className="text-sm text-foreground font-medium">Low leave balance / High leave utilization</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-xl flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400">{data.length} Employee{data.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="py-8 text-center text-foreground font-medium text-sm border-t border-slate-100 mt-2 pt-8">
            All employees have healthy leave balances.
          </div>
        ) : variant === 'compact' ? (
          <>
            {/* Table Header for Compact */}
            <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-foreground uppercase tracking-wider mb-2 px-2">
              <div className="col-span-4">Employee</div>
              <div className="col-span-3">Department • Branch</div>
              <div className="col-span-3">Leave Taken / Entitlement</div>
              <div className="col-span-2 text-center">Balance Left</div>
            </div>
            <hr className="border-slate-100 mb-2" />
            
            {/* Rows */}
            <div className="flex flex-col">
              {data.map((emp, idx) => {
                const percent = emp.total > 0 ? Math.round((emp.taken / emp.total) * 100) : 0;
                const left = Math.max(0, emp.total - emp.taken);
                const initials = getInitials(emp.name);
                const { progressColor, badgeColor, takenColor, avatarColor, iconColor } = getColors(percent, idx);

                return (
                  <React.Fragment key={emp.id || idx}>
                    <div className="grid grid-cols-12 gap-4 items-center py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                      {/* Employee */}
                      <div className="col-span-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${avatarColor}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">{emp.name}</h3>
                          <p className="text-xs text-foreground font-medium mt-0.5 truncate">{emp.role}</p>
                        </div>
                      </div>

                      {/* Department & Branch */}
                      <div className="col-span-3 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-sm font-medium">
                          <Briefcase className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                          <span className="truncate">{emp.dept}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-foreground text-xs font-medium pl-[22px]">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                          <span className="truncate">{emp.branch}</span>
                        </div>

                    <div className="flex items-center gap-1.5 pl-[22px] mt-2 flex-wrap pb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" title="Annual Leave">AL {getLeaveBreakdown(emp.id).AL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50" title="Unpaid Leave">UL {getLeaveBreakdown(emp.id).UL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50" title="Replacement Leave">RL {getLeaveBreakdown(emp.id).RL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50" title="Medical Leave">MC {getLeaveBreakdown(emp.id).MC}</span>
                    </div>
                      </div>

                      {/* Leave Taken */}
                      <div className="col-span-3 pr-4">
                        <div className="flex justify-between items-baseline mb-1.5">
                          <div>
                            <span className={`text-base font-black ${takenColor}`}>{emp.taken}</span>
                            <span className="text-xs font-semibold text-foreground"> / {emp.total} days</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${Math.min(100, percent)}%` }}></div>
                        </div>
                      </div>

                      {/* Balance Left */}
                      <div className="col-span-2 flex items-center justify-between pl-4">
                        <div className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl ${badgeColor}`}>
                          <span className="text-lg font-black leading-none">{left}</span>
                          <span className="text-[10px] font-bold">days left</span>
                        </div>
                        <button 
                          onClick={() => onEmployeeClick ? onEmployeeClick(emp.id) : navigate('/employees')}
                          className="text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {idx < data.length - 1 && <hr className="border-slate-50 dark:border-slate-800 my-1 mx-2" />}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        ) : (
          /* Grid Variant */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {data.map((emp, idx) => {
              const percent = emp.total > 0 ? Math.round((emp.taken / emp.total) * 100) : 0;
              const left = Math.max(0, emp.total - emp.taken);
              const initials = getInitials(emp.name);
              const { progressColor, badgeColor, takenColor, avatarColor, iconColor } = getColors(percent, idx);

              return (
                <div key={emp.id || idx} onClick={() => onEmployeeClick ? onEmployeeClick(emp.id) : navigate('/employees')} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group flex flex-col bg-slate-50/60 dark:bg-slate-900/60 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">{emp.name}</h3>
                        <p className="text-xs text-foreground font-medium truncate">{emp.role}</p>
                      </div>
                    </div>
                    <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl flex-shrink-0 ${badgeColor}`}>
                      <span className="text-sm font-black leading-none">{left}</span>
                      <span className="text-[9px] font-bold mt-0.5">days left</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-4 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      <Briefcase className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
                      <span className="truncate">{emp.dept}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground text-[11px] font-medium pl-5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-foreground" />
                      <span className="truncate">{emp.branch}</span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-[22px] mt-2 flex-wrap pb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" title="Annual Leave">AL {getLeaveBreakdown(emp.id).AL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50" title="Unpaid Leave">UL {getLeaveBreakdown(emp.id).UL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50" title="Replacement Leave">RL {getLeaveBreakdown(emp.id).RL}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50" title="Medical Leave">MC {getLeaveBreakdown(emp.id).MC}</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <div>
                        <span className={`text-sm font-black ${takenColor}`}>{emp.taken}</span>
                        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider ml-1">Taken of {emp.total}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${Math.min(100, percent)}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Monitor leave balance to ensure smooth workforce planning.</p>
              <p className="text-xs text-foreground font-medium mt-0.5">Employees with low balance may need support or reallocation.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/employees')}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
            View All Employees
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};
