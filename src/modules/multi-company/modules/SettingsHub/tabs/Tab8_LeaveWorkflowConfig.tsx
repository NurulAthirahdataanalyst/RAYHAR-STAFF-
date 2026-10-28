import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarDays,
  ShieldCheck,
  Check,
  ArrowDown,
  Save,
  Loader2,
  FileText,
  Palmtree,
  RotateCcw,
  Clock,
  HeartPulse,
  Coins,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { LeaveTypeSetting } from '../../../types/multiCompany.types';
import { ApprovalBuilder } from '../../../workflow/ApprovalBuilder';
import { toProperCase } from '@/utils/branchUtils';

export const Tab8_LeaveWorkflowConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeSetting[]>([]);
  const [escalateToParent, setEscalateToParent] = useState(true);
  const [mcRequired, setMcRequired] = useState(true);

  // 4 Leave Types State
  // 1. Annual & Emergency Leave
  const [annualDays, setAnnualDays] = useState(14);
  const [emergencyDays, setEmergencyDays] = useState(5);

  // 2. Replacement Leave (Cuti Ganti)
  const [replacementDays, setReplacementDays] = useState(0);

  // 3. Unpaid Leave (Cuti Tanpa Gaji)
  const [unpaidDays, setUnpaidDays] = useState(30);

  // 4. Medical Leave (Sick Leave)
  const [sickDays, setSickDays] = useState(14);

  const [savingPolicies, setSavingPolicies] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.companyId) {
        setSelectedCompanyId(e.detail.companyId);
      }
    };
    window.addEventListener('rayhar_company_switched', handler);
    return () => window.removeEventListener('rayhar_company_switched', handler);
  }, []);

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true);
        const data = await multiCompanyApi.getLeaveSettings(selectedCompanyId);
        setLeaveTypes(data.leave_types);

        const annual = data.leave_types.find(l => l.leave_type === 'Annual Leave');
        const sick = data.leave_types.find(l => l.leave_type === 'Sick Leave');
        const emerg = data.leave_types.find(l => l.leave_type === 'Emergency Leave');
        const rep = data.leave_types.find(l => l.leave_type === 'Replacement Leave');
        const unpaid = data.leave_types.find(l => l.leave_type === 'Unpaid Leave');

        if (annual) setAnnualDays(annual.default_entitlement_days ?? 14);
        if (sick) setSickDays(sick.default_entitlement_days ?? 14);
        if (emerg) setEmergencyDays(emerg.default_entitlement_days ?? 5);
        if (rep) setReplacementDays(rep.default_entitlement_days ?? 0);
        if (unpaid) setUnpaidDays(unpaid.default_entitlement_days ?? 30);

        if (annual) setEscalateToParent(annual.escalate_to_parent !== false);
        if (sick) setMcRequired(sick.mc_required !== false);
      } catch (err) {
        console.error('Failed to load leave settings:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchLeaveData();
  }, [selectedCompanyId]);

  const handleSavePolicies = async () => {
    try {
      setSavingPolicies(true);
      await multiCompanyApi.saveLeaveSettings(selectedCompanyId, {
        annual_days: Number(annualDays),
        sick_days: Number(sickDays),
        emergency_days: Number(emergencyDays),
        replacement_days: Number(replacementDays),
        unpaid_days: Number(unpaidDays),
        mc_required: mcRequired,
        escalate_to_parent: escalateToParent
      });
      await multiCompanyApi.logActivity({
        category: 'LEAVE_SETTINGS_UPDATE',
        description: `HR saved leave entitlements & policies for ${currentCompanyName} (Annual & Emergency: ${annualDays} days, Medical: ${sickDays} days)`,
        company_id: selectedCompanyId,
        new_values: { annual_days: annualDays, sick_days: sickDays, replacement_days: replacementDays, unpaid_days: unpaidDays, mc_required: mcRequired }
      });
      toast.success(`Leave entitlements and policies saved for ${currentCompanyName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save leave policies');
    } finally {
      setSavingPolicies(false);
    }
  };

  const currentCompanyName = useMemo(() => {
    const found = companies.find((c) => c.id === selectedCompanyId);
    return found ? toProperCase(found.company_name) : 'Rayhar Travels';
  }, [companies, selectedCompanyId]);

  return (
    <div className="space-y-6">
      {/* Top Company Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company Leave Policy Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white shadow-xs">
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

        <span className="text-xs text-muted-foreground">
          Configuring entitlements & approval ladder for <strong className="text-black dark:text-white">{currentCompanyName}</strong>
        </span>
      </div>

      {/* Part 1: Leave Entitlements Configuration — 4 Specific Leave Types */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50 dark:border-neutral-800">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-white">
              Default Annual Entitlements & Policies (4 Leave Types)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Standard quota allocations and baseline entitlements for employees assigned to <strong className="text-foreground">{currentCompanyName}</strong>.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSavePolicies}
            disabled={savingPolicies || loading}
            className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs h-8 shadow-xs shrink-0 cursor-pointer"
          >
            {savingPolicies ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            Save Entitlements
          </Button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Annual & Emergency Leave */}
          <div className="p-4 rounded-xl border border-purple-500/25 bg-gradient-to-b from-purple-500/5 to-transparent dark:bg-neutral-900/80 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-black text-foreground uppercase tracking-tight">
                  Annual & Emergency Leave
                </h5>
                <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-purple-500/30 text-[#942392] dark:text-[#f885d5] bg-purple-500/10 shadow-2xs">
                  Paid
                </span>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Standard paid vacation and sudden emergency leave allowance.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 dark:border-neutral-800">
              <div className="flex justify-between items-center bg-background/60 dark:bg-neutral-950 p-2 rounded-lg border border-border/50">
                <Label className="text-[11px] font-bold text-black dark:text-white">Annual & Emergency Leave</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={annualDays}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAnnualDays(val);
                      setEmergencyDays(val);
                    }}
                    className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Replacement Leave (Cuti Ganti) */}
          <div className="p-4 rounded-xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/5 to-transparent dark:bg-neutral-900/80 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-black text-foreground uppercase tracking-tight">
                  Replacement Leave
                </h5>
                <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 shadow-2xs">
                  Cuti Ganti
                </span>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Compensatory leave earned from duty on public holidays, rest days, or approved overtime.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 dark:border-neutral-800">
              <div className="flex justify-between items-center bg-background/60 dark:bg-neutral-950 p-2 rounded-lg border border-border/50">
                <Label className="text-[11px] font-bold text-black dark:text-white">Starting Base Quota</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={replacementDays}
                    onChange={(e) => setReplacementDays(Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Unpaid Leave (Cuti Tanpa Gaji) */}
          <div className="p-4 rounded-xl border border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-transparent dark:bg-neutral-900/80 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-black text-foreground uppercase tracking-tight">
                  Unpaid Leave
                </h5>
                <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 shadow-2xs">
                  Deducted
                </span>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Absence without pay, subject to approval. Automatically applies payroll salary deduction.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 dark:border-neutral-800">
              <div className="flex justify-between items-center bg-background/60 dark:bg-neutral-950 p-2 rounded-lg border border-border/50">
                <Label className="text-[11px] font-bold text-black dark:text-white">Max Allowed Days</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={unpaidDays}
                    onChange={(e) => setUnpaidDays(Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Medical Leave (Sick Leave) */}
          <div className="p-4 rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-500/5 to-transparent dark:bg-neutral-900/80 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-black text-foreground uppercase tracking-tight">
                  Medical Leave (Sick Leave)
                </h5>
                <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-sky-500/30 text-sky-700 dark:text-sky-300 bg-sky-500/10 shadow-2xs">
                  Sick Leave
                </span>
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Paid medical outpatient leaves for verified medical illness with clinical slip.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40 dark:border-neutral-800">
              <div className="flex justify-between items-center bg-background/60 dark:bg-neutral-950 p-2 rounded-lg border border-border/50">
                <Label className="text-[11px] font-bold text-black dark:text-white">Medical Quota</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={sickDays}
                    onChange={(e) => setSickDays(Number(e.target.value))}
                    className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Policy Switches */}
        <div className="pt-3 border-t border-border/50 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <Switch
              checked={mcRequired}
              onCheckedChange={setMcRequired}
              className="data-[state=checked]:bg-[#942392]"
            />
            <span className="font-bold text-foreground">
              Enforce Medical Certificate (MC) Slip Upload for Medical / Sick Leave
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Switch
              checked={escalateToParent}
              onCheckedChange={setEscalateToParent}
              className="data-[state=checked]:bg-[#942392]"
            />
            <span className="font-bold text-foreground">
              Escalate to Main Company if Local Approver is Unassigned
            </span>
          </div>
        </div>
      </Card>

      {/* Part 2: Visual Multi-Tier Approval Sequence Builder */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5">
        <ApprovalBuilder
          companyId={selectedCompanyId}
          companyName={currentCompanyName}
        />
      </Card>
    </div>
  );
};
