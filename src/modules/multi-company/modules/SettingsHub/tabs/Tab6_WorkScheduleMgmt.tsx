import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CustomTimePicker } from '@/components/ui/custom-time-picker';
import { CalendarClock, Plus, Edit, Coffee, Check, Loader2, Sparkles, MapPin, Search, Building2, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { WorkSchedule, WorkScheduleDay, CompanyDepartment, CompanyBranch } from '../../../types/multiCompany.types';
import {
  normalizeZoneCode,
  formatZoneDisplayName,
  getScheduleBranchCodes,
  getZonePresetDays,
  formatScheduleCoreHoursSummary,
} from '@/utils/scheduleZoneUtils';
import { toProperCase } from '@/utils/branchUtils';

export const Tab6_WorkScheduleMgmt: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState('');
  const [operatingZoneMode, setOperatingZoneMode] = useState<string>('ZONE_A');
  const [customZoneCode, setCustomZoneCode] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const branchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [specialRules, setSpecialRules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    if (branchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [branchDropdownOpen]);

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
  const [lunchStart, setLunchStart] = useState('13:00');
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

  const filteredBranchesForModal = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const q = branchSearch.toLowerCase();
    return branches.filter(
      (b) =>
        b.code?.toLowerCase().includes(q) ||
        b.name?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q)
    );
  }, [branches, branchSearch]);

  // Dynamically collect all custom operating zones that exist across work schedules and branches
  const availableCustomZones = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      const z = normalizeZoneCode(s.operating_zone);
      if (z && z !== 'ZONE_A' && z !== 'ZONE_B' && z !== 'ALL' && z !== 'NONE') {
        set.add(z);
      }
    });
    branches.forEach((b) => {
      const z = normalizeZoneCode(b.operating_zone);
      if (z && z !== 'ZONE_A' && z !== 'ZONE_B' && z !== 'ALL' && z !== 'NONE') {
        set.add(z);
      }
    });
    if (customZoneCode && customZoneCode.trim()) {
      const cz = normalizeZoneCode(customZoneCode);
      if (cz && cz !== 'ZONE_A' && cz !== 'ZONE_B' && cz !== 'ALL' && cz !== 'NONE') {
        set.add(cz);
      }
    }
    return Array.from(set).sort();
  }, [schedules, branches, customZoneCode]);

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
    updated[index][field] = val ? (val.length === 5 ? `${val}:00` : val) : null;
    setDaysState(updated);
  };

  const toggleBranchTickbox = (code: string) => {
    const clean = code.toUpperCase();
    setSelectedBranches((prev) =>
      prev.includes(clean) ? prev.filter((c) => c !== clean) : [...prev, clean].sort()
    );
  };

  const handleSelectZoneBranches = (zoneCode: string) => {
    const normTarget = normalizeZoneCode(zoneCode);
    const matchingCodes = branches
      .filter((b) => normalizeZoneCode(b.operating_zone) === normTarget)
      .map((b) => b.code.toUpperCase())
      .sort();
    setSelectedBranches(matchingCodes);
  };

  const handleApplyZonePreset = (zoneCode: string) => {
    const preset = getZonePresetDays(zoneCode);
    setDaysState(preset.days);
    setSpecialRules(preset.specialRules);
    setLunchStart(preset.lunchStart);
    setLunchEnd(preset.lunchEnd);
    if (!editingScheduleId && (!scheduleName.trim() || scheduleName.startsWith('Standard Office Hours'))) {
      setScheduleName(preset.defaultName);
    }
    handleSelectZoneBranches(zoneCode);
  };

  const handleZoneSelectionChange = (val: string) => {
    setOperatingZoneMode(val);
    if (val === 'CUSTOM') {
      setCustomZoneCode('');
      return;
    }
    if (val === 'ZONE_A' || val === 'ZONE_B') {
      setCustomZoneCode('');
      if (!editingScheduleId) {
        handleApplyZonePreset(val);
      } else {
        handleSelectZoneBranches(val);
      }
    } else if (val !== 'NONE') {
      // Custom zone selected (e.g. OPERATING_ZONE_B)
      setCustomZoneCode(val);
      if (!editingScheduleId) {
        handleApplyZonePreset(val);
      } else {
        handleSelectZoneBranches(val);
      }
    } else {
      setCustomZoneCode('');
    }
  };

  const toggleSpecialRule = (ruleKey: string) => {
    setSpecialRules((prev) =>
      prev.includes(ruleKey) ? prev.filter((r) => r !== ruleKey) : [...prev, ruleKey]
    );
  };

  const handleOpenCreate = () => {
    setEditingScheduleId(null);
    let defaultZone = 'ZONE_A';
    if (branches.length > 0) {
      const branchZones = Array.from(new Set(branches.map((b) => normalizeZoneCode(b.operating_zone)).filter(Boolean)));
      if (branchZones.length === 1 && branchZones[0]) {
        defaultZone = branchZones[0];
      }
    }
    const preset = getZonePresetDays(defaultZone);
    setScheduleName(preset.defaultName);
    setOperatingZoneMode(defaultZone);
    setCustomZoneCode(defaultZone !== 'ZONE_A' && defaultZone !== 'ZONE_B' ? defaultZone : '');
    setSelectedDept('ALL');
    setBranchSearch('');
    setBranchDropdownOpen(false);
    const matchedBranchCodes = branches
      .filter((b) => normalizeZoneCode(b.operating_zone) === defaultZone)
      .map((b) => b.code.toUpperCase())
      .sort();
    setSelectedBranches(matchedBranchCodes.length > 0 ? matchedBranchCodes : branches.map((b) => b.code.toUpperCase()).sort());
    setLunchStart(preset.lunchStart);
    setLunchEnd(preset.lunchEnd);
    setDaysState(preset.days);
    setSpecialRules(preset.specialRules);
    setModalOpen(true);
  };

  const handleOpenEdit = (s: WorkSchedule) => {
    setEditingScheduleId(s.id);
    setScheduleName(s.schedule_name);
    setSelectedDept(s.department_id || 'ALL');
    setBranchSearch('');
    setBranchDropdownOpen(false);

    const normZone = normalizeZoneCode(s.operating_zone);
    if (!normZone) {
      setOperatingZoneMode('NONE');
      setCustomZoneCode('');
    } else if (normZone === 'ZONE_A' || normZone === 'ZONE_B') {
      setOperatingZoneMode(normZone);
      setCustomZoneCode('');
    } else {
      // Known or saved custom zone (e.g. OPERATING_ZONE_B)
      setOperatingZoneMode(normZone);
      setCustomZoneCode(normZone);
    }

    const assignedCodes = getScheduleBranchCodes(s);
    if (assignedCodes.length > 0) {
      setSelectedBranches(assignedCodes);
    } else if (normZone) {
      const zoneMatched = branches
        .filter((b) => normalizeZoneCode(b.operating_zone) === normZone)
        .map((b) => b.code.toUpperCase())
        .sort();
      setSelectedBranches(zoneMatched);
    } else {
      setSelectedBranches([]);
    }

    if (Array.isArray(s.special_rules)) {
      setSpecialRules(s.special_rules);
    } else if (normZone === 'ZONE_A') {
      setSpecialRules(['first_thursday_full', 'first_saturday_closed']);
    } else if (normZone === 'ZONE_B') {
      setSpecialRules(['first_saturday_closed']);
    } else {
      setSpecialRules([]);
    }

    if (s.breaks && s.breaks.length > 0) {
      const b = s.breaks[0];
      setLunchStart(b.start_time?.slice(0, 5) || '13:00');
      setLunchEnd(b.end_time?.slice(0, 5) || '14:00');
    } else {
      setLunchStart('13:00');
      setLunchEnd('14:00');
    }

    const standardWeek: Array<WorkScheduleDay['day_of_week']> = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const daysMap = new Map((s.days || []).map((d) => [d.day_of_week, d]));
    const parsedDays: WorkScheduleDay[] = standardWeek.map((dayName) => {
      const found = daysMap.get(dayName);
      if (found) {
        return {
          day_of_week: dayName,
          start_time: found.start_time,
          end_time: found.end_time,
          is_working_day: found.is_working_day,
        };
      }
      return {
        day_of_week: dayName,
        start_time: dayName === 'Saturday' || dayName === 'Sunday' ? null : '08:30:00',
        end_time: dayName === 'Saturday' || dayName === 'Sunday' ? null : '17:30:00',
        is_working_day: dayName !== 'Saturday' && dayName !== 'Sunday',
      };
    });
    setDaysState(parsedDays);
    setModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName.trim()) {
      toast.error('Schedule name is required');
      return;
    }

    const finalZone =
      operatingZoneMode === 'NONE'
        ? null
        : operatingZoneMode === 'CUSTOM'
        ? customZoneCode.trim().toUpperCase().replace(/\s+/g, '_') || null
        : operatingZoneMode;

    try {
      setSaving(true);
      const payload = {
        schedule_name: scheduleName.trim(),
        operating_zone: finalZone,
        department_id: selectedDept === 'ALL' ? null : selectedDept,
        branch_ids: selectedBranches,
        branch_id: selectedBranches.length > 0 ? selectedBranches.join(',') : null,
        special_rules: specialRules,
        days: daysState,
        breaks: [
          {
            break_name: 'Lunch Break',
            break_type: 'lunch',
            start_time: `${lunchStart}:00`,
            end_time: `${lunchEnd}:00`,
          },
        ],
      };

      if (editingScheduleId) {
        await multiCompanyApi.updateWorkSchedule(selectedCompanyId, editingScheduleId, payload);
        toast.success(`Schedule "${scheduleName}" updated & synced with assigned branches!`);
      } else {
        await multiCompanyApi.createWorkSchedule(selectedCompanyId, payload);
        toast.success(`Schedule "${scheduleName}" created & synced with assigned branches!`);
      }

      setModalOpen(false);
      setEditingScheduleId(null);
      setScheduleName('');
      await loadSchedules(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Error saving schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Work Schedule Scope:
          </span>
          <Select
            value={selectedCompanyId ? selectedCompanyId.toString() : '1'}
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {companies.find((c) => c.id === selectedCompanyId)?.company_name
                  ? `${companies.find((c) => c.id === selectedCompanyId)?.company_name} (${
                      companies.find((c) => c.id === selectedCompanyId)?.company_type === 'main'
                        ? 'Main Company'
                        : 'Subsidiary'
                    })`
                  : 'Rayhar Travels (Main Company)'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map((c) => (
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
          onClick={handleOpenCreate}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
          Create Work Schedule
        </Button>
      </div>

      {/* Priority Engine Info Banner */}
      <div className="p-3.5 bg-[#942392]/5 dark:bg-[#942392]/10 rounded-xl border border-[#942392]/20 flex items-start gap-3 text-xs">
        <div className="space-y-1">
          <span className="font-black text-[#942392] dark:text-[#f885d5] uppercase tracking-wider block">
            4-Tier Schedule Resolution Engine (Zone & Multi-Branch Aware)
          </span>
          <p className="text-muted-foreground dark:text-neutral-300 text-[11px] leading-relaxed">
            Attendance lateness and check-in thresholds evaluate strictly in hierarchy:
            <strong className="text-foreground mx-1">1. Employee Personal Override</strong> →
            <strong className="text-foreground mx-1">2. Department Schedule</strong> →
            <strong className="text-foreground mx-1">3. Operating Zone & Branch Schedule</strong> →
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
              No schedules created yet for {companies.find((c) => c.id === selectedCompanyId)?.company_name}.
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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {schedules.map((s) => {
                  const hoursStr = formatScheduleCoreHoursSummary(s);
                  const breakItem = s.breaks?.[0];
                  const breakStr = breakItem
                    ? `${breakItem.start_time?.slice(0, 5)} - ${breakItem.end_time?.slice(0, 5)}`
                    : 'None';

                  const assignedBranches = getScheduleBranchCodes(s);
                  const normZone = normalizeZoneCode(s.operating_zone);
                  const isDept = Boolean(s.department_id);
                  const isBranchOrZone = assignedBranches.length > 0 || Boolean(normZone);
                  const isDefault = !isDept && !isBranchOrZone;

                  return (
                    <tr key={s.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground dark:text-neutral-200">
                        <div className="flex flex-col gap-1">
                          <span>{s.schedule_name}</span>
                          {normZone && (
                            <span className="inline-flex items-center justify-center w-fit px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-muted dark:bg-neutral-800 text-muted-foreground border border-border/60">
                              {formatZoneDisplayName(normZone)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap ${
                            isDefault
                              ? 'border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isDefault
                            ? 'Company Default (Tier 4)'
                            : isDept
                            ? 'Department (Tier 2)'
                            : 'Branch (Tier 3)'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground max-w-md">
                        {isDept && (
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/80 dark:bg-neutral-800 text-foreground border border-border/60 mb-1 mr-1 shadow-xs">
                            Dept: {s.department_id}
                          </span>
                        )}
                        {assignedBranches.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignedBranches.map((code) => {
                              const bObj = branches.find((b) => b.code.toUpperCase() === code.toUpperCase());
                              const displayName = bObj ? `${toProperCase(bObj.name)} (${code})` : code;
                              return (
                                <span
                                  key={code}
                                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/80 dark:bg-neutral-800 text-foreground border border-border/60 shadow-xs"
                                  title={bObj?.name || code}
                                >
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/80 dark:bg-neutral-800 text-muted-foreground border border-border/60 shadow-xs">
                            All Departments & Branches
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground text-[11px]">
                        {hoursStr}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {breakStr}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(s)}
                          className="h-8 px-3 rounded-full text-xs font-bold border-border/80 hover:bg-muted"
                        >
                          Edit Hours
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Work Schedule Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-neutral-900 border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">
          <form onSubmit={handleSaveSchedule} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-2xl m-0 text-left shrink-0 border-b border-white/20">
              <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">
                {editingScheduleId ? 'Edit Work Schedule Timetable' : 'Create Work Schedule Timetable'}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
                {companies.find((c) => c.id === selectedCompanyId)?.company_name || 'Selected Entity'}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {/* Schedule Name & Operating Zone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Schedule Name *
                  </Label>
                  <Input
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="e.g. Standard Office Hours (Zone A)"
                    className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                      Operating Zone
                    </Label>
                    {operatingZoneMode && operatingZoneMode !== 'NONE' && operatingZoneMode !== 'CUSTOM' && (
                      <button
                        type="button"
                        onClick={() => handleApplyZonePreset(operatingZoneMode)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#942392] hover:underline cursor-pointer"
                      >
                        Apply {operatingZoneMode.replace(/_/g, ' ')} Preset
                      </button>
                    )}
                  </div>
                  <Select value={operatingZoneMode} onValueChange={handleZoneSelectionChange}>
                    <SelectTrigger className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white rounded-xl">
                      <SelectValue placeholder="Select Operating Zone" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ZONE_A" className="text-xs font-bold">
                        ZONE A (East Coast / Kedah - Fri/Sat Off)
                      </SelectItem>
                      <SelectItem value="ZONE_B" className="text-xs font-bold">
                        ZONE B (West Coast - Sat/Sun Off)
                      </SelectItem>
                      {availableCustomZones.map((cz) => (
                        <SelectItem key={cz} value={cz} className="text-xs font-bold text-[#942392] dark:text-[#f885d5]">
                          {cz} (Custom Operating Zone)
                        </SelectItem>
                      ))}
                      <SelectItem value="NONE" className="text-xs font-bold">
                        All Zones / No Specific Zone
                      </SelectItem>
                      <SelectItem value="CUSTOM" className="text-xs font-bold">
                        + Enter New Custom Operating Zone...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {operatingZoneMode === 'CUSTOM' && (
                    <Input
                      value={customZoneCode}
                      onChange={(e) => setCustomZoneCode(e.target.value.toUpperCase())}
                      placeholder="e.g. OPERATING_ZONE_C or SHIFT_1"
                      className="text-xs h-9 mt-1.5 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold uppercase rounded-xl"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="border-b border-border/60 my-2" />

              {/* Department Assignment & Branch Assignment (Multi-Checkbox Dropdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Department Assignment
                  </Label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white rounded-xl">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ALL" className="text-xs font-bold">
                        All Departments (Company-wide)
                      </SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.name} value={d.name} className="text-xs">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Assignment Multi-Checkbox Dropdown */}
                <div className="space-y-1.5 relative" ref={branchDropdownRef}>
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    Branch Assignment
                  </Label>
                  <button
                    type="button"
                    onClick={() => setBranchDropdownOpen((prev) => !prev)}
                    className="w-full h-10 px-3 rounded-xl border border-border dark:border-neutral-800 bg-background dark:bg-neutral-900 text-xs font-medium text-black dark:text-white flex items-center justify-between gap-2 shadow-xs hover:border-[#942392]/50 transition-colors"
                  >
                    <span className="truncate font-bold">
                      {selectedBranches.length === 0
                        ? 'All Branches'
                        : selectedBranches.length === branches.length && branches.length > 0
                        ? `All Branches (${branches.length} Selected)`
                        : `${selectedBranches.length} Branches Selected (${selectedBranches.slice(0, 4).join(', ')}${
                            selectedBranches.length > 4 ? '...' : ''
                          })`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {branchDropdownOpen && (
                    <div className="absolute right-0 left-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-xl shadow-2xl p-2 space-y-2">
                      {/* Search & Quick Zone Actions */}
                      <div className="space-y-1.5 pb-1.5 border-b border-border/60">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <Input
                            value={branchSearch}
                            onChange={(e) => setBranchSearch(e.target.value)}
                            placeholder="Search branch name or code..."
                            className="h-8 pl-8 text-xs bg-muted/30 dark:bg-neutral-800 rounded-lg"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectZoneBranches('ZONE_A')}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/30 hover:bg-[#942392]/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                          >
                            ZONE A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectZoneBranches('ZONE_B')}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                          >
                            ZONE B
                          </button>
                          {availableCustomZones.map((cz) => (
                            <button
                              key={cz}
                              type="button"
                              onClick={() => handleSelectZoneBranches(cz)}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                            >
                              {cz}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSelectedBranches(branches.map((b) => b.code.toUpperCase()).sort())}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                          >
                            SELECT ALL
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBranches([])}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors shadow-xs cursor-pointer uppercase tracking-wider ml-auto"
                          >
                            CLEAR
                          </button>
                        </div>
                      </div>

                      {/* Multi-Checkbox Branch List */}
                      <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                        {/* All Branches option */}
                        <div
                          onClick={() => {
                            if (selectedBranches.length === branches.length) {
                              setSelectedBranches([]);
                            } else {
                              setSelectedBranches(branches.map((b) => b.code.toUpperCase()).sort());
                            }
                          }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                            selectedBranches.length === 0 || selectedBranches.length === branches.length
                              ? 'bg-[#942392]/10 text-[#942392] font-bold'
                              : 'hover:bg-muted/60 text-foreground font-semibold'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              selectedBranches.length === branches.length && branches.length > 0
                                ? 'bg-[#942392] border-[#942392] text-white'
                                : 'border-slate-300 dark:border-neutral-700 bg-background'
                            }`}
                          >
                            {selectedBranches.length === branches.length && branches.length > 0 && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                          <span>All Branches</span>
                        </div>

                        {filteredBranchesForModal.map((b) => {
                          const codeUpper = b.code.toUpperCase();
                          const isChecked = selectedBranches.includes(codeUpper);
                          const bZone = normalizeZoneCode(b.operating_zone) || 'ZONE_B';
                          return (
                            <div
                              key={codeUpper}
                              onClick={() => toggleBranchTickbox(codeUpper)}
                              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                isChecked
                                  ? 'bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] font-bold'
                                  : 'hover:bg-muted/60 text-foreground font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                    isChecked
                                      ? 'bg-[#942392] border-[#942392] text-white'
                                      : 'border-slate-300 dark:border-neutral-700 bg-background'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="truncate">
                                  {toProperCase(b.name)} ({codeUpper})
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                                  bZone === 'ZONE_A'
                                    ? 'bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border-[#942392]/30'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                }`}
                              >
                                {bZone === 'ZONE_A' ? 'ZONE A' : bZone === 'ZONE_B' ? 'ZONE B' : bZone}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Scope Selected Branches Preview & Quick Checkboxes */}
              <div className="p-3 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground">
                      Target Scope ({selectedBranches.length === 0 ? 'All Branches' : `${selectedBranches.length} Branches Checked`}):
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectZoneBranches('ZONE_A')}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/30 hover:bg-[#942392]/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                    >
                      ZONE A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectZoneBranches('ZONE_B')}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                    >
                      ZONE B
                    </button>
                    {availableCustomZones.map((cz) => (
                      <button
                        key={cz}
                        type="button"
                        onClick={() => handleSelectZoneBranches(cz)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                      >
                        {cz}
                      </button>
                    ))}
                    {selectedBranches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBranches([])}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>
                </div>
                {selectedBranches.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBranches.map((code) => {
                      const bObj = branches.find((b) => b.code.toUpperCase() === code);
                      return (
                        <span
                          key={code}
                          onClick={() => toggleBranchTickbox(code)}
                          title="Click to uncheck branch"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#942392]/10 text-[#942392] dark:text-[#f885d5] border border-[#942392]/25 cursor-pointer hover:bg-[#942392]/20 transition-colors"
                        >
                          <span>{bObj ? `${toProperCase(bObj.name)} (${code})` : code}</span>
                          <X className="w-2.5 h-2.5" />
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Click <strong>Branch Assignment</strong> above to tick one or multiple branches for this schedule's Target Scope.
                  </p>
                )}
              </div>

              <div className="border-b border-border/60 my-2" />

              {/* 7-Day Timetable Grid */}
              <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-3">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block">
                  7-Day Monday through Sunday Timetable
                </Label>

                <div className="space-y-2">
                  {daysState.map((d, idx) => (
                    <div
                      key={d.day_of_week}
                      className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg bg-background dark:bg-neutral-900 border border-border/40"
                    >
                      <div className="w-24 font-bold text-foreground">{d.day_of_week}</div>

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
                          <CustomTimePicker
                            value={d.start_time?.slice(0, 5) || '08:30'}
                            onChange={(val) => handleTimeChange(idx, 'start_time', val)}
                            className="text-xs h-8 w-[116px] px-2 font-mono font-medium"
                          />
                          <span className="text-muted-foreground text-xs font-medium">to</span>
                          <CustomTimePicker
                            value={d.end_time?.slice(0, 5) || '17:30'}
                            onChange={(val) => handleTimeChange(idx, 'end_time', val)}
                            className="text-xs h-8 w-[116px] px-2 font-mono font-medium"
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

                {/* Monthly Special Rules Tickboxes */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Monthly Zone Operating Exceptions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSpecialRule('first_thursday_full');
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none ${
                        specialRules.includes('first_thursday_full')
                          ? 'bg-[#942392]/10 border-[#942392] text-foreground font-bold'
                          : 'bg-background dark:bg-neutral-900 border-border/50 text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          specialRules.includes('first_thursday_full')
                            ? 'bg-[#942392] border-[#942392] text-white'
                            : 'border-slate-300 dark:border-neutral-700'
                        }`}
                      >
                        {specialRules.includes('first_thursday_full') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>First Thursday of Month: Full Day (8:30 AM – 5:30 PM)</span>
                    </label>

                    <label
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSpecialRule('first_saturday_closed');
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none ${
                        specialRules.includes('first_saturday_closed')
                          ? 'bg-[#942392]/10 border-[#942392] text-foreground font-bold'
                          : 'bg-background dark:bg-neutral-900 border-border/50 text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          specialRules.includes('first_saturday_closed')
                            ? 'bg-[#942392] border-[#942392] text-white'
                            : 'border-slate-300 dark:border-neutral-700'
                        }`}
                      >
                        {specialRules.includes('first_saturday_closed') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>First Saturday of Month: Closed / Off Day</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Break Configuration */}
              <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Lunch Break Window (Excluded from Net Hours)
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CustomTimePicker
                    value={lunchStart}
                    onChange={(val) => setLunchStart(val)}
                    className="text-xs h-8 w-[116px] px-2 font-mono font-medium"
                  />
                  <span className="text-muted-foreground text-xs font-medium">to</span>
                  <CustomTimePicker
                    value={lunchEnd}
                    onChange={(val) => setLunchEnd(val)}
                    className="text-xs h-8 w-[116px] px-2 font-mono font-medium"
                  />
                  <span className="text-[10px] text-muted-foreground ml-2">(Default: 01:00 PM - 02:00 PM)</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-muted/30 dark:bg-neutral-800/40 border-t border-border/40 shrink-0 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="h-8 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !scheduleName.trim()}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase h-8 px-4 rounded-xl shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Saving Timetable...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    {editingScheduleId ? 'Save Changes' : 'Create Schedule'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
