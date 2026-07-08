import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../config/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine
} from "recharts";
import { Flame, Info, Trophy, Briefcase, CalendarCheck2, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

// Types
interface EmployeeAnalyticsViewProps {
  userId: string;
  userName: string;
  month: string;
  year: string;
  myLogs: any[];
  leaveRequests: any[];
}

const COLORS = ['#16A34A', '#3b82f6', '#EAB308', '#DC2626', '#8b5cf6'];

const getLocalDateString = (dVal: any) => {
  if (!dVal) return "";
  if (typeof dVal === 'string') {
    return dVal.slice(0, 10);
  }
  const d = new Date(dVal);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function EmployeeAnalyticsView({ userId, userName, month, year, myLogs: rawMyLogs, leaveRequests }: EmployeeAnalyticsViewProps) {
  const [rankData, setRankData] = useState<{ rank: number | null, total: number, score: number }>({ rank: null, total: 0, score: 0 });
  const [lastMonthLogs, setLastMonthLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [companyLeaves, setCompanyLeaves] = useState<any[]>([]);
  const [outstations, setOutstations] = useState<any[]>([]);

  // Filter out any logs that were recorded on a Company Leave date
  const myLogs = useMemo(() => {
    return rawMyLogs.filter(log => {
      if (!log.clock_in) return true;
      const dateStr = getLocalDateString(log.clock_in);
      const isCompanyLeave = companyLeaves.some((cl: any) => {
        const startStr = getLocalDateString(cl.start_date);
        const endStr = getLocalDateString(cl.end_date);
        if (dateStr >= startStr && dateStr <= endStr) {
          if (cl.applies_to === 'all') return true;
          if (cl.applies_to === 'branch' && cl.branch_id) {
            return cl.branch_id.split(',').map((s: string) => s.trim()).includes(profile?.branch);
          }
          if (cl.applies_to === 'department' && cl.department_id) {
            const depts = cl.department_id.split(',').map((s: string) => s.trim());
            const normEmpDept = (profile?.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return depts.some((d: string) => {
              const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
              return normEmpDept === normClDept || profile?.department === d;
            });
          }
        }
        return false;
      });
      return !isCompanyLeave;
    });
  }, [rawMyLogs, companyLeaves, profile]);

  const processedLastMonthLogs = useMemo(() => {
    return lastMonthLogs.filter(log => {
      if (!log.clock_in) return true;
      const dateStr = getLocalDateString(log.clock_in);
      const isCompanyLeave = companyLeaves.some((cl: any) => {
        const startStr = getLocalDateString(cl.start_date);
        const endStr = getLocalDateString(cl.end_date);
        if (dateStr >= startStr && dateStr <= endStr) {
          if (cl.applies_to === 'all') return true;
          if (cl.applies_to === 'branch' && cl.branch_id) {
            return cl.branch_id.split(',').map((s: string) => s.trim()).includes(profile?.branch);
          }
          if (cl.applies_to === 'department' && cl.department_id) {
            const depts = cl.department_id.split(',').map((s: string) => s.trim());
            const normEmpDept = (profile?.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return depts.some((d: string) => {
              const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
              return normEmpDept === normClDept || profile?.department === d;
            });
          }
        }
        return false;
      });
      return !isCompanyLeave;
    });
  }, [lastMonthLogs, companyLeaves, profile]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/user-details/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.profile);
        }
      })
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/company-leaves`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCompanyLeaves(data.leaves || []);
        }
      })
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/outstation?role=employee&user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOutstations(data.assignments || []);
        }
      })
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/employee-rank?userId=${userId}&month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRankData({ rank: data.rank, total: data.total, score: data.score });
        }
      })
      .catch(console.error);
      
    // Fetch last month/year's logs for Attendance Rate comparison
    let prevM = "";
    let prevY = "";
    if (month === "all") {
      prevM = "all";
      prevY = String(parseInt(year) - 1);
    } else {
      const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
      prevM = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      prevY = String(prevMonthDate.getFullYear());
    }
    
    fetch(`${API_BASE_URL}/api/attendance/history?userId=${userId}&month=${prevM}&year=${prevY}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLastMonthLogs(data.history || []);
        }
      })
      .catch(console.error);
  }, [userId, month, year]);

  // Existing Calculations
  const approvedLeaves = leaveRequests.filter(l => l.status === "Approved");
  const annualLeavesUsed = approvedLeaves
    .filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);
  const sickLeavesUsed = approvedLeaves
    .filter(l => ['Cuti Sakit', 'Sick Leave'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);
  const emergencyLeavesUsed = approvedLeaves
    .filter(l => ['Kecemasan', 'Emergency'].includes(l.leave_type))
    .reduce((acc, curr) => acc + curr.days, 0);

  const totalLeavesUsed = annualLeavesUsed + sickLeavesUsed + emergencyLeavesUsed;
  
  const quotaLeavesUsed = leaveRequests
    .filter(l => l.status !== "Rejected")
    .filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave', 'Cuti Sakit', 'Sick Leave', 'Kecemasan', 'Emergency'].includes(l.leave_type))
    .reduce((acc, curr) => acc + Number(curr.days || 0), 0);
    
  const leaveBalanceRemaining = Math.max(14 - quotaLeavesUsed, 0);

  // Streak
  let streak = 0;
  let cur = 0;
  for (const log of [...myLogs].reverse()) {
    if (!log.is_late && log.status !== "LATE") {
      cur++;
    } else {
      if (streak === 0) streak = cur;
      cur = 0;
    }
  }
  if (streak === 0) streak = cur;

  // Calculate average work hours
  const parseDurationToHours = (durationStr: string) => {
    if (!durationStr || durationStr === "--h --m") return 0;
    const match = durationStr.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours + (minutes / 60);
    }
    return 0;
  };

  const logsWithDuration = myLogs.filter(l => l.duration && l.duration !== "--h --m");
  const totalHours = logsWithDuration.reduce((acc, curr) => acc + parseDurationToHours(curr.duration), 0);
  const avgWorkHours = logsWithDuration.length > 0 ? (totalHours / logsWithDuration.length) : 0;

  const lastMonthLogsWithDuration = processedLastMonthLogs.filter(l => l.duration && l.duration !== "--h --m");
  const lastMonthTotalHours = lastMonthLogsWithDuration.reduce((acc, curr) => acc + parseDurationToHours(curr.duration), 0);
  const lastMonthAvgWorkHours = lastMonthLogsWithDuration.length > 0 ? (lastMonthTotalHours / lastMonthLogsWithDuration.length) : 0;

  const workHoursTrend = useMemo(() => {
    const diff = avgWorkHours - lastMonthAvgWorkHours;
    return {
      diff: parseFloat(diff.toFixed(1)),
      hasPrevData: lastMonthLogsWithDuration.length > 0
    };
  }, [avgWorkHours, lastMonthAvgWorkHours, lastMonthLogsWithDuration.length]);

  // Monthly summary — count DISTINCT days where the employee is marked Present or LATE
  // Backend now returns status="Outstation" for outstation days, so they won't appear here
  const presentLogs = myLogs.filter(l => 
    l.status === 'Present' || l.status === 'LATE' || l.status === 'Late'
  );

  // Deduplicate by date string so multiple clock-ins on the same day count as 1
  const presentDaySet = new Set(presentLogs.map(l => {
    if (l.date) return l.date;
    const d = new Date(l.clock_in);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }));
  const presentDays = presentDaySet.size;
  const lateArrivals = presentLogs.filter(l => l.is_late === 1 || l.is_late === true || l.status === 'LATE' || l.status === 'Late').length;
  
  let daysInMonth = 0;
  let absentDays = 0;
  let leaveDaysCount = 0;
  let totalWorkingDaysPassed = 0;
  let companyLeaveDaysCount = 0;
  let outstationDaysCount = 0;
  
  // Also collect data for Calendar Heatmap
  const heatmapData: Record<number, 'Present (On Time)' | 'Present (Late)' | 'Absent' | 'On Leave' | 'Company Leave' | 'Outstation'> = {};

  if (month === "all") {
    const targetYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const maxMonth = (targetYear === currentYear) ? currentMonth : 12;

    for (let m = 1; m <= maxMonth; m++) {
      const daysInThisMonth = new Date(targetYear, m, 0).getDate();
      daysInMonth += daysInThisMonth;

      for (let d = 1; d <= daysInThisMonth; d++) {
        const date = new Date(targetYear, m - 1, d);
        const dayOfWeek = date.getDay();
        const isPastOrToday = date <= new Date();

        // Friday & Saturday are off days for the first week (days 1-7), Friday only for remaining weeks
        const isWeekendDay = (dayOfWeek === 5) || (dayOfWeek === 6 && d <= 7);

        if (!isWeekendDay) {
          const dateStr = `${targetYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let hasCompanyLeave = false;
          if (profile) {
            hasCompanyLeave = companyLeaves.some((cl: any) => {
              const startStr = getLocalDateString(cl.start_date);
              const endStr = getLocalDateString(cl.end_date);
              if (dateStr >= startStr && dateStr <= endStr) {
                if (cl.applies_to === 'all') return true;
                if (cl.applies_to === 'branch' && cl.branch_id) {
                  return cl.branch_id.split(',').map((s: string) => s.trim()).includes(profile.branch);
                }
                if (cl.applies_to === 'department' && cl.department_id) {
                  const depts = cl.department_id.split(',').map((s: string) => s.trim());
                  const normEmpDept = (profile.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
                  return depts.some((d: string) => {
                    const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
                    return normEmpDept === normClDept || profile.department === d;
                  });
                }
              }
              return false;
            });
          }

          const logsOnDay = myLogs.filter(l => {
            if (!l.clock_in) return false;
            const clockDate = new Date(l.clock_in);
            const y = clockDate.getFullYear();
            const mo = String(clockDate.getMonth() + 1).padStart(2, '0');
            const day = String(clockDate.getDate()).padStart(2, '0');
            return `${y}-${mo}-${day}` === dateStr;
          });
          
          const hasLeave = approvedLeaves.some(l => {
            const startStr = getLocalDateString(l.start_date);
            const endStr = getLocalDateString(l.end_date);
            return dateStr >= startStr && dateStr <= endStr;
          });

          const hasOutstation = outstations.some(o => {
            const startStr = getLocalDateString(o.start_date);
            const endStr = getLocalDateString(o.end_date);
            return dateStr >= startStr && dateStr <= endStr && o.status !== 'Cancelled';
          });

          if (hasOutstation) {
            if (isPastOrToday) totalWorkingDaysPassed++;
            outstationDaysCount++;
          } else if (logsOnDay.length > 0) {
            if (isPastOrToday) totalWorkingDaysPassed++;
            // Present
          } else if (hasLeave) {
            if (isPastOrToday) totalWorkingDaysPassed++;
            leaveDaysCount++;
          } else if (hasCompanyLeave) {
            companyLeaveDaysCount++;
            // Exclude from working days count
          } else if (isPastOrToday) {
            totalWorkingDaysPassed++;
            absentDays++;
          }
        }
      }
    }
  } else {
    daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(parseInt(year), parseInt(month) - 1, d);
      const dayOfWeek = date.getDay();
      // For past months: ALL days are past. For current month: only today/before is past.
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const selectedMonthInt = parseInt(month);
      const selectedYearInt = parseInt(year);
      const currentMonthInt = today.getMonth() + 1;
      const currentYearInt = today.getFullYear();
      const isPastOrToday = (selectedYearInt < currentYearInt) ||
        (selectedYearInt === currentYearInt && selectedMonthInt < currentMonthInt) ||
        (selectedYearInt === currentYearInt && selectedMonthInt === currentMonthInt && date <= today);
      
      const isWeekendDay = (dayOfWeek === 5) || (dayOfWeek === 6 && d <= 7);
      
      if (!isWeekendDay) { // Working day
        const dateStr = `${year}-${month.padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let hasCompanyLeave = false;
        if (profile) {
          hasCompanyLeave = companyLeaves.some((cl: any) => {
            const startStr = getLocalDateString(cl.start_date);
            const endStr = getLocalDateString(cl.end_date);
            if (dateStr >= startStr && dateStr <= endStr) {
              if (cl.applies_to === 'all') return true;
              if (cl.applies_to === 'branch' && cl.branch_id) {
                return cl.branch_id.split(',').map((s: string) => s.trim()).includes(profile.branch);
              }
              if (cl.applies_to === 'department' && cl.department_id) {
                const depts = cl.department_id.split(',').map((s: string) => s.trim());
                const normEmpDept = (profile.department || '').toLowerCase().replace(/\bdepartment\b/g, '').trim();
                return depts.some((d: string) => {
                  const normClDept = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
                  return normEmpDept === normClDept || profile.department === d;
                });
              }
            }
            return false;
          });
        }

        const logsOnDay = myLogs.filter(l => {
          if (!l.clock_in) return false;
          // Use the date string directly if available, otherwise derive from clock_in
          if (l.date) return l.date === dateStr;
          const clockDate = new Date(l.clock_in);
          const y = clockDate.getFullYear();
          const m = String(clockDate.getMonth() + 1).padStart(2, '0');
          const day = String(clockDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}` === dateStr;
        });
        const hasLeave = approvedLeaves.some(l => {
          const startStr = getLocalDateString(l.start_date);
          const endStr = getLocalDateString(l.end_date);
          return dateStr >= startStr && dateStr <= endStr;
        });

        const hasOutstation = outstations.some(o => {
          const startStr = getLocalDateString(o.start_date);
          const endStr = getLocalDateString(o.end_date);
          return dateStr >= startStr && dateStr <= endStr && o.status !== 'Cancelled';
        });

        if (hasOutstation) {
          if (isPastOrToday) totalWorkingDaysPassed++;
          outstationDaysCount++;
          heatmapData[d] = 'Outstation';
        } else if (logsOnDay.length > 0) {
          if (isPastOrToday) totalWorkingDaysPassed++;
          const att = logsOnDay[0];
          const isLateLog = att.is_late === 1 || att.is_late === true || att.status === "LATE";
          if (isLateLog) {
            heatmapData[d] = 'Present (Late)';
          } else {
            heatmapData[d] = 'Present (On Time)';
          }
        } else if (hasLeave) {
          if (isPastOrToday) totalWorkingDaysPassed++;
          leaveDaysCount++;
          heatmapData[d] = 'On Leave';
        } else if (hasCompanyLeave) {
          companyLeaveDaysCount++;
          heatmapData[d] = 'Company Leave';
        } else if (isPastOrToday) {
          totalWorkingDaysPassed++;
          absentDays++;
          heatmapData[d] = 'Absent';
        }
      }
    }
  }

  // Attendance Rate calculation
  const calcRate = (present: number, late: number, workingDays: number) => {
    if (workingDays === 0) return 0;
    return Math.min(100, Math.round(((present + late) / workingDays) * 100));
  };
  
  const attendanceRate = calcRate(presentDays - lateArrivals + outstationDaysCount, lateArrivals, totalWorkingDaysPassed);
  
  // Last month/year rate
  let prevWorkingDaysPassed = 0;
  if (month === "all") {
    const prevYearInt = parseInt(year) - 1;
    for (let m = 1; m <= 12; m++) {
      const prevDaysInMonth = new Date(prevYearInt, m, 0).getDate();
      for (let d = 1; d <= prevDaysInMonth; d++) {
         const date = new Date(prevYearInt, m - 1, d);
         const dayOfWeek = date.getDay();
         const isWeekendDay = (dayOfWeek === 5) || (dayOfWeek === 6 && d <= 7);
         if (!isWeekendDay) prevWorkingDaysPassed++;
      }
    }
  } else {
    const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevDaysInMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= prevDaysInMonth; d++) {
       const date = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), d);
       const dayOfWeek = date.getDay();
       const isWeekendDay = (dayOfWeek === 5) || (dayOfWeek === 6 && d <= 7);
       if (date <= new Date() && !isWeekendDay) prevWorkingDaysPassed++;
    }
  }
  const prevPresentLogs = processedLastMonthLogs.filter(l => l.clock_in != null && (l.status === 'Present' || l.status === 'LATE' || l.status === 'Late'));
  const prevPresentDays = prevPresentLogs.length;
  const prevLateArrivals = prevPresentLogs.filter(l => l.is_late === 1 || l.is_late === true || l.status === 'LATE' || l.status === 'Late').length;
  const prevAttendanceRate = calcRate(prevPresentDays - prevLateArrivals, prevLateArrivals, prevWorkingDaysPassed);
  
  const rateDiff = attendanceRate - prevAttendanceRate;

  // Leave Utilization
  const selectedMonthIndex = month === "all" ? 0 : parseInt(month) - 1;
  const monthNameFull = month === "all" ? "ALL MONTHS" : new Date(parseInt(year), selectedMonthIndex).toLocaleString('default', { month: 'long' }).toUpperCase();
  const mLeaves = approvedLeaves.filter(l => {
    const startStr = getLocalDateString(l.start_date);
    if (!startStr) return false;
    const [y, m] = startStr.split("-");
    if (month === "all") {
      return parseInt(y) === parseInt(year);
    }
    return parseInt(y) === parseInt(year) && parseInt(m) === (selectedMonthIndex + 1);
  });
  const monthAnn = mLeaves.filter(l => ['Cuti Tahunan', 'Annual/Emergency Leave'].includes(l.leave_type)).length;
  const monthSck = mLeaves.filter(l => ['Cuti Sakit', 'Sick Leave'].includes(l.leave_type)).length;
  const monthEmg = mLeaves.filter(l => ['Kecemasan', 'Emergency'].includes(l.leave_type)).length;
  
  const monthPieData = [
    { name: 'Annual Leave', value: monthAnn, color: "#16A34A" },
    { name: 'Sick Leave', value: monthSck, color: "#EAB308" },
    { name: 'Emergency Leave', value: monthEmg, color: "#DC2626" },
  ].filter(d => d.value > 0);

  // Clock in analysis (New logic)
  let totalTimeMs = 0;
  let earliest = "23:59:59";
  let latest = "00:00:00";
  const timeBuckets: Record<string, number> = {};
  
  // For Line Chart
  const trendData: any[] = [];
  
  let validClockIns = 0;

  myLogs.forEach(l => {
    if (l.clock_in) {
       const origTime = new Date(l.clock_in);
       if (isNaN(origTime.getTime())) return;
       
       validClockIns++;
       const klTime = new Date(origTime.getTime() + 8 * 60 * 60 * 1000);
       const timeMs = klTime.getTime() % (24 * 60 * 60 * 1000);
       totalTimeMs += timeMs;
       
       const timeStr = klTime.toISOString().split("T")[1];
       if (timeStr < earliest) earliest = timeStr;
       if (timeStr > latest) latest = timeStr;
       
       // Round to nearest 15 mins for mode calculation
       let hr = klTime.getUTCHours();
       let min = klTime.getUTCMinutes();
       min = Math.round(min / 15) * 15;
       if (min === 60) {
         hr += 1;
         min = 0;
       }
       const bucket = `${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
       timeBuckets[bucket] = (timeBuckets[bucket] || 0) + 1;
       
       const logMonthStr = klTime.toLocaleString('default', { month: 'short' });
       trendData.push({
         day: klTime.getUTCDate(), // day of month
         timestamp: klTime.getTime(),
         dayStr: month === "all" ? `${klTime.getUTCDate()} ${logMonthStr}` : `${klTime.getUTCDate()} ${monthNameFull.slice(0,3)}`,
         timeValue: klTime.getUTCHours() + (klTime.getUTCMinutes() / 60) // decimal hours for charting
       });
    }
  });
  
  // Sort trendData
  if (month === "all") {
    trendData.sort((a, b) => a.timestamp - b.timestamp);
  } else {
    trendData.sort((a, b) => a.day - b.day);
  }

  const formatTime = (tStr: string) => {
    if (!tStr || tStr === "23:59:59" || tStr === "00:00:00") return "--:--";
    const [h, m] = tStr.split(":");
    let hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    hr = hr % 12 || 12;
    return `${hr.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  let avgFmt = "--:-- AM";
  let avgDecimal = 0;
  if (validClockIns > 0) {
    const avgMs = totalTimeMs / validClockIns;
    const hr = Math.floor(avgMs / (60 * 60 * 1000));
    const min = Math.floor((avgMs % (60 * 60 * 1000)) / (60 * 1000));
    avgFmt = formatTime(`${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
    avgDecimal = hr + (min / 60);
  }
  
  let mostCommonBucket = "";
  let maxCount = 0;
  Object.entries(timeBuckets).forEach(([bucket, count]) => {
    if (count > maxCount || (count === maxCount && bucket < mostCommonBucket)) {
      maxCount = count;
      mostCommonBucket = bucket;
    }
  });
  const mostCommonTime = mostCommonBucket ? formatTime(mostCommonBucket + ":00") : "--:-- AM";
  const onTimePercentage = presentDays > 0 ? Math.round(((presentDays - lateArrivals) / presentDays) * 100) : 0;

  // Format YAxis ticks for Trend Chart
  const formatYAxis = (decimalHour: number) => {
    const hr = Math.floor(decimalHour);
    const min = Math.round((decimalHour - hr) * 60);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  // ----------------------------------------
  // Performance Score Breakdown Calculation
  // ----------------------------------------
  // Attendance Rate: out of 40
  const scoreAttendance = Math.round((attendanceRate / 100) * 40);
  // Punctuality: out of 30
  const scorePunctuality = Math.round((onTimePercentage / 100) * 30);
  // Absence Record: out of 20 (deduct 5 for each absent day)
  const scoreAbsence = Math.max(0, 20 - (absentDays * 5));
  // Leave Compliance: out of 10 (0 if > 14 days, otherwise 10)
  const scoreLeave = totalLeavesUsed <= 14 ? 10 : 0;
  
  const overallScore = scoreAttendance + scorePunctuality + scoreAbsence + scoreLeave;

  // Heatmap Calendar Generator (Sunday start)
  let calendarDays: any[] = [];
  let firstDay = 0;
  let offset = 0;
  let heatmapPrevDaysInMonth = 0;

  if (month !== "all") {
    firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
    offset = firstDay; 
    heatmapPrevDaysInMonth = new Date(parseInt(year), parseInt(month) - 1, 0).getDate();
    
    // Add previous month faded days
    for(let i = offset - 1; i >= 0; i--) {
        calendarDays.push({ day: heatmapPrevDaysInMonth - i, isCurrent: false });
    }
    // Add current month days
    for(let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, isCurrent: true });
    }
    // Add next month faded days to complete the grid (up to 42 cells total)
    const remainingCells = 42 - calendarDays.length;
    for(let i = 1; i <= remainingCells; i++) {
        calendarDays.push({ day: i, isCurrent: false });
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* ROW 1: Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Attendance Rate */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#7B0099]/10 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="w-6 h-6 text-[#7B0099]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ATTENDANCE RATE</span>
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{attendanceRate}%</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {processedLastMonthLogs.length > 0 && rateDiff !== 0 ? (
                  <>
                    {rateDiff > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                    <span className={`text-[10px] font-bold ${rateDiff > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {Math.abs(rateDiff)}% {month === "all" ? "from last year" : "from last month"}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground">-- {month === "all" ? "from last year" : "from last month"}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Work Hours */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AVERAGE WORK HOURS</span>
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{avgWorkHours.toFixed(1)}</span>
                <span className="text-sm font-bold text-foreground ml-1">hrs</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {workHoursTrend.hasPrevData && workHoursTrend.diff !== 0 ? (
                  <>
                    {workHoursTrend.diff > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                    <span className={`text-[10px] font-bold ${workHoursTrend.diff > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {workHoursTrend.diff > 0 ? `+${workHoursTrend.diff}` : workHoursTrend.diff} hrs {month === "all" ? "from last year" : "from last month"}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground">-- {month === "all" ? "from last year" : "from last month"}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">LEAVE BALANCE</span>
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{leaveBalanceRemaining}</span>
                <span className="text-sm font-bold text-muted-foreground">/ 14</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Days Remaining</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rank */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-blue-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ATTENDANCE RANK</span>
                <Info className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">#{rankData.rank || '-'}</span>
                <span className="text-sm font-bold text-muted-foreground">of {rankData.total || '-'}</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                {rankData.total ? `Top ${Math.max(1, Math.round((rankData.rank! / rankData.total) * 100))}%` : 'Company Ranking'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Middle Section (Summary, Leave, Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Attendance Summary */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card h-full flex flex-col transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-4 flex-1 flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">ATTENDANCE SUMMARY ({monthNameFull})</h3>
            
            <div className="flex-1 flex flex-col justify-start">
              {/* Summary mini cards */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-border/20 rounded-2xl flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">WORKING DAYS</span>
                  <span className="text-sm font-black text-foreground mt-0.5">{totalWorkingDaysPassed} Days</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-border/20 rounded-2xl flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">PUNCTUALITY</span>
                  <span className="text-sm font-black text-foreground mt-0.5">
                    {presentDays > 0 ? Math.round(((presentDays - lateArrivals) / presentDays) * 100) : 100}%
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Present (On Time)", value: presentDays - lateArrivals, color: "bg-emerald-500" },
                  { label: "Present (Late)", value: lateArrivals, color: "bg-amber-400" },
                  { label: "Outstation", value: outstationDaysCount, color: "bg-pink-500" },
                  { label: "On Leave", value: leaveDaysCount, color: "bg-blue-500" },
                  { label: "Company Leave", value: companyLeaveDaysCount, color: "bg-purple-500" },
                  { label: "Absent", value: absentDays, color: "bg-rose-500" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-14 shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all duration-1000`} 
                        style={{ width: `${daysInMonth > 0 ? (item.value / daysInMonth) * 100 : 0}%` }} 
                      />
                    </div>
                    <div className="w-16 text-right shrink-0">
                      <span className="text-xs font-black">{item.value}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({daysInMonth > 0 ? Math.round((item.value / daysInMonth) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Axis marks at the bottom of the bars */}
              <div className="mt-3 flex justify-between px-[64px] text-[10px] font-bold text-muted-foreground/50">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Utilization (PIE CHART - AS REQUESTED) */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card h-full flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">LEAVE UTILIZATION ({monthNameFull})</h3>
            
            {/* Summary mini cards */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-border/20 rounded-2xl flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">APPROVED LEAVES</span>
                <span className="text-sm font-black text-foreground mt-0.5">{mLeaves.length} {mLeaves.length === 1 ? 'Request' : 'Requests'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-border/20 rounded-2xl flex flex-col">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">REMAINING BALANCE</span>
                <span className="text-sm font-black text-foreground mt-0.5">{leaveBalanceRemaining} Days</span>
              </div>
            </div>

            {monthPieData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 my-auto">
                <Briefcase className="w-10 h-10 mb-2 text-muted-foreground" />
                <p className="text-sm font-bold text-muted-foreground">{month === "all" ? "No leaves applied this year" : "No leaves applied this month"}</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center my-auto">
                <div className="w-[112px] h-[112px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={monthPieData} 
                        innerRadius={40} 
                        outerRadius={55} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                        cornerRadius={4}
                      >
                        {monthPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-6 flex-1 space-y-2.5">
                  {monthPieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-foreground">{d.name}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{d.value} {d.value === 1 ? 'Request' : 'Requests'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Calendar */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-5 h-full flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">ATTENDANCE CALENDAR ({monthNameFull} {year})</h3>
             </div>
             
             {month === "all" ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                 <CalendarCheck2 className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                 <p className="text-xs font-bold text-muted-foreground max-w-[200px]">
                   Daily calendar view is not available for all months combined.
                 </p>
                 <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[220px]">
                   Please select a specific month from the dropdown at the top to view the daily attendance grid.
                 </p>
               </div>
             ) : (
               <>
                 <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                       <div key={i} className="text-[9px] font-black text-muted-foreground uppercase">{day}</div>
                    ))}
                 </div>
                 
                 <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 content-start">
                    {calendarDays.map((cell, i) => {
                      // Friday & Saturday are off days for the first week (days 1-7), Friday only for remaining weeks
                      const isWeekend = (i % 7 === 5) || (i % 7 === 6 && cell.day <= 7);
                      let status = cell.isCurrent ? heatmapData[cell.day] : null;
                      
                      let bgColor = "bg-transparent";
                      let textColor = cell.isCurrent ? "text-foreground" : "text-muted-foreground/30";
                      
                      if (cell.isCurrent) {
                        if (status === 'Present (On Time)') bgColor = "bg-emerald-500 text-white";
                        else if (status === 'Present (Late)') bgColor = "bg-amber-400 text-white";
                        else if (status === 'Absent') bgColor = "bg-rose-500 text-white";
                        else if (status === 'On Leave') bgColor = "bg-blue-500 text-white";
                        else if (status === 'Company Leave') bgColor = "bg-purple-500 text-white";
                        else if (status === 'Outstation') bgColor = "bg-pink-500 text-white";
                        else if (isWeekend) bgColor = "bg-muted/30"; // weekend empty
                      }
                      
                      return (
                        <div 
                          key={i} 
                          className={`aspect-square rounded-[6px] flex items-center justify-center text-[10px] font-bold ${bgColor} ${textColor} ${status ? 'hover:scale-110 cursor-default transition-all shadow-sm' : ''}`}
                          title={status ? `${cell.day} ${monthNameFull}: ${status}` : ''}
                        >
                          {cell.day}
                        </div>
                      );
                    })}
                 </div>
                 
                 <div className="flex flex-wrap items-center justify-center gap-3 mt-auto pt-4 border-t border-border/40">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[9px] font-bold text-muted-foreground">Present (On Time)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400" /><span className="text-[9px] font-bold text-muted-foreground">Present (Late)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-pink-500" /><span className="text-[9px] font-bold text-muted-foreground">Outstation</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /><span className="text-[9px] font-bold text-muted-foreground">Approved Leave</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" /><span className="text-[9px] font-bold text-muted-foreground">Company Leave</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500" /><span className="text-[9px] font-bold text-muted-foreground">Absent</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-muted/30" /><span className="text-[9px] font-bold text-muted-foreground">Weekend</span></div>
                 </div>
               </>
             )}
          </CardContent>
        </Card>
      </div>
      
      {/* ROW 3: Bottom Section (Clock In, Trend, Score) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Clock In Analysis */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-5 h-full flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-4">
              <Clock className="w-3.5 h-3.5 text-[#7B0099]" /> CLOCK-IN ANALYSIS
            </h3>
            
            <div className="mb-6">
              <p className="text-3xl font-black text-foreground">{avgFmt}</p>
              <p className="text-xs font-bold text-muted-foreground">Average Clock In</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
               <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 text-center">
                 <p className="text-[9px] font-bold text-muted-foreground mb-1">On Time</p>
                 <p className="text-sm font-black text-emerald-600">{onTimePercentage}%</p>
                 <p className="text-[8px] text-emerald-600/70 font-bold">↑ {attendanceRate > 0 ? "Good" : "-"}</p>
               </div>
               <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 text-center">
                 <p className="text-[9px] font-bold text-muted-foreground mb-1">Late Arrivals</p>
                 <p className="text-sm font-black text-rose-600">{lateArrivals}</p>
                 <p className="text-[8px] text-rose-600/70 font-bold">↓ {lateArrivals > 0 ? "Needs Focus" : "-"}</p>
               </div>
               <div className="bg-muted/20 border border-border/50 rounded-xl p-2.5 text-center flex flex-col justify-center">
                 <p className="text-[9px] font-bold text-muted-foreground mb-1">Earliest</p>
                 <p className="text-[11px] font-black">{formatTime(earliest)}</p>
               </div>
               <div className="bg-muted/20 border border-border/50 rounded-xl p-2.5 text-center flex flex-col justify-center">
                 <p className="text-[9px] font-bold text-muted-foreground mb-1">Latest</p>
                 <p className="text-[11px] font-black">{formatTime(latest)}</p>
               </div>
            </div>
            
            <div className="mt-auto text-[10px] font-bold text-muted-foreground">
              Most common clock-in time: <span className="text-foreground">{mostCommonTime}</span>
            </div>
          </CardContent>
        </Card>

        {/* Punctuality Trend Line Chart */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-5 h-full flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-6">PUNCTUALITY TREND ({monthNameFull})</h3>
            
            {trendData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <Flame className="w-10 h-10 mb-2 text-muted-foreground" />
                <p className="text-sm font-bold text-muted-foreground">No data points yet</p>
              </div>
            ) : (
              <div className="h-[180px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                      dataKey="dayStr" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                      minTickGap={20}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tickFormatter={formatYAxis}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatYAxis(value), 'Clock In']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
                    />
                    {/* Average Reference Line */}
                    <ReferenceLine y={avgDecimal} stroke="#8b5cf6" strokeDasharray="3 3" opacity={0.5} label={{ position: 'right', value: 'Avg', fill: '#8b5cf6', fontSize: 10 }} />
                    <Line 
                      type="monotone" 
                      dataKey="timeValue" 
                      stroke="#8b5cf6" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} 
                      activeDot={{ r: 5 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Score Breakdown */}
        <Card className="rounded-[20px] border border-border/50 shadow-sm bg-white dark:bg-card transition-all duration-200 hover:shadow-md hover:border-border">
          <CardContent className="p-5 h-full flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">ATTENDANCE SCORE BREAKDOWN</h3>
            
            <div className="flex items-center flex-1">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-[120px] h-[120px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: overallScore, fill: "#6366f1" }, { value: 100 - overallScore, fill: "rgba(0,0,0,0.05)" }]}
                        innerRadius={45}
                        outerRadius={55}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-foreground leading-none">{overallScore}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="mt-1">
                   <span className={`whitespace-nowrap text-[10px] font-bold px-3 py-1 rounded-md ${overallScore >= 90 ? 'bg-emerald-500/10 text-emerald-600' : overallScore >= 75 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
                     {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : 'Needs Work'}
                   </span>
                </div>
              </div>
              
              <div className="ml-8 flex-1 space-y-3">
                {[
                  { label: "Attendance Rate", score: scoreAttendance, total: 40, color: "bg-emerald-500" },
                  { label: "Punctuality", score: scorePunctuality, total: 30, color: "bg-blue-500" },
                  { label: "Absence Record", score: scoreAbsence, total: 20, color: "bg-amber-400" },
                  { label: "Leave Compliance", score: scoreLeave, total: 10, color: "bg-purple-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-black text-foreground">{item.score} <span className="text-muted-foreground font-medium">/ {item.total}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
