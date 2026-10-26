import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Plus, Edit, Clock, Layers, Coffee, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { WorkSchedule, WorkScheduleDay, CompanyDepartment, CompanyBranch } from '../../../types/multiCompany.types';

export const Tab6_WorkScheduleMgmt: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [saving, setSaving] = useState(false);

  // 7-day timings
  const [daysState, setDaysState] = useState<WorkScheduleDay[]>([
    { day_of_week: 'Monday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
    { day_of_week: 'Tuesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
    { day_of_week: 'Wednesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
    { day_of_week: 'Thursday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
    { day_of_week: 'Friday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
    { day_of_week: 'Saturday', start_time: null, end_time: null, is_working_day: false },
    { day_of_week: 'Sunday', start_time: null, end_time: null, is_working_day: false }
  ]);

  // Break timings
  const [lunchStart, setLunchStart] = useState('12:30');
  const [lunchEnd, setLunchEnd] = useState('14:00');

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  const loadSchedules = async (cId: number) => {
    try {
      setLoading(true);
      const [sRes, dRes, bRes] = await Promise.all([
        multiCompanyApi.getCompanyWorkSchedules(cId),
        multiCompanyApi.getCompanyDepartments(cId),
        multiCompanyApi.getCompanyBranches(cId)
      ]);
      setSchedules(sRes);
      setDepartments(dRes);
      setBranches(bRes);
    } catch (err) {
      console.error('Failed to load work schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedules(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleDayToggle = (index: number) => {
    const updated = [...daysState];
    updated[index].is_working_day = !updated[index].is_working_day;
    if (updated[index].is_working_day && !updated[index].start_time) {
      updated[index].start_time = '08:30:00';
      updated[index].end_time = '17:30:00';
    }
    setDaysState(updated);
  };

  const handleTimeChange = (index: number, field: 'start_time' | 'end_time', val: string) => {
    const updated = [...daysState];
    updated[index][field] = val ? `${val}:00` : null;
    setDaysState(updated);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName.trim()) {
      toast.error('Schedule name is required');
      return;
    }

    try {
      setSaving(true);
      await multiCompanyApi.createWorkSchedule(selectedCompanyId, {
        schedule_name: scheduleName.trim(),
        department_id: selectedDept === 'ALL' ? null : selectedDept,
        branch_id: selectedBranch === 'ALL' ? null : selectedBranch,
        days: daysState,
        breaks: [
          {
            break_name: 'Lunch Break',
            break_type: 'lunch',
            start_time: `${lunchStart}:00`,
            end_time: `${lunchEnd}:00`
          }
        ]
      });

      toast.success(`Schedule "${scheduleName}" created successfully!`);
      setModalOpen(false);
      setScheduleName('');
      await loadSchedules(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Error creating schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <CalendarClock className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Work Schedule Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-black text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {companies.find(c => c.id === selectedCompanyId)?.company_name ? `${companies.find(c => c.id === selectedCompanyId)?.company_name} (${companies.find(c => c.id === selectedCompanyId)?.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Rayhar Travels (Main Company)'}
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

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Work Schedule
        </Button>
      </div>

      {/* Priority Engine Info Banner */}
      <div className="p-3.5 bg-[#942392]/5 dark:bg-[#942392]/10 rounded-xl border border-[#942392]/20 flex items-start gap-3 text-xs">
        <div className="p-1 rounded-md bg-[#942392] text-white shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3" />
        </div>
        <div className="space-y-1">
          <span className="font-black text-[#942392] dark:text-[#f885d5] uppercase tracking-wider block">
            4-Tier Schedule Resolution Engine
          </span>
          <p className="text-muted-foreground dark:text-neutral-300 text-[11px] leading-relaxed">
            Attendance lateness and check-in thresholds evaluate strictly in hierarchy:
            <strong className="text-foreground mx-1">1. Employee Personal Override</strong> →
            <strong className="text-foreground mx-1">2. Department Schedule</strong> →
            <strong className="text-foreground mx-1">3. Branch Schedule</strong> →
            <strong className="text-foreground mx-1">4. Company Default</strong>.
          </p>
        </div>
      </div>

      {/* Schedules Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading work schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <CalendarClock className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-medium">
              No schedules created yet for {companies.find(c => c.id === selectedCompanyId)?.company_name}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Schedule Name</th>
                  <th className="px-4 py-3">Scope Tier</th>
                  <th className="px-4 py-3">Target Scope</th>
                  <th className="px-4 py-3">Core Hours</th>
                  <th className="px-4 py-3">Break Timing</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {schedules.map((s) => {
                  const mon = s.days?.find(d => d.day_of_week === 'Monday');
                  const hoursStr = mon?.is_working_day ? `${mon.start_time?.slice(0, 5)} - ${mon.end_time?.slice(0, 5)}` : 'Varies / Off';
                  const breakItem = s.breaks?.[0];
                  const breakStr = breakItem ? `${breakItem.start_time?.slice(0, 5)} - ${breakItem.end_time?.slice(0, 5)}` : 'None';

                  const isDept = Boolean(s.department_id);
                  const isBranch = Boolean(s.branch_id);
                  const isDefault = !isDept && !isBranch;

                  return (
                    <tr key={s.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground dark:text-neutral-200">
                        {s.schedule_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isDefault ? 'bg-[#942392]/10 text-[#942392]' : 'bg-muted text-foreground'
                        }`}>
                          {isDefault ? 'Company Default (Tier 4)' : isDept ? 'Department (Tier 2)' : 'Branch (Tier 3)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {isDept ? s.department_id : isBranch ? s.branch_id : 'All Departments & Branches'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {hoursStr}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {breakStr}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Work Schedule Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleCreateSchedule} className="flex flex-col h-full max-h-[88vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 shrink-0 bg-card dark:bg-neutral-900">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#942392]" />
                  Create Work Schedule Timetable
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Schedule Name *</Label>
              <Input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g. Marketing Shift, Depot Early Timetable"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Department Assignment</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-bold">All Departments (Company-wide)</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.name} value={d.name} className="text-xs">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Branch Assignment</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-bold">All Branches</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.code} value={b.code} className="text-xs">{b.name} ({b.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 7-Day Timetable Grid */}
            <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block">
                7-Day Monday through Sunday Timetable
              </Label>

              <div className="space-y-2">
                {daysState.map((d, idx) => (
                  <div key={d.day_of_week} className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg bg-background dark:bg-neutral-900 border border-border/40">
                    <div className="w-24 font-bold text-foreground">
                      {d.day_of_week}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase">Work Day:</span>
                      <Switch
                        checked={d.is_working_day}
                        onCheckedChange={() => handleDayToggle(idx)}
                        className="data-[state=checked]:bg-[#942392]"
                      />
                    </div>

                    {d.is_working_day ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={d.start_time?.slice(0, 5) || '08:30'}
                          onChange={(e) => handleTimeChange(idx, 'start_time', e.target.value)}
                          className="text-xs h-7 w-24 text-center font-mono"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={d.end_time?.slice(0, 5) || '17:30'}
                          onChange={(e) => handleTimeChange(idx, 'end_time', e.target.value)}
                          className="text-xs h-7 w-24 text-center font-mono"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-muted-foreground px-4 py-1 rounded bg-muted">
                        Weekend / Off Day
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Break Configuration */}
            <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-2">
              <div className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-[#942392]" />
                <Label className="text-xs font-bold text-foreground">
                  Lunch Break Window (Excluded from Net Hours)
                </Label>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="text-xs h-8 w-28 text-center font-mono"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="text-xs h-8 w-28 text-center font-mono"
                />
                <span className="text-[10px] text-muted-foreground ml-2">(Default: 12:30 PM - 02:00 PM)</span>
              </div>
            </div>

            </div>

            <div className="px-6 py-3 bg-muted/30 dark:bg-neutral-800/40 border-t border-border/40 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="h-8 text-xs font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !scheduleName.trim()}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase h-8 px-4 rounded-xl shadow-xs"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Save Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
