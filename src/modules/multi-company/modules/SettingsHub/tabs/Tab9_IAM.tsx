import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, Edit, Trash2, Users, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyRole, RoleTemplate, RoleType, ScopeType } from '../../../types/multiCompany.types';
import { PermissionMatrix } from '../../../permissions/PermissionMatrix';

export const Tab9_IAM: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Operational Role');
  const [scopeType, setScopeType] = useState<ScopeType>('Current Company Only');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  const fetchRolesAndTemplates = async (cId: number) => {
    try {
      setLoading(true);
      const [rList, tList] = await Promise.all([
        multiCompanyApi.getCompanyRoles(cId),
        multiCompanyApi.getRoleTemplates()
      ]);
      setRoles(rList);
      setTemplates(tList);
    } catch (err) {
      console.error('Error fetching IAM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRolesAndTemplates(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setRoleName('');
    setDisplayName('');
    setDescription('');
    setRoleType('Operational Role');
    setScopeType('Current Company Only');
    setSelectedPermissions([]);
    setModalOpen(true);
  };

  const handleOpenEdit = (r: CompanyRole) => {
    setEditingRole(r);
    setRoleName(r.name);
    setDisplayName(r.name);
    setDescription(r.description || '');
    setRoleType(r.role_type || 'Operational Role');
    setScopeType(r.scope_type || 'Current Company Only');
    setSelectedPermissions(r.permission_keys || []);
    setModalOpen(true);
  };

  const handleApplyTemplate = (templateName: string) => {
    const tmpl = templates.find(t => t.template_name === templateName);
    if (tmpl) {
      setRoleType(tmpl.role_type || 'Operational Role');
      setSelectedPermissions(tmpl.default_permissions || []);
      toast.info(`Pre-filled permissions from template "${tmpl.template_name}"`);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('Role Name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        role_name: roleName.trim(),
        name: roleName.trim(),
        display_name: displayName.trim() || roleName.trim(),
        description: description.trim(),
        role_type: roleType,
        scope_type: scopeType,
        permissions: selectedPermissions,
        company_id: selectedCompanyId
      };

      if (editingRole) {
        await multiCompanyApi.updateRole(editingRole.id, payload);
        toast.success(`Role "${roleName}" updated successfully!`);
      } else {
        await multiCompanyApi.createCompanyRole(selectedCompanyId, payload);
        toast.success(`Role "${roleName}" registered for ${companies.find(c => c.id === selectedCompanyId)?.company_name}!`);
      }

      await fetchRolesAndTemplates(selectedCompanyId);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await multiCompanyApi.deleteRole(roleId);
      toast.success(`Role "${roleName}" deleted`);
      await fetchRolesAndTemplates(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const currentCompany = companies.find(c => c.id === selectedCompanyId) || activeCompany;

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company IAM Scope:
          </span>
          <Select 
            value={selectedCompanyId.toString()} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-black text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {currentCompany ? `${currentCompany.company_name} (${currentCompany.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Select company...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                  {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Company Role
        </Button>
      </div>

      {/* Roles Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading roles...
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-medium">
              No roles defined yet for {currentCompany?.company_name}. Click "+ Add Company Role" to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Role Name</th>
                  <th className="px-4 py-3">Role Type</th>
                  <th className="px-4 py-3">Scope Boundary</th>
                  <th className="px-4 py-3">Assigned Staff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {roles.map((r) => {
                  const isGroup = r.scope_type === 'Parent Group Access';

                  return (
                    <tr key={r.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground dark:text-neutral-200">
                            {r.name}
                          </span>
                          {r.description && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-xs">{r.description}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-foreground">
                          {r.role_type || 'Operational Role'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] font-bold px-1.5 py-0.5 ${
                            isGroup 
                              ? 'bg-[#942392]/10 text-[#942392] border-[#942392]/30' 
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {r.scope_type || 'Current Company Only'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Users className="w-3 h-3 text-[#942392]" />
                          {r.total_users || 0} Staff
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(r)}
                            className="h-7 px-2.5 text-xs font-bold border-border/60 hover:bg-muted"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>

                          {!r.is_system_role && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Role Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleSaveRole} className="flex flex-col h-full max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/40 shrink-0 bg-card dark:bg-neutral-900">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#942392]" />
                    {editingRole ? `Edit Role (${editingRole.name})` : `Create Role for ${currentCompany?.company_name}`}
                  </span>

                  {templates.length > 0 && !editingRole && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#942392]" />
                      <Select onValueChange={handleApplyTemplate}>
                        <SelectTrigger className="w-40 text-xs h-7 bg-muted/60 border-border/50">
                          <SelectValue placeholder="Use Role Template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.template_name} className="text-xs">
                              {t.template_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Role Name *</Label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Fleet Supervisor, Cashier"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Role Type</Label>
                  <Select value={roleType} onValueChange={(val: any) => setRoleType(val)}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                      <SelectValue placeholder="Role Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Management Role" className="text-xs font-bold">Management Role (Director, OM, HOD)</SelectItem>
                      <SelectItem value="Department Role" className="text-xs font-bold">Department Role (HR, Finance)</SelectItem>
                      <SelectItem value="Operational Role" className="text-xs font-bold">Operational Role (Supervisor, Leader)</SelectItem>
                      <SelectItem value="Employee Role" className="text-xs font-bold">Employee Role (Staff, Driver)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Access Scope Boundary</Label>
                  <Select value={scopeType} onValueChange={(val: any) => setScopeType(val)}>
                    <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white">
                      <SelectValue placeholder="Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Current Company Only" className="text-xs font-bold">Current Company Only (Sandboxed)</SelectItem>
                      <SelectItem value="Parent Group Access" className="text-xs font-bold">Parent Group Access (Main Company Cross-Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Role Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Operational responsibilities and scope"
                    className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block">
                  Assigned Permissions Checklist
                </Label>
                <PermissionMatrix
                  selectedKeys={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              </div>
            </div>

            {/* Modal Footer (Always pinned at bottom with zero extra white space) */}
            <div className="px-6 py-3 bg-muted/30 dark:bg-neutral-800/40 border-t border-border/40 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="h-8 text-xs font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !roleName.trim()}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase h-8 px-4 rounded-xl shadow-xs"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Save Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
