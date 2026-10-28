import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  MapPin, 
  Camera, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  SlidersHorizontal, 
  CalendarClock,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { WorkSchedule, WorkScheduleDay } from '../../../types/multiCompany.types';
import { CustomTimePicker } from '@/components/ui/custom-time-picker';

export const Tab7_AttendanceConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);

  // Attendance Policy Parameters
  const [lateThreshold, setLateThreshold] = useState<number>(30);
  const [earlyCheckout, setEarlyCheckout] = useState<number>(0);
  const [minHours, setMinHours] = useState<number>(8.0);
  const [otEnabled, setOtEnabled] = useState<boolean>(false);
  const [gpsRequired, setGpsRequired] = useState<boolean>(true);
  const [geofenceEnforce, setGeofenceEnforce] = useState<'strict' | 'relaxed' | 'disabled'>('strict');
  const [faceVerify, setFaceVerify] = useState<boolean>(false);
  const [ruleVersion, setRuleVersion] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Work Schedules and Simulation State
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [testClockInTime, setTestClockInTime] = useState<string>('');
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  useEffect(() => {
    if (activeCompany) {
      setSelectedCompanyId(activeCompany.id);
    } else if (companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [activeCompany, companies]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [res, schedRes] = await Promise.all([
          multiCompanyApi.getAttendanceSettings(selectedCompanyId),
          multiCompanyApi.getCompanyWorkSchedules(selectedCompanyId)
        ]);

        if (res) {
          setLateThreshold(res.late_threshold_minutes ?? 30);
          setEarlyCheckout(res.early_checkout_minutes ?? 0);
          setMinHours(res.min_working_hours ?? 8.0);
          setOtEnabled(Boolean(res.overtime_enabled));
          setGpsRequired(res.gps_required !== false);
          setGeofenceEnforce(res.geofence_enforcement || 'strict');
          setFaceVerify(Boolean(res.face_verification_required));
          setRuleVersion(res.calculation_rule_version || 1);
        }
        setSchedules(schedRes || []);
      } catch (err) {
        console.error('Error loading attendance settings & schedules:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchSettings();
  }, [selectedCompanyId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await multiCompanyApi.saveAttendanceSettings(selectedCompanyId, {
        late_threshold_minutes: Number(lateThreshold),
        early_checkout_minutes: Number(earlyCheckout),
        min_working_hours: Number(minHours),
        overtime_enabled: otEnabled,
        gps_required: gpsRequired,
        geofence_enforcement: geofenceEnforce,
        face_verification_required: faceVerify
      });

      // Synchronize back
      const res = await multiCompanyApi.getAttendanceSettings(selectedCompanyId);
      if (res) {
        setLateThreshold(res.late_threshold_minutes ?? 30);
        setRuleVersion(res.calculation_rule_version || 1);
      }
      toast.success("Attendance configurations deployed & synchronized across entire system!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance settings");
    } finally {
      setSaving(false);
    }
  };

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  const SHORT_DAY: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };

  // Helper functions for time conversions
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 8 * 60 + 30;
    const [h, m] = timeStr.split(':').map(Number);
    return (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 30 : m);
  };

  const formatMinutesTo12Hr = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    let h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  const formatMinutesTo24Hr = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const safeGrace = Math.max(0, Number(lateThreshold) || 0);

  // Active schedule and working hours for the selected company
  const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
  const days = activeSchedule?.days || [];
  const daysMap = new Map(days.map((d) => [d.day_of_week, d]));
  const fri = daysMap.get('Friday');
  const isFridayOff = fri && !fri.is_working_day;

  const dayOrder: Array<WorkScheduleDay['day_of_week']> = isFridayOff
    ? ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const workingDays = dayOrder
    .map((name) => daysMap.get(name))
    .filter((d): d is WorkScheduleDay => Boolean(d && d.is_working_day && d.start_time));

  // Group consecutive working days with identical start_time and end_time
  const rawGroups: Array<{
    startDay: string;
    endDay: string;
    startTimeRaw: string;
    endTimeRaw: string;
  }> = [];

  for (const d of workingDays) {
    const sRaw = (d.start_time || '08:30').slice(0, 5);
    const eRaw = (d.end_time || '17:30').slice(0, 5);
    const prev = rawGroups[rawGroups.length - 1];
    if (prev && prev.startTimeRaw === sRaw && prev.endTimeRaw === eRaw) {
      prev.endDay = d.day_of_week;
    } else {
      rawGroups.push({
        startDay: d.day_of_week,
        endDay: d.day_of_week,
        startTimeRaw: sRaw,
        endTimeRaw: eRaw,
      });
    }
  }

  // Fallback if no working days defined
  if (rawGroups.length === 0) {
    rawGroups.push({
      startDay: 'Monday',
      endDay: 'Friday',
      startTimeRaw: '08:30',
      endTimeRaw: '17:30',
    });
  }

  const dayGroups = rawGroups.map((g, idx) => {
    const dayLabel = g.startDay === g.endDay
      ? SHORT_DAY[g.startDay] || g.startDay
      : `${SHORT_DAY[g.startDay] || g.startDay}–${SHORT_DAY[g.endDay] || g.endDay}`;

    const startMinutes = parseTimeToMinutes(g.startTimeRaw);
    const cutoffMinutes = startMinutes + safeGrace;
    const workingHourDisplay = formatMinutesTo12Hr(startMinutes);
    const graceCutoffDisplay = formatMinutesTo12Hr(cutoffMinutes);

    const onTimeExampleMinutes = startMinutes + Math.min(10, Math.max(5, Math.floor(safeGrace / 2)));
    const onTimeExampleDisplay = formatMinutesTo12Hr(onTimeExampleMinutes);

    const lateExampleMinutes = cutoffMinutes + 5;
    const lateExampleDisplay = formatMinutesTo12Hr(lateExampleMinutes);
    const lateExampleDiff = Math.max(1, lateExampleMinutes - startMinutes);

    return {
      id: `${g.startDay}-${g.endDay}-${g.startTimeRaw}-${idx}`,
      dayLabel,
      timeRange: `${g.startTimeRaw} - ${g.endTimeRaw}`,
      startTimeRaw: g.startTimeRaw,
      endTimeRaw: g.endTimeRaw,
      startMinutes,
      cutoffMinutes,
      workingHourDisplay,
      graceCutoffDisplay,
      onTimeExampleMinutes,
      onTimeExampleDisplay,
      lateExampleMinutes,
      lateExampleDisplay,
      lateExampleDiff,
    };
  });

  const hasDifferentStartTimes = rawGroups.length > 1 && new Set(rawGroups.map(g => g.startTimeRaw)).size > 1;

  // Active group selected for simulation tester
  const activeGroup = dayGroups[selectedGroupIndex] || dayGroups[0];

  // Dynamic interactive simulation tester
  const activeTestTime24 = testClockInTime || formatMinutesTo24Hr(activeGroup.lateExampleMinutes);
  const testMinutesTotal = parseTimeToMinutes(activeTestTime24);
  const testIsLate = testMinutesTotal > activeGroup.cutoffMinutes;
  const testMinutesPastCutoff = Math.max(0, testMinutesTotal - activeGroup.cutoffMinutes);
  const testTotalMinutesLate = Math.max(0, testMinutesTotal - activeGroup.startMinutes);

  return (
    <div className="space-y-6">
      {/* Top Filter: Attendance Policy Scope */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
          Attendance Policy Scope:
        </span>
        <Select 
          value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
          onValueChange={(val) => {
            setSelectedCompanyId(parseInt(val, 10));
            setTestClockInTime('');
            setSelectedGroupIndex(0);
          }}
        >
          <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white shadow-xs">
            <SelectValue placeholder="Select company...">
              {currentCompany ? `${currentCompany.company_name} (${currentCompany.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Rayhar Travels (Main Company)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {companies.length > 0 ? (
              companies.map(c => (
                <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                  {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="1" className="text-xs font-bold">
                Rayhar Travels (Main Company)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* TOP PROMINENT CARD: DEFAULT LATE ARRIVAL WINDOW (GRACE PERIOD) */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
            Default Late Arrival Window (Grace Period)
          </h3>
          <p className="text-xs text-muted-foreground dark:text-neutral-400">
            Define the permissible grace period duration before an employee clock-in is officially flagged as "Present (Late)" for <strong className="text-foreground">{currentCompany?.company_name}</strong>. This policy is uniformly enforced throughout all dashboards, workforce reports, exports, and attendance calculations following the date adjusted.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-1">
          {/* Left Column: Grace input & schedule context */}
          <div className="lg:col-span-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Grace Window (Minutes)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(Math.max(0, Number(e.target.value)))}
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-28 font-semibold text-center text-black dark:text-white placeholder:font-normal"
                />
                <span className="text-xs font-bold text-muted-foreground">minutes</span>
              </div>
            </div>

            {/* Timetable context */}
            <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-neutral-800/30 border border-border/50 text-[11px] space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Active Company Timetable
              </span>
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-bold text-foreground truncate max-w-[150px]">{activeSchedule?.schedule_name || 'Standard Timetable'}</span>
              </div>
              {hasDifferentStartTimes ? (
                <div className="space-y-1 pt-1.5 border-t border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Shift Starts by Day:
                  </span>
                  {dayGroups.map((g, idx) => (
                    <div 
                      key={g.id} 
                      onClick={() => {
                        setSelectedGroupIndex(idx);
                        setTestClockInTime(formatMinutesTo24Hr(g.lateExampleMinutes));
                      }}
                      className={`flex items-center justify-between font-medium text-[10px] px-1.5 py-1 rounded cursor-pointer transition-colors ${
                        selectedGroupIndex === idx 
                          ? 'bg-[#942392]/10 font-bold text-[#942392] dark:text-[#f885d5] border border-[#942392]/30' 
                          : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className="font-bold text-foreground">{g.dayLabel}:</span>
                      <span className="font-mono">
                        <span className="text-[#942392] dark:text-[#f885d5] font-bold">{g.workingHourDisplay}</span>
                        <span className="text-muted-foreground"> (Cutoff: {g.graceCutoffDisplay})</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">Shift Starts:</span>
                    <span className="font-mono font-bold text-[#942392] dark:text-[#f885d5]">{dayGroups[0]?.workingHourDisplay || '08:30 AM'}</span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">Grace Cutoff:</span>
                    <span className="font-mono font-bold text-foreground">{dayGroups[0]?.graceCutoffDisplay || '09:00 AM'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Live Dynamic Rule Simulation & Simulator */}
          <div className="lg:col-span-8 p-3.5 bg-muted/40 dark:bg-neutral-800/40 rounded-xl border border-border/60 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-black tracking-wider text-[#942392] dark:text-[#f885d5]">
                Live Rule Simulation (Dynamic)
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-background/80 dark:bg-neutral-900/80 px-2 py-0.5 rounded-md border border-border/40">
                Calculated from {currentCompany?.company_name}
              </span>
            </div>

            {/* Formula / Simulation Rules */}
            {hasDifferentStartTimes ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-0.5">
                  <span className="font-semibold text-foreground">
                    Day-Specific Working Hours & Cutoffs ({dayGroups.length} shifts):
                  </span>
                  <span className="text-[10px] text-[#942392] dark:text-[#f885d5] font-bold">
                    Click a shift to simulate below
                  </span>
                </div>
                <div className="space-y-2">
                  {dayGroups.map((group, idx) => {
                    const isSelected = selectedGroupIndex === idx;
                    return (
                      <div
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupIndex(idx);
                          setTestClockInTime(formatMinutesTo24Hr(group.lateExampleMinutes));
                        }}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-background dark:bg-neutral-900 border-[#942392] shadow-xs ring-1 ring-[#942392]/30'
                            : 'bg-background/60 dark:bg-neutral-900/60 border-border/50 hover:border-border hover:bg-background'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono text-[11px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-extrabold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-[#942392] text-white shadow-2xs'
                                : 'bg-muted text-muted-foreground border border-border/60'
                            }`}>
                              {group.dayLabel}
                            </span>
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Working Hour: </span>
                              <strong className="text-foreground font-black">{group.workingHourDisplay}</strong>
                              <span className="text-muted-foreground text-[10px]"> ({group.timeRange})</span>
                              <span className="text-muted-foreground"> + Grace: </span>
                              <strong className="text-[#942392] dark:text-[#f885d5] font-black">{safeGrace} mins</strong>
                              <span className="text-muted-foreground"> → Deadline: </span>
                              <strong className="text-foreground font-black">{group.graceCutoffDisplay}</strong>
                            </span>
                          </div>

                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-sans font-bold text-[#942392] dark:text-[#f885d5] bg-[#942392]/10 dark:bg-[#942392]/20 px-2 py-0.5 rounded-full border border-[#942392]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#942392] animate-pulse" />
                              Active in Simulator
                            </span>
                          )}
                        </div>

                        <div className="text-muted-foreground text-[10px] pt-1.5 font-mono pl-1">
                          Clock-in at <strong className="text-foreground">{group.onTimeExampleDisplay}</strong> → <span className="text-emerald-600 dark:text-emerald-400 font-bold">Present (On Time)</span>
                          <span className="mx-2 text-border">|</span>
                          At <strong className="text-foreground">{group.lateExampleDisplay}</strong> → <span className="text-rose-600 dark:text-rose-400 font-bold">Present (Late) ({group.lateExampleDiff}m)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-[11px] p-2.5 rounded-lg bg-background dark:bg-neutral-900 border border-border/40 space-y-1 font-mono">
                <div className="text-foreground">
                  <span className="text-muted-foreground">Working Hour: </span>
                  <strong className="text-foreground font-black">{dayGroups[0].workingHourDisplay}</strong>
                  <span className="text-muted-foreground"> + Grace: </span>
                  <strong className="text-[#942392] dark:text-[#f885d5] font-black">{safeGrace} mins</strong>
                  <span className="text-muted-foreground"> → Deadline: </span>
                  <strong className="text-foreground font-black">{dayGroups[0].graceCutoffDisplay}</strong>
                </div>
                <div className="text-muted-foreground text-[10px] pt-0.5">
                  Clock-in at <strong className="text-foreground">{dayGroups[0].onTimeExampleDisplay}</strong> → <span className="text-emerald-600 dark:text-emerald-400 font-bold">Present (On Time)</span>
                  <span className="mx-2 text-border">|</span>
                  At <strong className="text-foreground">{dayGroups[0].lateExampleDisplay}</strong> → <span className="text-rose-600 dark:text-rose-400 font-bold">Present (Late) ({dayGroups[0].lateExampleDiff}m)</span>
                </div>
              </div>
            )}

            {/* Interactive Clock-In Simulator */}
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Test a Clock-In Time:
                  </span>
                  {hasDifferentStartTimes && (
                    <div className="inline-flex rounded-lg border border-border/60 p-0.5 bg-background dark:bg-neutral-900">
                      {dayGroups.map((group, idx) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedGroupIndex(idx);
                            setTestClockInTime(formatMinutesTo24Hr(group.lateExampleMinutes));
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            selectedGroupIndex === idx
                              ? 'bg-[#942392] text-white shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {group.dayLabel} ({group.workingHourDisplay})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(activeGroup.onTimeExampleMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {activeGroup.onTimeExampleDisplay}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(activeGroup.cutoffMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {activeGroup.graceCutoffDisplay}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(activeGroup.lateExampleMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {activeGroup.lateExampleDisplay}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-background/80 dark:bg-neutral-900/80 border border-border/50">
                <div className="w-28 shrink-0">
                  <CustomTimePicker
                    value={activeTestTime24}
                    onChange={(val) => setTestClockInTime(val)}
                    className="h-7 text-xs px-2 w-full font-mono font-medium"
                  />
                </div>
                <div className="flex-1 flex items-center justify-between text-xs">
                  {testIsLate ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-2xs">
                        Present (Late)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Exceeds grace cutoff by <strong className="text-rose-600 dark:text-rose-400 font-bold">{testMinutesPastCutoff}m</strong> ({testTotalMinutesLate} mins late total{hasDifferentStartTimes ? ` for ${activeGroup.dayLabel} shift` : ''})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-2xs">
                        Present (On Time)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Within permissible {safeGrace} min grace cutoff of {activeGroup.graceCutoffDisplay}{hasDifferentStartTimes ? ` (${activeGroup.dayLabel} shift)` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* TWO-COLUMN GRID: TIME BOUNDARIES & GPS GEOFENCING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Time Parameters */}
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
              Time Boundaries & Overtime Rules
            </h4>
            <p className="text-[11px] text-muted-foreground">Thresholds for calculating early departures and minimum shift completion.</p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Synchronized Late Arrival Window Indicator */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Late Arrival Window</Label>
                <span className="text-[10px] text-muted-foreground block">Governed by Default Grace Period above</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded bg-[#942392]/10 text-[#942392] font-mono font-bold text-xs">
                  {safeGrace} mins
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Early Checkout Threshold</Label>
                <span className="text-[10px] text-muted-foreground block">Permissible early departure allowance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={earlyCheckout}
                  onChange={(e) => setEarlyCheckout(Number(e.target.value))}
                  className="w-20 text-xs h-8 text-center font-semibold placeholder:font-normal text-black dark:text-white"
                />
                <span className="text-xs font-bold text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Minimum Daily Working Hours</Label>
                <span className="text-[10px] text-muted-foreground block">Hours required for full-day attendance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  step="0.5"
                  value={minHours}
                  onChange={(e) => setMinHours(Number(e.target.value))}
                  className="w-20 text-xs h-8 text-center font-semibold placeholder:font-normal text-black dark:text-white"
                />
                <span className="text-xs font-bold text-muted-foreground">hrs</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Overtime (OT) Automatic Calculation</Label>
                <span className="text-[10px] text-muted-foreground block">Track hours logged beyond schedule end time</span>
              </div>
              <Switch checked={otEnabled} onCheckedChange={setOtEnabled} className="data-[state=checked]:bg-[#942392]" />
            </div>
          </div>
        </Card>

        {/* Card 2: GPS Geofencing & Biometrics */}
        <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
              GPS Geofencing & Biometric Validation
            </h4>
            <p className="text-[11px] text-muted-foreground">Enforce physical branch boundary checks and camera capture.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Require GPS Location Capture</Label>
                <span className="text-[10px] text-muted-foreground block">Mandatory location permission on device</span>
              </div>
              <Switch checked={gpsRequired} onCheckedChange={setGpsRequired} className="data-[state=checked]:bg-[#942392]" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Geofence Enforcement Strictness</Label>
              <Select value={geofenceEnforce} onValueChange={(val: any) => setGeofenceEnforce(val)}>
                <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                  <SelectValue placeholder="Strictness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict" className="text-xs font-bold">
                    Strict (Reject clock-in if outside radius threshold)
                  </SelectItem>
                  <SelectItem value="relaxed" className="text-xs">
                    Relaxed (Allow check-in but flag with warning badge)
                  </SelectItem>
                  <SelectItem value="disabled" className="text-xs text-rose-500 font-bold">
                    Disabled (Allow anywhere check-in)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  Biometric Face Snapshot Verification
                </Label>
                <span className="text-[10px] text-muted-foreground block">Take selfie verification upon check-in</span>
              </div>
              <Switch checked={faceVerify} onCheckedChange={setFaceVerify} className="data-[state=checked]:bg-[#942392]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Deploy Attendance Configurations
        </Button>
      </div>
    </div>
  );
};
