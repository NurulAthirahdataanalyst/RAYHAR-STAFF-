import { useState, useEffect } from "react";
import { History, TrendingUp, TrendingDown, ChevronRight, ClipboardEdit, RotateCcw, BadgePlus, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHistoryLogs, EntitlementHistoryLog } from "@/lib/entitlementHistory";

// ─── Badge config ─────────────────────────────────────────────────────────────
export const ACTION_BADGE: Record<string, { bg: string; text: string; dot: string; label: string; border: string }> = {
  'Initial Allocation':    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Initial Allocation', border: 'border-emerald-200' },
  'Carry Forward':         { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Carry Forward',       border: 'border-blue-200'    },
  'Manual Adjustment':     { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Manual Adjustment',   border: 'border-purple-200'  },
  'Additional Allocation': { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Additional',          border: 'border-orange-200'  },
  'Deduction':             { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Deduction',           border: 'border-rose-200'    },
  'Rollback':              { bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400',   label: 'Rollback',            border: 'border-slate-200'   },
  'Special Leave':         { bg: 'bg-pink-50',    text: 'text-pink-700',    dot: 'bg-pink-500',    label: 'Special Leave',       border: 'border-pink-200'    },
  'Maternity Leave':       { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500', label: 'Maternity',           border: 'border-fuchsia-200' },
  'OT Conversion':         { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500',    label: 'OT Conversion',       border: 'border-teal-200'    },
  'Policy Update':         { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'Policy Update',       border: 'border-indigo-200'  },
};
const DEFAULT_BADGE = { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Other', border: 'border-slate-200' };

export function getBadge(actionType: string) {
  return ACTION_BADGE[actionType] || DEFAULT_BADGE;
}

export function formatRelativeDate(dateStr: string, timeStr?: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const suffix = timeStr ? ` • ${timeStr}` : '';
  if (dateStr === today) return `Today${suffix}`;
  if (dateStr === yest)  return `Yesterday${suffix}`;
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString('en-MY', { month: 'short' })}${suffix}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onViewHistory: () => void;
}

export default function EntitlementActivityCard({ onViewHistory }: Props) {
  const [logs, setLogs] = useState<EntitlementHistoryLog[]>([]);

  const reload = () => setLogs(getHistoryLogs());

  useEffect(() => {
    reload();
    window.addEventListener('entitlementHistoryUpdated', reload);
    return () => window.removeEventListener('entitlementHistoryUpdated', reload);
  }, []);

  // Month calculations
  const now     = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const thisMonthLogs = logs.filter(l => l.date.startsWith(thisMonth));
  const prevMonthLogs = logs.filter(l => l.date.startsWith(prevMonth));

  const totalThis = thisMonthLogs.length;
  const totalPrev = prevMonthLogs.length;
  const totalTrend = totalPrev > 0 ? Math.round(((totalThis - totalPrev) / totalPrev) * 100) : 0;

  function count(list: EntitlementHistoryLog[], type: string) {
    return list.filter(l => l.action_type === type).length;
  }
  function trend(cur: number, prev: number): number {
    return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
  }

  const kpis = [
    {
      label: 'Manual Adjustments', icon: ClipboardEdit,
      val:   count(thisMonthLogs, 'Manual Adjustment'),
      trend: trend(count(thisMonthLogs, 'Manual Adjustment'), count(prevMonthLogs, 'Manual Adjustment')),
      color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500', border: 'border-purple-100',
    },
    {
      label: 'Carry Forward', icon: RotateCcw,
      val:   count(thisMonthLogs, 'Carry Forward'),
      trend: trend(count(thisMonthLogs, 'Carry Forward'), count(prevMonthLogs, 'Carry Forward')),
      color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-100',
    },
    {
      label: 'Additional Allocation', icon: BadgePlus,
      val:   count(thisMonthLogs, 'Additional Allocation'),
      trend: trend(count(thisMonthLogs, 'Additional Allocation'), count(prevMonthLogs, 'Additional Allocation')),
      color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', border: 'border-orange-100',
    },
    {
      label: 'Deductions', icon: MinusCircle,
      val:   count(thisMonthLogs, 'Deduction'),
      trend: trend(count(thisMonthLogs, 'Deduction'), count(prevMonthLogs, 'Deduction')),
      color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500', border: 'border-rose-100',
    },
  ];

  const recent = logs.slice(0, 7);

  return (
    <Card className="border-border/60 bg-card/77 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <History className="w-5 h-5 text-[#7B0099]" />
              Leave Entitlement Activity
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Latest entitlement changes made by HR and the system.
            </CardDescription>
          </div>
          <Button
            variant="ghost" size="sm"
            className="text-[11px] text-[#7B0099] hover:text-[#7B0099] hover:bg-[#7B0099]/5 h-7 px-2 shrink-0"
            onClick={onViewHistory}
          >
            View Full History <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Primary KPI */}
        <div className="mt-4 flex items-end gap-3">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Changes (This Month)
            </p>
            <p className="text-4xl font-black text-foreground mt-0.5 leading-none">{totalThis}</p>
          </div>
          {totalPrev > 0 && (
            <div className={`flex items-center gap-1 text-xs font-bold mb-1 ${totalTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalTrend >= 0
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(totalTrend)}% vs last month
            </div>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={`${k.bg} ${k.border} border rounded-xl p-2.5 flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3 h-3 ${k.color}`} />
                  <p className={`text-[9px] font-black uppercase tracking-wider ${k.color} leading-tight`}>
                    {k.label}
                  </p>
                </div>
                <p className={`text-2xl font-black ${k.color} leading-none`}>{k.val}</p>
                <p className={`text-[9px] font-semibold ${k.trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {k.trend >= 0 ? '▲' : '▼'} {Math.abs(k.trend)}% vs last month
                </p>
              </div>
            );
          })}
        </div>
      </CardHeader>

      {/* Recent activity feed */}
      <CardContent className="p-0 flex-1">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <History className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs font-medium">No activity yet.</p>
            <p className="text-[10px] mt-0.5 text-center px-4">
              Perform an allocation or adjustment to see records here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recent.map((log, i) => {
              const badge = getBadge(log.action_type);
              const isPositive = log.adjustment >= 0;
              return (
                <div
                  key={log.history_id || i}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-default"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${badge.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">{log.employee_name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{log.leave_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{log.adjustment} Days
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeDate(log.date, log.time)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">By {log.performed_by}</span>
                    </div>
                    {log.reason && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{log.reason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {logs.length > 7 && (
          <div className="p-3 border-t border-border/40 text-center">
            <Button
              variant="ghost" size="sm"
              className="text-[11px] text-[#7B0099] hover:text-[#7B0099] h-7"
              onClick={onViewHistory}
            >
              View all {logs.length} records →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
