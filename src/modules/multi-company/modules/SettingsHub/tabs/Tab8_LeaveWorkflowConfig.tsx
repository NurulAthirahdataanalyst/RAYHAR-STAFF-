import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, ShieldCheck, Check, ArrowDown, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { LeaveTypeSetting } from '../../../types/multiCompany.types';
import { ApprovalBuilder } from '../../../workflow/ApprovalBuilder';

export const Tab8_LeaveWorkflowConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeSetting[]>([]);
  const [escalateToParent, setEscalateToParent] = useState(true);
  const [mcRequired, setMcRequired] = useState(true);
  const [annualDays, setAnnualDays] = useState(14);
  const [sickDays, setSickDays] = useState(14);
  const [emergencyDays, setEmergencyDays] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true);
        const data = await multiCompanyApi.getLeaveSettings(selectedCompanyId);
        setLeaveTypes(data.leave_types);

        const annual = data.leave_types.find(l => l.leave_type === 'Annual Leave');
        const sick = data.leave_types.find(l => l.leave_type === 'Sick Leave');
        const emerg = data.leave_types.find(l => l.leave_type === 'Emergency Leave');

        if (annual) setAnnualDays(annual.default_entitlement_days);
        if (sick) setSickDays(sick.default_entitlement_days);
        if (emerg) setEmergencyDays(emerg.default_entitlement_days);
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

  const currentCompanyName = companies.find(c => c.id === selectedCompanyId)?.company_name || 'Selected Entity';

  return (
    <div className="space-y-6">
      {/* Top Company Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <CalendarDays className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company Leave Policy Scope:
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

        <span className="text-xs text-muted-foreground">
          Configuring entitlements & approval ladder for <strong className="text-black dark:text-white">{currentCompanyName}</strong>
        </span>
      </div>

      {/* Part 1: Leave Entitlements Configuration */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#942392]" />
            Default Annual Entitlements & Policies
          </h4>
          <p className="text-[11px] text-muted-foreground">Standard starting quota allocations for new employees onboarded into this company.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3 rounded-xl border border-border/50 bg-background dark:bg-neutral-900 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Annual Leave</Label>
              <Input
                type="number"
                value={annualDays}
                onChange={(e) => setAnnualDays(Number(e.target.value))}
                className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">Days per annum</span>
          </div>

          <div className="p-3 rounded-xl border border-border/50 bg-background dark:bg-neutral-900 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Medical / Sick Leave</Label>
              <Input
                type="number"
                value={sickDays}
                onChange={(e) => setSickDays(Number(e.target.value))}
                className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">Days per annum</span>
          </div>

          <div className="p-3 rounded-xl border border-border/50 bg-background dark:bg-neutral-900 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Emergency Leave</Label>
              <Input
                type="number"
                value={emergencyDays}
                onChange={(e) => setEmergencyDays(Number(e.target.value))}
                className="w-16 h-7 text-xs text-center font-bold text-black dark:text-white"
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">Days per annum</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Switch checked={mcRequired} onCheckedChange={setMcRequired} className="data-[state=checked]:bg-[#942392]" />
            <span className="font-bold text-foreground">Enforce Medical Certificate (MC) Slip Upload for Sick Leave</span>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={escalateToParent} onCheckedChange={setEscalateToParent} className="data-[state=checked]:bg-[#942392]" />
            <span className="font-bold text-foreground">Escalate to Main Company if Local Approver is Unassigned</span>
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
