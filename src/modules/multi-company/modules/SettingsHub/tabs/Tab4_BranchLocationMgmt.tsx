import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Plus, Edit, Navigation, Sliders, Check, AlertCircle, Loader2, Moon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyBranch } from '../../../types/multiCompany.types';

export const Tab4_BranchLocationMgmt: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [locationDistrict, setLocationDistrict] = useState('');
  const [operatingZone, setOperatingZone] = useState<'Zone A' | 'Zone B'>('Zone B');
  const [latitude, setLatitude] = useState('5.3297');
  const [longitude, setLongitude] = useState('103.1370');
  const [radius, setRadius] = useState<number>(50); // Default 50m
  const [saving, setSaving] = useState(false);

  // Geofence modes modal
  const [geofenceModalOpen, setGeofenceModalOpen] = useState(false);
  const [selectedBranchForModes, setSelectedBranchForModes] = useState<CompanyBranch | null>(null);
  const [nightShiftRadius, setNightShiftRadius] = useState<number>(150);
  const [emergencyRadius, setEmergencyRadius] = useState<number>(500);

  useEffect(() => {
    if (activeCompany) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany]);

  const fetchBranches = async (cId: number) => {
    try {
      setLoading(true);
      const res = await multiCompanyApi.getCompanyBranches(cId);
      setBranches(res);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBranches(selectedCompanyId);
  }, [selectedCompanyId]);

  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setBranchCode('');
    setBranchName('');
    setLocationDistrict('');
    setOperatingZone('Zone B');
    setLatitude('5.3297');
    setLongitude('103.1370');
    setRadius(50);
    setModalOpen(true);
  };

  const handleOpenEditModal = (b: CompanyBranch) => {
    setEditingBranch(b);
    setBranchCode(b.code);
    setBranchName(b.name || b.branch || '');
    setLocationDistrict(b.location || '');
    setOperatingZone(b.operating_zone || 'Zone B');
    setLatitude(b.latitude ? b.latitude.toString() : '5.3297');
    setLongitude(b.longitude ? b.longitude.toString() : '103.1370');
    setRadius(b.radius || 50);
    setModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode.trim() || !branchName.trim()) {
      toast.error('Branch code and branch name are required');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<CompanyBranch> = {
        code: branchCode.trim().toUpperCase(),
        name: branchName.trim(),
        location: locationDistrict.trim(),
        operating_zone: operatingZone,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: Number(radius),
        company_id: selectedCompanyId
      };

      if (editingBranch) {
        await multiCompanyApi.updateBranch(editingBranch.code, payload);
        toast.success(`Updated branch ${branchName} successfully!`);
      } else {
        await multiCompanyApi.createCompanyBranch(selectedCompanyId, payload);
        toast.success(`Registered branch ${branchName} for ${companies.find(c => c.id === selectedCompanyId)?.company_name}!`);
      }

      await fetchBranches(selectedCompanyId);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving branch');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenGeofenceModes = (b: CompanyBranch) => {
    setSelectedBranchForModes(b);
    const night = b.geofence_settings?.find(g => g.mode === 'night_shift');
    const emerg = b.geofence_settings?.find(g => g.mode === 'emergency');
    setNightShiftRadius(night ? night.radius_meter : 150);
    setEmergencyRadius(emerg ? emerg.radius_meter : 500);
    setGeofenceModalOpen(true);
  };

  const handleSaveGeofenceModes = async () => {
    if (!selectedBranchForModes) return;
    try {
      setSaving(true);
      await Promise.all([
        multiCompanyApi.setBranchGeofenceMode(selectedBranchForModes.code, {
          mode: 'night_shift',
          radius_meter: nightShiftRadius,
          active_from: '20:00:00',
          active_until: '06:00:00'
        }),
        multiCompanyApi.setBranchGeofenceMode(selectedBranchForModes.code, {
          mode: 'emergency',
          radius_meter: emergencyRadius
        })
      ]);

      toast.success(`Geofence modes updated for ${selectedBranchForModes.name}`);
      await fetchBranches(selectedCompanyId);
      setGeofenceModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save modes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <MapPin className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company Branch Scope:
          </span>
          <Select 
            value={selectedCompanyId.toString()} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-black text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {companies.find(c => c.id === selectedCompanyId)?.company_name ? `${companies.find(c => c.id === selectedCompanyId)?.company_name} (${companies.find(c => c.id === selectedCompanyId)?.company_type === 'main' ? 'Main Company' : 'Subsidiary'})` : 'Select company...'}
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
          onClick={handleOpenAddModal}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Register Branch
        </Button>
      </div>

      {/* Branches Table */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading branches...
          </div>
        ) : branches.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-medium">
              No branches registered yet for {companies.find(c => c.id === selectedCompanyId)?.company_name}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Branch Name</th>
                  <th className="px-4 py-3">District / City</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">GPS Coordinates</th>
                  <th className="px-4 py-3">Normal Radius</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {branches.map((b) => (
                  <tr key={b.code} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {b.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground dark:text-neutral-200">
                      {b.name || b.branch}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.location || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-foreground">
                        {b.operating_zone || 'Zone B'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {Number(b.latitude).toFixed(4)}°, {Number(b.longitude).toFixed(4)}°
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]">
                        {b.radius || 50} meters
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenGeofenceModes(b)}
                          className="h-7 px-2 text-[10px] font-bold text-[#942392] hover:bg-[#942392]/10"
                          title="Multi-mode radius (Night shift, Emergency)"
                        >
                          <Sliders className="w-3 h-3 mr-1" />
                          Modes
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(b)}
                          className="h-7 px-2.5 text-xs font-bold border-border/60 hover:bg-muted"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Branch Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#942392]" />
              {editingBranch ? `Edit Branch (${editingBranch.code})` : 'Register New Office Branch'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBranch} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Branch Code *</Label>
                <Input
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KEM, KL, RR-01"
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Operating Zone</Label>
                <Select value={operatingZone} onValueChange={(val: any) => setOperatingZone(val)}>
                  <SelectTrigger className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800">
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zone A" className="text-xs">Zone A (Kelantan, Terengganu, Kedah, Johor)</SelectItem>
                    <SelectItem value="Zone B" className="text-xs">Zone B (KL, Selangor, Melaka, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Branch Name *</Label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Kuala Lumpur Depot & Hub"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Location / District</Label>
              <Input
                value={locationDistrict}
                onChange={(e) => setLocationDistrict(e.target.value)}
                placeholder="e.g. Bangsar South, Kuala Lumpur"
                className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-mono"
                  required
                />
              </div>
            </div>

            {/* Geofence Radius Slider */}
            <div className="p-3.5 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  GPS Geofence Clock-in Radius
                </Label>
                <span className="text-xs font-black text-[#942392] dark:text-[#f885d5] px-2 py-0.5 rounded-md bg-[#942392]/10">
                  {radius} meters
                </span>
              </div>
              <Slider
                value={[radius]}
                min={10}
                max={500}
                step={5}
                onValueChange={(val) => setRadius(val[0])}
                className="w-full py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10m (Compact)</span>
                <span className="font-bold text-[#942392]">50m (Default Rule)</span>
                <span>500m (Large Yard)</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider h-9 px-4 rounded-xl"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                {editingBranch ? 'Save Branch' : 'Register Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Multi-mode Geofence Settings Dialog */}
      {selectedBranchForModes && (
        <Dialog open={geofenceModalOpen} onOpenChange={setGeofenceModalOpen}>
          <DialogContent className="max-w-md bg-card dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#942392]" />
                Geofence Radius Modes ({selectedBranchForModes.name})
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Mode 1: Normal */}
              <div className="p-3 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/40 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Normal Office Mode</span>
                  <span className="font-mono font-bold text-[#942392]">{selectedBranchForModes.radius || 50}m</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Standard daytime check-in radius (configured in main branch editor).</p>
              </div>

              {/* Mode 2: Night Shift */}
              <div className="p-3 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    Night Shift Mode (8:00 PM – 6:00 AM)
                  </span>
                  <span className="font-mono font-bold text-[#942392]">{nightShiftRadius}m</span>
                </div>
                <Slider
                  value={[nightShiftRadius]}
                  min={50}
                  max={400}
                  step={10}
                  onValueChange={(val) => setNightShiftRadius(val[0])}
                  className="py-1"
                />
                <p className="text-[11px] text-muted-foreground">Accommodates outer lot parking & depot yard vehicle handling.</p>
              </div>

              {/* Mode 3: Emergency */}
              <div className="p-3 bg-muted/30 dark:bg-neutral-800/40 rounded-xl border border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Emergency / Weather Mode
                  </span>
                  <span className="font-mono font-bold text-[#942392]">{emergencyRadius}m</span>
                </div>
                <Slider
                  value={[emergencyRadius]}
                  min={100}
                  max={1000}
                  step={50}
                  onValueChange={(val) => setEmergencyRadius(val[0])}
                  className="py-1"
                />
                <p className="text-[11px] text-muted-foreground">Temporary extended boundary for monsoon or road closure scenarios.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setGeofenceModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGeofenceModes}
                  disabled={saving}
                  className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase h-8 px-4 rounded-xl"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                  Save Geofence Modes
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
