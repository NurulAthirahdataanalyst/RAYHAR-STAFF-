import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
            Company Department Scope:
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

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
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
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                <tr>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Department Name</th>
                  <th className="px-4 py-3.5">Headcount</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {d.code || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-black dark:text-white">
                      {d.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]">
                        {d.employee_count || 0} Staff
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
        <DialogContent className="max-w-md overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
          <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
            <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">
              Create Department
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
              Add a functional department unit to {companies.find(c => c.id === selectedCompanyId)?.company_name || 'Selected Entity'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDepartment} className="p-6 space-y-4 bg-card">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Department Name *</Label>
              <Input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Marketing & Media, Fleet Operations"
                className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
                required
              />
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Department Code</Label>
              <Input
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                placeholder="e.g. MKT, OPS, IT"
                className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
              />
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-xs font-black uppercase">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !deptName.trim()}
                className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Create Department
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
