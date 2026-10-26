import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { multiCompanyApi } from '../services/multiCompanyApi';
import { API_BASE_URL } from '@/config/api';
import { Company, CompanyBranch, CompanyRole } from '../types/multiCompany.types';
import { ArrowRight, UserCheck, Building2, MapPin, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface EmployeeTransferWizardProps {
  onTransferComplete?: () => void;
}

export const CompanyTransferWizard: React.FC<EmployeeTransferWizardProps> = ({ onTransferComplete }) => {
  const { companies, refreshCompanies } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Destination states
  const [targetCompanyId, setTargetCompanyId] = useState<number | null>(null);
  const [targetBranches, setTargetBranches] = useState<CompanyBranch[]>([]);
  const [targetRoles, setTargetRoles] = useState<CompanyRole[]>([]);
  const [targetBranchCode, setTargetBranchCode] = useState<string>('');
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Load employees list
  useEffect(() => {
    const loadEmps = async () => {
      try {
        setLoadingEmployees(true);
        const res = await fetch(`${API_BASE_URL}/api/employees`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error('Error loading employees for transfer:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    void loadEmps();
  }, []);

  // When target company changes, fetch its branches and roles
  useEffect(() => {
    if (!targetCompanyId) {
      setTargetBranches([]);
      setTargetRoles([]);
      return;
    }

    const loadTargetData = async () => {
      try {
        const [bList, rList] = await Promise.all([
          multiCompanyApi.getCompanyBranches(targetCompanyId),
          multiCompanyApi.getCompanyRoles(targetCompanyId)
        ]);
        setTargetBranches(bList);
        setTargetRoles(rList);
        if (bList.length > 0) setTargetBranchCode(bList[0].code);
        if (rList.length > 0) setTargetRoleId(rList[0].id);
      } catch (err) {
        console.error('Failed to load target company branches/roles:', err);
      }
    };

    void loadTargetData();
  }, [targetCompanyId]);

  const selectedEmployee = employees.find(e => (e.user_id || e.id) === selectedEmployeeId);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !targetCompanyId) {
      toast.error('Please select both an employee and a target company');
      return;
    }

    if (!transferReason.trim()) {
      toast.error('Please state a reason for this company transfer');
      return;
    }

    try {
      setSubmitting(true);
      await multiCompanyApi.transferEmployee({
        employee_id: selectedEmployeeId,
        new_company_id: targetCompanyId,
        new_branch_id: targetBranchCode || undefined,
        new_role_id: targetRoleId || undefined,
        reason: transferReason.trim()
      });

      toast.success(`Successfully transferred ${selectedEmployee?.full_name || selectedEmployeeId} to new company!`);
      setSelectedEmployeeId('');
      setTargetCompanyId(null);
      setTransferReason('');
      await refreshCompanies();
      if (onTransferComplete) onTransferComplete();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleExecuteTransfer} className="space-y-6">
      {/* Step 1: Select Employee */}
      <div className="p-4 bg-card dark:bg-card/90 rounded-xl border border-border dark:border-neutral-800 space-y-3 shadow-xs">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#942392]" />
          Step 1: Select Employee to Transfer
        </h4>
        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Employee Name</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
              <SelectValue placeholder={loadingEmployees ? "Loading staff directory..." : "Choose staff member..."} />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {employees.map(e => (
                <SelectItem key={e.user_id || e.id} value={e.user_id || e.id} className="text-xs font-bold">
                  {e.full_name || e.name} ({e.user_id || e.id}) — {e.branch || 'HQ'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="p-3 bg-muted/40 dark:bg-neutral-800/40 rounded-lg border border-border/40 text-xs flex flex-wrap gap-4 items-center">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Role</span>
              <span className="font-bold text-foreground">{selectedEmployee.role || 'Staff'}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Branch</span>
              <span className="font-bold text-foreground">{selectedEmployee.branch || 'HQ'}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Department</span>
              <span className="font-bold text-foreground">{selectedEmployee.department || 'General'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Target Destination */}
      <div className="p-4 bg-card dark:bg-card/90 rounded-xl border border-border dark:border-neutral-800 space-y-4 shadow-xs">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#942392]" />
          Step 2: Destination Subsidiary & Placement
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Destination Company *</Label>
            <Select 
              value={targetCompanyId ? targetCompanyId.toString() : ''} 
              onValueChange={(val) => setTargetCompanyId(parseInt(val, 10))}
            >
              <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                <SelectValue placeholder="Select target entity..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                    {c.company_name} ({c.company_type === 'main' ? 'Parent' : 'Subsidiary'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">New Branch Placement</Label>
            <Select 
              value={targetBranchCode} 
              onValueChange={setTargetBranchCode}
              disabled={!targetCompanyId || targetBranches.length === 0}
            >
              <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                <SelectValue placeholder={targetBranches.length === 0 ? "No branches in entity" : "Select branch..."} />
              </SelectTrigger>
              <SelectContent>
                {targetBranches.map(b => (
                  <SelectItem key={b.code} value={b.code} className="text-xs font-bold">
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Assigned Role in Entity</Label>
            <Select 
              value={targetRoleId} 
              onValueChange={setTargetRoleId}
              disabled={!targetCompanyId || targetRoles.length === 0}
            >
              <SelectTrigger className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                <SelectValue placeholder={targetRoles.length === 0 ? "No roles configured" : "Select role..."} />
              </SelectTrigger>
              <SelectContent>
                {targetRoles.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs font-bold">
                    {r.name} ({r.role_type || 'Role'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Transfer Reason & Authorization Notes *</Label>
          <Input
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            placeholder="e.g. Secondment to RayRent for fleet management expansion"
            className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Past attendance logs and leave records are permanently preserved.
        </span>

        <Button
          type="submit"
          disabled={submitting || !selectedEmployeeId || !targetCompanyId || !transferReason.trim()}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-lg"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
          )}
          Confirm & Execute Transfer
        </Button>
      </div>
    </form>
  );
};
