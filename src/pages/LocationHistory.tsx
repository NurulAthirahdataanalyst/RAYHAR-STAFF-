import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { MonthPicker } from "@/components/shared/MonthPicker";
import PageActions from "@/components/layout/PageActions";

const HISTORY_LIMIT = 50;

export default function LocationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchHistory = async (page: number, append = false) => {
    if (!user?.user_id) return;
    setHistoryLoading(true);
    try {
      const monthStr = selectedMonthStr;
      const res = await fetch(`${API_BASE_URL}/api/employee-location-history?userId=${encodeURIComponent(user.user_id)}&page=${page}&limit=${HISTORY_LIMIT}&month=${monthStr}`);
      const data = await res.json();
      if (data.success) {
        setHistory(prev => append ? [...prev, ...data.history] : data.history);
        setHistoryTotal(data.total);
        setHasMoreHistory(data.hasMore);
        setNextPage(page + 1);
      }
    } catch (err) {
      console.error("Failed to fetch location history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [user, selectedMonthStr]);

  const handleLoadMore = () => {
    fetchHistory(nextPage, true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-background">
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          <PageActions>
  <div className="flex items-center gap-3">
    <MonthPicker monthYear={selectedMonthStr} onSelectMonthYear={setSelectedMonthStr} />
  </div>
</PageActions>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-4">Date &amp; Time</TableHead>
                    <TableHead className="py-4">Coordinate (Latitude, Longitude)</TableHead>
                    <TableHead className="py-4">Branch</TableHead>
                    <TableHead className="py-4">Distance from Branch</TableHead>
                    <TableHead className="py-4">Location Status</TableHead>
                    <TableHead className="py-4">Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {historyLoading && history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading history...</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No location history found for {selectedMonthStr}</TableCell></TableRow>
                  ) : (
                    history.map((h, i) => {
                      const branchName = h.branch || user?.branch || "HQ";
                      const distance = h.distance ?? null;
                      
                      let statusText = "ON-SITE";
                      let statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
                      let dotColor = "bg-emerald-500";
                      
                      if (h.is_outstation) {
                        statusText = "OUTSTATION";
                        statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
                        dotColor = "bg-blue-500";
                      } else if (h.is_leave) {
                        statusText = `ON LEAVE (${h.leave_type || 'Unknown'})`;
                        statusColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
                        dotColor = "bg-purple-500";
                      } else if (h.is_temporary) {
                        statusText = `TEMP: ${h.temp_branch}`;
                        statusColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400";
                        dotColor = "bg-indigo-500";
                      } else if (distance !== null && distance > 300) {
                        statusText = "OFF-SITE";
                        statusColor = "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400";
                        dotColor = "bg-rose-500";
                      }
                      
                      return (
                        <TableRow key={`${h.timestamp}-${i}`} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="py-4 font-medium text-foreground whitespace-nowrap">
                            {new Date(h.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                          </TableCell>
                          <TableCell className="py-4 font-mono text-xs">
                            {h.lat && h.lng ? `${Number(h.lat).toFixed(6)}, ${Number(h.lng).toFixed(6)}` : 'N/A'}
                          </TableCell>
                          <TableCell className="py-4 text-sm font-medium">{branchName}</TableCell>
                          <TableCell className="py-4 text-sm">
                            {distance !== null ? `${distance} m` : 'N/A'}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {statusText}
                              {h.is_update && (
  <span className="opacity-70 ml-1 border-l border-current pl-1.5">
    UPDATED
  </span>
)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
  {h.attendance_status ? (() => {
    const statusColors: Record<string, string> = {
      'Clock In': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
      'Clock Out': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      'Replacement Leave': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
      'Outstation': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
    };
    const dotColors: Record<string, string> = {
      'Clock In': 'bg-blue-500', 'Clock Out': 'bg-indigo-500',
      'Replacement Leave': 'bg-amber-500', 'Outstation': 'bg-purple-500',
    };
    const cls = statusColors[h.attendance_status] || 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-500/30';
    const dot = dotColors[h.attendance_status] || 'bg-teal-500';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${cls}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {h.attendance_status}
      </span>
    );
  })() : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Footer with Load More */}
            <div className="bg-muted/30 border-t border-border p-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {history.length} of {historyTotal.toLocaleString()} records
              </div>
              <Button 
                onClick={handleLoadMore} 
                disabled={!hasMoreHistory || historyLoading}
                variant="outline"
                size="sm"
                className="font-bold text-xs"
              >
                {historyLoading && history.length > 0 ? "Loading..." : hasMoreHistory ? "LOAD MORE" : "All records loaded"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
