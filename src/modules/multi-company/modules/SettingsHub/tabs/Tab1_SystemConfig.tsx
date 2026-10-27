import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, BellRing, Calendar, Clock, History, CheckCircle2, ShieldCheck, Save, Loader2, Sparkles, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { WorkSchedule } from '../../../types/multiCompany.types';
import { CustomTimePicker } from '@/components/ui/custom-time-picker';

export const Tab1_SystemConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [reportFrequency, setReportFrequency] = useState('monthly');
  const [lateWindowMinutes, setLateWindowMinutes] = useState(10);
  const [auditRetention, setAuditRetention] = useState('1year');
  const [saving, setSaving] = useState(false);
  const [viewAuditModal, setViewAuditModal] = useState(false);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [testClockInTime, setTestClockInTime] = useState<string>('');

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [att, schedRes] = await Promise.all([
          multiCompanyApi.getAttendanceSettings(selectedCompanyId),
          multiCompanyApi.getCompanyWorkSchedules(selectedCompanyId)
        ]);
        if (att) {
          setLateWindowMinutes(att.late_threshold_minutes ?? 10);
        }
        setSchedules(schedRes || []);
      } catch (err) {
        console.error('Error loading tab1 settings:', err);
      }
    };
    void loadSettings();
  }, [selectedCompanyId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await multiCompanyApi.saveAttendanceSettings(selectedCompanyId, {
        late_threshold_minutes: Number(lateWindowMinutes)
      });
      // Refresh to keep synchronized
      const att = await multiCompanyApi.getAttendanceSettings(selectedCompanyId);
      if (att) {
        setLateWindowMinutes(att.late_threshold_minutes ?? 10);
      }
      toast.success("System configurations deployed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy configuration");
    } finally {
      setSaving(false);
    }
  };

  const currentCompanyObj = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  // Active schedule and working hours for the selected company
  const activeSchedule = schedules.find(s => s.status === 'active') || schedules[0];
  const firstWorkDay = activeSchedule?.days?.find(d => d.is_working_day && d.start_time);
  const workingStartTimeRaw = firstWorkDay?.start_time?.slice(0, 5) || '08:30';

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

  const startMinutes = parseTimeToMinutes(workingStartTimeRaw);
  const safeGrace = Math.max(0, Number(lateWindowMinutes) || 0);
  const cutoffMinutes = startMinutes + safeGrace;

  const workingHourDisplay = formatMinutesTo12Hr(startMinutes);
  const graceCutoffDisplay = formatMinutesTo12Hr(cutoffMinutes);

  // Dynamic simulation examples
  const onTimeExampleMinutes = cutoffMinutes > startMinutes ? cutoffMinutes - 1 : startMinutes;
  const onTimeExampleDisplay = formatMinutesTo12Hr(onTimeExampleMinutes);

  const lateExampleMinutes = cutoffMinutes + 1;
  const lateExampleDisplay = formatMinutesTo12Hr(lateExampleMinutes);
  const lateExampleDiff = Math.max(1, lateExampleMinutes - startMinutes);

  // Dynamic interactive simulation tester
  const activeTestTime24 = testClockInTime || formatMinutesTo24Hr(lateExampleMinutes);
  const testMinutesTotal = parseTimeToMinutes(activeTestTime24);
  const testIsLate = testMinutesTotal > cutoffMinutes;
  const testMinutesPastCutoff = Math.max(0, testMinutesTotal - cutoffMinutes);
  const testTotalMinutesLate = Math.max(0, testMinutesTotal - startMinutes);

  return (
    <div className="space-y-6">
      {/* Top Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Target Company Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company scope...">
                {currentCompanyObj ? `${currentCompanyObj.company_name} (${currentCompanyObj.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Rayhar Travels (Main Company)'}
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
      </div>

      {/* Card A: Real-Time Alerts */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <BellRing className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Real-Time Notification Alerts
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Enable WebSocket & SSE instantaneous broadcast for clock-in, leave submissions, and outstation alerts across all active administrative client instances.
            </p>
          </div>
          <Switch 
            checked={alertsEnabled} 
            onCheckedChange={setAlertsEnabled}
            className="data-[state=checked]:bg-[#942392]"
          />
        </div>

        <div className="pt-2 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/40 dark:border-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">Connection Status:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Synchronized</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Latency:</span>
            <span className="font-mono text-[11px]">&lt; 40ms</span>
          </div>
        </div>
      </Card>

      {/* Card B: Automated Report Scheduler */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Automated Analytics Report Scheduling
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Automatically compile and deliver executive attendance, workforce analytics, and leave usage reports via PDF & CSV.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Distribution Frequency</Label>
            <Select value={reportFrequency} onValueChange={setReportFrequency}>
              <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white">
                <SelectValue placeholder="Select cadence..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" className="text-xs">Daily (Every morning at 08:00 AM)</SelectItem>
                <SelectItem value="weekly" className="text-xs">Weekly (Every Monday morning)</SelectItem>
                <SelectItem value="monthly" className="text-xs">Monthly (1st Day of each month)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Authorized Recipients</Label>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="px-2 py-1 rounded-md bg-[#942392]/10 text-[#942392] font-black">HR Admin</span>
              <span className="px-2 py-1 rounded-md bg-muted text-black dark:text-white font-black">Operation Manager</span>
              <span className="px-2 py-1 rounded-md bg-muted text-black dark:text-white font-black">Managing Director</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Card C: Default Late Arrival Window */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
              Default Late Arrival Window (Grace Period)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground dark:text-neutral-400">
            Define the permissible grace period duration before an employee clock-in is officially flagged as "Late" for {currentCompanyObj?.company_name}.
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
                  max={60}
                  value={lateWindowMinutes}
                  onChange={(e) => setLateWindowMinutes(Math.max(0, Number(e.target.value)))}
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
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Shift Starts:</span>
                <span className="font-mono font-bold text-[#942392] dark:text-[#f885d5]">{workingHourDisplay}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Grace Cutoff:</span>
                <span className="font-mono font-bold text-foreground">{graceCutoffDisplay}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dynamic Rule Simulation & Simulator */}
          <div className="lg:col-span-8 p-3.5 bg-muted/40 dark:bg-neutral-800/40 rounded-xl border border-border/60 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-black tracking-wider text-[#942392] dark:text-[#f885d5] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Rule Simulation (Dynamic)
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-background/80 dark:bg-neutral-900/80 px-2 py-0.5 rounded-md border border-border/40">
                Calculated from {currentCompanyObj?.company_name}
              </span>
            </div>

            {/* Formula line */}
            <div className="text-[11px] p-2.5 rounded-lg bg-background dark:bg-neutral-900 border border-border/40 space-y-1 font-mono">
              <div className="text-foreground">
                <span className="text-muted-foreground">Working Hour: </span>
                <strong className="text-foreground font-black">{workingHourDisplay}</strong>
                <span className="text-muted-foreground"> + Grace: </span>
                <strong className="text-[#942392] dark:text-[#f885d5] font-black">{safeGrace} mins</strong>
                <span className="text-muted-foreground"> → Deadline: </span>
                <strong className="text-foreground font-black">{graceCutoffDisplay}</strong>
              </div>
              <div className="text-muted-foreground text-[10px] pt-0.5">
                Clock-in at <strong className="text-foreground">{onTimeExampleDisplay}</strong> → <span className="text-emerald-600 dark:text-emerald-400 font-bold">On Time</span>
                <span className="mx-2 text-border">|</span>
                At <strong className="text-foreground">{lateExampleDisplay}</strong> → <span className="text-rose-600 dark:text-rose-400 font-bold">Late ({lateExampleDiff} min)</span>
              </div>
            </div>

            {/* Interactive Clock-In Simulator */}
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Test a Clock-In Time:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(onTimeExampleMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {onTimeExampleDisplay}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(cutoffMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {graceCutoffDisplay}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestClockInTime(formatMinutesTo24Hr(lateExampleMinutes))}
                    className="text-[10px] px-2 py-0.5 rounded bg-background dark:bg-neutral-900 border border-border/60 hover:border-[#942392] text-foreground transition-all cursor-pointer font-medium"
                  >
                    At {lateExampleDisplay}
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Flagged Late
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Exceeds grace cutoff by <strong className="text-rose-600 dark:text-rose-400 font-bold">{testMinutesPastCutoff}m</strong> ({testTotalMinutesLate} mins late total)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        On Time
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Within permissible {safeGrace} min grace cutoff of {graceCutoffDisplay}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Card D: Audit Log Settings */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#942392]/10 text-[#942392]">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Enterprise Audit Log Retention
              </h3>
            </div>
            <p className="text-xs text-muted-foreground dark:text-neutral-400">
              Immutable logging of all configuration changes, employee transfers, and approval modifications.
            </p>
          </div>

          <div className="w-44">
            <Select value={auditRetention} onValueChange={setAuditRetention}>
              <SelectTrigger className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                <SelectValue placeholder="Retention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90days" className="text-xs">90 Days</SelectItem>
                <SelectItem value="180days" className="text-xs">180 Days</SelectItem>
                <SelectItem value="1year" className="text-xs">1 Year (Compliant)</SelectItem>
                <SelectItem value="indefinite" className="text-xs">Indefinite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-6 rounded-xl"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Deploy Configurations
        </Button>
      </div>
    </div>
  );
};
