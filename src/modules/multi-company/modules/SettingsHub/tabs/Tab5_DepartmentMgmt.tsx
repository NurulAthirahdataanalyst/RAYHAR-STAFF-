import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Layers, Plus, Users, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyDepartment } from '../../../types/multiCompany.types';

export const Tab5_DepartmentMgmt: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  const fetchDepts = async (cId: number) => {
    try {
      setLoading(true);
      const res = await multiCompanyApi.getCompanyDepartments(cId);
      setDepartments(res);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDepts(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      setSaving(true);
      await multiCompanyApi.createCompanyDepartment(selectedCompanyId, deptName.trim(), deptCode.trim());
      toast.success(`Department "${deptName}" created successfully!`);
      setDeptName('');
      setDeptCode('');
      setModalOpen(false);
      await fetchDepts(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Error creating department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
            Company Department Scope:
          </span>
          <Select 
            value={selectedCompanyId.toString()} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-56 text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold ml-1">
              <SelectValue placeholder="Select company..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                  {c.company_name} ({c.company_type === 'main' ? 'Main' : 'Sub'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-8 px-3.5 rounded-xl self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Department
        </Button>
      </div>

      {/* Departments Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading departments...
          </div>
        ) : departments.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-medium">
              No departments configured yet for {companies.find(c => c.id === selectedCompanyId)?.company_name}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Department Name</th>
                  <th className="px-4 py-3">Headcount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {d.code || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground dark:text-neutral-200">
                      {d.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3 h-3 text-[#942392]" />
                        {d.employee_count || 0} Staff
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Department Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#942392]" />
              Create Department
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDepartment} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Department Name *</Label>
              <Input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Marketing & Media, Fleet Operations"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Department Code</Label>
              <Input
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                placeholder="e.g. MKT, OPS, IT"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !deptName.trim()}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase h-8 px-4 rounded-xl"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Create Department
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
