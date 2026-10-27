import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Plus, Edit, Navigation, Sliders, Check, AlertCircle, Loader2, Moon, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyBranch } from '../../../types/multiCompany.types';

async function smartGeocode(address: string): Promise<{ lat: string; lon: string } | null> {
  const trySearch = async (q: string) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=my&limit=1&accept-language=en`);
      const data = await r.json();
      return data && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  };

  // Strategy 1: Full address + Malaysia
  let result = await trySearch(address + ", Malaysia");
  if (result) return result;

  // Strategy 2: Strip lot/unit numbers
  const stripped = address
    .replace(/\b(LOT|PT|NO\.?|UNIT|BLOK|BLK|KM|KILOMETER)\s*[\d\w-]+[,\s]*/gi, '')
    .replace(/^[,\s]+/, '').trim();
  if (stripped && stripped !== address) {
    result = await trySearch(stripped + ", Malaysia");
    if (result) return result;
  }

  // Strategy 3: Extract words that look like town/city
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const partial = parts.slice(i).join(', ');
    if (partial.length > 3) {
      result = await trySearch(partial + ", Malaysia");
      if (result) return result;
    }
  }

  // Strategy 4: Try just last 2 parts
  if (parts.length >= 2) {
    result = await trySearch(parts.slice(-2).join(', ') + ", Malaysia");
    if (result) return result;
  }
  return null;
}

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

  const handleSmartSearch = async () => {
    if (!locationDistrict.trim()) return;
    toast.loading("Searching coordinates...");
    try {
      const res = await smartGeocode(locationDistrict);
      toast.dismiss();
      if (res) {
        setLatitude(res.lat);
        setLongitude(res.lon);
        toast.success("Coordinates found & updated!");
      } else {
        toast.error("Could not find coordinates. Try entering town or city name.");
      }
    } catch {
      toast.dismiss();
      toast.error("Search failed");
    }
  };

  const handleSelectCoords = () => {
    if (navigator.geolocation) {
      toast.loading("Detecting current GPS coordinates...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          toast.dismiss();
          setLatitude(pos.coords.latitude.toFixed(4));
          setLongitude(pos.coords.longitude.toFixed(4));
          toast.success("GPS Location detected!");
        },
        () => {
          toast.dismiss();
          const manual = prompt("Enter GPS Coordinates (latitude, longitude):", `${latitude}, ${longitude}`);
          if (manual && manual.includes(',')) {
            const [lat, lng] = manual.split(',').map(s => s.trim());
            setLatitude(lat);
            setLongitude(lng);
            toast.success("Coordinates updated!");
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      const manual = prompt("Enter GPS Coordinates (latitude, longitude):", `${latitude}, ${longitude}`);
      if (manual && manual.includes(',')) {
        const [lat, lng] = manual.split(',').map(s => s.trim());
        setLatitude(lat);
        setLongitude(lng);
        toast.success("Coordinates updated!");
      }
    }
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
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                <tr>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Branch Name</th>
                  <th className="px-4 py-3.5">District / City</th>
                  <th className="px-4 py-3.5">Zone</th>
                  <th className="px-4 py-3.5">GPS Coordinates</th>
                  <th className="px-4 py-3.5">Normal Radius</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {branches.map((b) => (
                  <tr key={b.code} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-black dark:text-white">
                      {b.name || b.branch}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {b.location || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {b.operating_zone || 'Zone B'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {Number(b.latitude).toFixed(4)}°, {Number(b.longitude).toFixed(4)}°
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-[#942392] dark:text-[#f885d5]">
                        {b.radius || 50} meters
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenGeofenceModes(b)}
                          className="h-8 px-3 rounded-full text-xs font-bold text-[#942392] hover:bg-[#942392]/10"
                          title="Multi-mode radius (Night shift, Emergency)"
                        >
                          <Sliders className="w-3.5 h-3.5 mr-1" />
                          Modes
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(b)}
                          className="h-8 px-3 rounded-full text-xs font-bold border-border/80 hover:bg-muted"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
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

      {/* Add / Edit Branch Dialog (Matching Screenshot 3 / Branches.tsx) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
          <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
            <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
              {editingBranch ? 'Update branch office configuration and geofence radius' : 'Insert a new regional branch office into the database'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBranch} className="p-6 space-y-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Code</label>
                <Input
                  placeholder="e.g. AOR"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Name</label>
                <Input
                  placeholder="e.g. ALOR SETAR"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold placeholder:normal-case uppercase outline-none"
                  required
                />
              </div>
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="space-y-1.5 relative">
              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location / District</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type address & press Enter or click 🔍"
                  value={locationDistrict}
                  onChange={(e) => setLocationDistrict(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSmartSearch();
                    }
                  }}
                  className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold"
                />
                <button
                  type="button"
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-[#942392]/10 text-[#942392] hover:bg-[#942392]/20 transition-colors border border-[#942392]/20"
                  onClick={() => void handleSmartSearch()}
                  title="Search coordinates"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Operating Zone</label>
              <Select value={operatingZone} onValueChange={(val: any) => setOperatingZone(val)}>
                <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Zone A" className="text-xs font-bold">ZONE A (EAST COAST/JDT - FRI/SAT OFF)</SelectItem>
                  <SelectItem value="Zone B" className="text-xs font-bold">ZONE B (WEST COAST - SAT/SUN OFF)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Coordinates</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Lat, Lng"
                    value={latitude && longitude ? `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}` : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(',')) {
                        const [lat, lng] = val.split(',').map(s => s.trim());
                        setLatitude(lat);
                        setLongitude(lng);
                      }
                    }}
                    className="w-full h-11 px-3 bg-muted/50 rounded-xl text-xs font-bold opacity-80"
                  />
                  <button
                    type="button"
                    onClick={handleSelectCoords}
                    className="h-11 px-3 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#942392] text-white font-black uppercase text-[10px] tracking-wider hover:bg-[#800A7A] shadow-sm"
                    title="Select GPS coordinates"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Select
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Radius</label>
                  <span className="text-[9px] font-black text-[#942392]">0m - 500m</span>
                </div>
                <div className="flex items-center gap-4 h-11 px-3 bg-muted/20 border border-border/50 rounded-xl">
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={radius || 50}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #942392 0%, #942392 ${(((Number(radius || 50) - 0) / 500) * 100)}%, #e5e7eb ${(((Number(radius || 50) - 0) / 500) * 100)}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="text-[10px] font-black w-10 text-right bg-[#942392]/10 text-[#942392] py-1 px-1.5 rounded-md">
                    {radius}m
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl text-xs font-black uppercase">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Saving..." : (editingBranch ? "Save Branch" : "+ Add Branch")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Multi-mode Geofence Settings Dialog */}
      {selectedBranchForModes && (
        <Dialog open={geofenceModalOpen} onOpenChange={setGeofenceModalOpen}>
          <DialogContent className="max-w-md overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
            <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
              <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-white" />
                Geofence Radius Modes
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
                {selectedBranchForModes.name} ({selectedBranchForModes.code})
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 text-xs bg-card">
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

              <div className="border-t border-border/60 pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setGeofenceModalOpen(false)} className="rounded-xl text-xs font-black uppercase">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGeofenceModes}
                  disabled={saving}
                  className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  Save Radius Policies
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
