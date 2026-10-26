import React, { useState, useEffect } from 'react';
import { multiCompanyApi } from '../services/multiCompanyApi';
import { CompanyRole, ApprovalWorkflowStep } from '../types/multiCompany.types';
import { Plus, Trash2, ArrowDown, Shield, Check, Clock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ApprovalBuilderProps {
  companyId: number;
  companyName: string;
}

export const ApprovalBuilder: React.FC<ApprovalBuilderProps> = ({ companyId, companyName }) => {
  const [steps, setSteps] = useState<ApprovalWorkflowStep[]>([]);
  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [settingsData, rolesData, mainRolesData] = await Promise.all([
          multiCompanyApi.getLeaveSettings(companyId),
          multiCompanyApi.getCompanyRoles(companyId),
          companyId !== 1 ? multiCompanyApi.getCompanyRoles(1) : Promise.resolve([])
        ]);

        // Combine subsidiary roles + main company executive roles (for escalation)
        const combinedRoles = [...rolesData, ...mainRolesData.filter(r => r.scope_type === 'Parent Group Access')];
        setAvailableRoles(combinedRoles);
        setSteps(settingsData.approval_workflow || []);
      } catch (err) {
        console.error('Failed to load approval workflow:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [companyId]);

  const handleAddStep = () => {
    const defaultRoleId = availableRoles.length > 0 ? availableRoles[0].id : '';
    const newStep: ApprovalWorkflowStep = {
      company_id: companyId,
      module: 'leave',
      step_order: steps.length + 1,
      approver_role_id: defaultRoleId,
      step_label: steps.length === 0 ? 'Initial Endorsement' : steps.length === 1 ? 'Department Review' : 'Final Sign-off',
      auto_escalate_hours: 48
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      step_order: idx + 1
    }));
    setSteps(updated);
  };

  const handleUpdateStep = (index: number, field: keyof ApprovalWorkflowStep, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSave = async () => {
    if (steps.some(s => !s.approver_role_id)) {
      toast.error('All steps must have an assigned approver role');
      return;
    }

    try {
      setSaving(true);
      await multiCompanyApi.saveApprovalWorkflow(companyId, steps);
      toast.success(`Leave approval workflow saved for ${companyName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save approval workflow');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
        Loading approval workflow...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
            Multi-Tier Leave Approval Sequence
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure step-by-step sign-off routing for {companyName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="text-xs font-bold border-[#942392]/30 hover:bg-[#942392]/10 text-[#942392] h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Step
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#942392] hover:bg-[#800A7A] text-white font-bold text-xs h-8 shadow-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Save Workflow
          </Button>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="p-8 border border-dashed border-border dark:border-neutral-800 rounded-xl text-center space-y-2">
          <Shield className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground font-medium">
            No approval steps configured for {companyName}. Click "+ Add Step" to create an approval ladder.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={idx}>
                <div className="p-4 rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-card/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-[#942392]/30">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-7 h-7 rounded-lg bg-[#942392] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {idx + 1}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 sm:flex-initial">
                      <div>
                        <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">Step Label</Label>
                        <Input
                          value={step.step_label}
                          onChange={(e) => handleUpdateStep(idx, 'step_label', e.target.value)}
                          placeholder="e.g. Branch Endorsement"
                          className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-44 font-bold text-black dark:text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-black text-black dark:text-white uppercase tracking-wider">Approver Role</Label>
                        <Select
                          value={step.approver_role_id}
                          onValueChange={(val) => handleUpdateStep(idx, 'approver_role_id', val)}
                        >
                          <SelectTrigger className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 w-52 font-bold text-black dark:text-white">
                            <SelectValue placeholder="Select approver..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(r => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.name} {r.scope_type === 'Parent Group Access' ? '(Group Executive)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Auto-notify: 48h</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStep(idx)}
                      className="text-destructive hover:bg-destructive/10 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex justify-center -my-1">
                    <ArrowDown className="w-4 h-4 text-[#942392]/60 animate-bounce" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
