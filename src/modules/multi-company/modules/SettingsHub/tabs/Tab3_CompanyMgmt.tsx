import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Edit, Image as ImageIcon, MapPin, Users, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { Company } from '../../../types/multiCompany.types';
import { CompanyLogoUploader } from '../../../components/CompanyLogoUploader';

interface Tab3CompanyMgmtProps {
  onNavigateToTab?: (tabKey: string, companyId?: number) => void;
}

export const Tab3_CompanyMgmt: React.FC<Tab3CompanyMgmtProps> = ({ onNavigateToTab }) => {
  const { companies, refreshCompanies, activeCompany, setActiveCompanyId } = useCompany();

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
            <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Branding</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Structure Tier</th>
                <th className="px-4 py-3">Parent Holding</th>
                <th className="px-4 py-3">Branches & Geofence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
              {companies.map((c) => {
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground dark:text-neutral-200">
                          {c.company_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{c.email}</span>
                      </div>
                    </td>

                    {/* Structure Tier */}
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] font-bold px-2 py-0.5 ${
                          isMain 
                            ? 'bg-[#942392]/10 text-[#942392] border-[#942392]/30' 
                            : 'bg-muted text-foreground border-border'
                        }`}
                      >
                        {isMain ? 'Main Company' : 'Subsidiary'}
                      </Badge>
                    </td>

                    {/* Parent Holding */}
                    <td className="px-4 py-3 text-muted-foreground font-medium">
                      {isMain ? '— (Root Holding)' : c.parent_company_name || 'Rayhar Travels'}
                    </td>

                    {/* Branches Summary Pill (Touchpoint) */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          if (onNavigateToTab) onNavigateToTab('branch', c.id);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/70 hover:bg-muted dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[10px] font-bold text-foreground transition-colors border border-border/50"
                        title="Click to view & configure branches for this company"
                      >
                        <MapPin className="w-3 h-3 text-[#942392]" />
                        <span>{c.branches_count || 0} Branches</span>
                        <ArrowRight className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedForLogo(c);
                            setLogoModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Upload or change logo"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-7 px-2.5 text-xs font-bold border-border/60 hover:bg-muted"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Company Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#942392]" />
              {editingCompany ? `Edit ${editingCompany.company_name}` : 'Register New Subsidiary / Company'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCompany} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. RayRent Sdn Bhd"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Company Type</Label>
                <Select value={companyType} onValueChange={(val: any) => setCompanyType(val)}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main" className="text-xs">Main Holding Company</SelectItem>
                    <SelectItem value="subsidiary" className="text-xs">Subsidiary Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Parent Holding Entity</Label>
                <Select 
                  value={parentCompanyId ? parentCompanyId.toString() : 'root'} 
                  onValueChange={(val) => setParentCompanyId(val === 'root' ? null : parseInt(val, 10))}
                  disabled={companyType === 'main'}
                >
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder="Parent Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root" className="text-xs">None (Root Holding Entity)</SelectItem>
                    {companies.filter(c => !editingCompany || c.id !== editingCompany.id).map(c => (
                      <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Contact Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active Entity</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Registered Office Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter physical address..."
                className="text-xs bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider h-9 px-4 rounded-xl"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                {editingCompany ? 'Save Changes' : 'Register Entity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Logo Modal */}
      {selectedForLogo && (
        <Dialog open={logoModalOpen} onOpenChange={setLogoModalOpen}>
          <DialogContent className="max-w-lg bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white">
                Branding for {selectedForLogo.company_name}
              </DialogTitle>
            </DialogHeader>

            <CompanyLogoUploader
              companyId={selectedForLogo.id}
              companyName={selectedForLogo.company_name}
              currentLogoUrl={selectedForLogo.logo_url}
              onLogoUpdated={async () => {
                await refreshCompanies();
                setLogoModalOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
