import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Edit, Image as ImageIcon, MapPin, Users, Check, AlertCircle, Loader2, ArrowRight, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { Company } from '../../../types/multiCompany.types';
import { CompanyLogoUploader } from '../../../components/CompanyLogoUploader';

interface Tab3CompanyMgmtProps {
  onNavigateToTab?: (tabKey: string, companyId?: number) => void;
}

export const Tab3_CompanyMgmt: React.FC<Tab3CompanyMgmtProps> = ({ onNavigateToTab }) => {
  const navigate = useNavigate();
  const { companies, refreshCompanies, activeCompany, setActiveCompanyId } = useCompany();

  useEffect(() => {
    void refreshCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [selectedForLogo, setSelectedForLogo] = useState<Company | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [parentCompanyId, setParentCompanyId] = useState<number | null>(null);
  const [companyType, setCompanyType] = useState<'main' | 'subsidiary'>('subsidiary');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  const handleOpenAddModal = () => {
    setEditingCompany(null);
    setCompanyName('');
    setParentCompanyId(1); // Default to Rayhar Travels as parent
    setCompanyType('subsidiary');
    setAddress('');
    setEmail('');
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: Company) => {
    setEditingCompany(c);
    setCompanyName(c.company_name);
    setParentCompanyId(c.parent_company_id || null);
    setCompanyType(c.company_type);
    setAddress(c.company_address || '');
    setEmail(c.email || '');
    setStatus(c.status);
    setModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingCompany) {
        await multiCompanyApi.updateCompany(editingCompany.id, {
          company_name: companyName.trim(),
          parent_company_id: parentCompanyId,
          company_type: companyType,
          company_address: address,
          email,
          status
        });
        toast.success(`Updated ${companyName} successfully!`);
      } else {
        const created = await multiCompanyApi.createCompany({
          company_name: companyName.trim(),
          parent_company_id: parentCompanyId,
          company_type: companyType,
          company_address: address,
          email,
          status
        });
        toast.success(`Registered new subsidiary ${created.company_name}!`);
      }

      await refreshCompanies();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#942392]" />
            Corporate Entity & Subsidiary Management
          </h3>
          <p className="text-xs text-muted-foreground dark:text-neutral-400 mt-0.5">
            Register holding entities and operational subsidiaries, upload logos, and inspect active branch placements.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Register New Company
        </Button>
      </div>

      {/* Companies Listing Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-xs font-black uppercase tracking-wider text-black dark:text-white">
              <tr>
                <th className="px-4 py-3.5">Branding</th>
                <th className="px-4 py-3.5">Company Name</th>
                <th className="px-4 py-3.5">Structure Tier</th>
                <th className="px-4 py-3.5">Parent Holding</th>
                <th className="px-4 py-3.5">Branches & Geofence</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 text-[#942392]/40 mx-auto mb-2" />
                    <p className="font-bold text-xs uppercase tracking-wider text-foreground">No corporate entities found</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Click "Register New Company" to create an entity.</p>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                const isMain = c.company_type === 'main' || !c.parent_company_id;
                const isSelected = c.id === activeCompany?.id;

                return (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors ${
                      isSelected ? 'bg-[#942392]/5' : ''
                    }`}
                  >
                    {/* Logo */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-7 rounded-md bg-white dark:bg-neutral-800 border border-border/50 dark:border-neutral-700 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span className="font-black text-xs text-[#942392]">
                            {c.company_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black dark:text-white">
                          {c.company_name}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </div>
                    </td>

                    {/* Structure Tier */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${
                        isMain 
                          ? 'border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:border-[#942392]/40 dark:bg-[#942392]/20 dark:text-[#f885d5]' 
                          : 'border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      }`}>
                        {isMain ? 'Main Company' : 'Subsidiary'}
                      </span>
                    </td>

                    {/* Parent Holding */}
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-medium">
                      {isMain ? '— (Root Holding)' : c.parent_company_name || 'Rayhar Travels'}
                    </td>

                    {/* Branches Summary Pill (Touchpoint) */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          if (onNavigateToTab) onNavigateToTab('branch', c.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                        title="Click to view & configure branches for this company"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#942392]" />
                        <span>{c.branches_count || 0} Branches</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground ml-0.5" />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        c.status === 'active' 
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                          : 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedForLogo(c);
                            setLogoModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Upload or change logo"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveCompanyId(c.id);
                            navigate('/organization/modules');
                          }}
                          className="h-8 px-3 rounded-full text-xs font-bold text-[#942392] border-[#942392]/30 bg-[#942392]/5 hover:bg-[#942392]/10"
                          title="Configure modules enabled for this company"
                        >
                          <Boxes className="w-3.5 h-3.5 mr-1" />
                          Modules
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-8 px-3 rounded-full text-xs font-bold border-border/80 hover:bg-muted"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Company Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
          <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
            <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-white" />
              {editingCompany ? `Edit ${editingCompany.company_name}` : 'Register New Subsidiary / Company'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
              {editingCompany ? 'Modify corporate entity configurations & details' : 'Create and onboard a new corporate entity under Rayhar Group'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCompany} className="p-6 space-y-4 bg-card">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. RayRent Sdn Bhd"
                className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
                required
              />
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Company Type</Label>
                <Select value={companyType} onValueChange={(val: any) => setCompanyType(val)}>
                  <SelectTrigger className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="main" className="text-xs font-bold">Main Holding Company</SelectItem>
                    <SelectItem value="subsidiary" className="text-xs font-bold">Subsidiary Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Parent Holding Entity</Label>
                <Select 
                  value={parentCompanyId ? parentCompanyId.toString() : 'root'} 
                  onValueChange={(val) => setParentCompanyId(val === 'root' ? null : parseInt(val, 10))}
                  disabled={companyType === 'main'}
                >
                  <SelectTrigger className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white rounded-xl">
                    <SelectValue placeholder="Parent Entity" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="root" className="text-xs font-bold">None (Root Holding Entity)</SelectItem>
                    {companies.filter(c => !editingCompany || c.id !== editingCompany.id).map(c => (
                      <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Contact Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="text-xs h-10 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-medium data-[placeholder]:font-normal text-black dark:text-white rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active" className="text-xs font-bold">Active Entity</SelectItem>
                    <SelectItem value="inactive" className="text-xs font-bold">Inactive Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Registered Office Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter physical address..."
                className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 min-h-[70px] font-medium placeholder:font-normal text-black dark:text-white rounded-xl"
              />
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs font-black uppercase"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                {editingCompany ? 'Save Changes' : 'Register Entity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Logo Modal */}
      {selectedForLogo && (
        <Dialog open={logoModalOpen} onOpenChange={setLogoModalOpen}>
          <DialogContent className="max-w-lg overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
            <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
              <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-white" />
                Branding for {selectedForLogo.company_name}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
                Upload and configure corporate logo for reports & navigation
              </DialogDescription>
            </DialogHeader>

            <div className="p-6">
              <CompanyLogoUploader
                companyId={selectedForLogo.id}
                companyName={selectedForLogo.company_name}
                currentLogoUrl={selectedForLogo.logo_url}
                onLogoUpdated={async () => {
                  await refreshCompanies();
                  setLogoModalOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
