import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Plus, Edit, Navigation, Sliders, Check, AlertCircle, Loader2, Moon, AlertTriangle, Search, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { CompanyBranch, WorkSchedule } from '../../../types/multiCompany.types';
import {
  toProperCase,
  formatBranchDisplayName,
  parseCoordinates,
  smartGeocode,
  fastReverseGeocode,
} from '@/utils/branchUtils';
import {
  normalizeZoneCode,
  formatZoneDisplayName,
  getOperatingZoneOptionsFromSchedules,
} from '@/utils/scheduleZoneUtils';
import Map, { Marker as MapMarker, NavigationControl, useMap as useMapLibre } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPLIBRE_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-layer", type: "raster" as const, source: "osm", minzoom: 0, maxzoom: 19 }],
};

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const { current: map } = useMapLibre();
  useEffect(() => {
    if (map && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo({ center: [lng, lat], zoom: map.getZoom() || 16, duration: 800 });
    }
  }, [lat, lng, map]);
  return null;
}

export const Tab4_BranchLocationMgmt: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [locationDistrict, setLocationDistrict] = useState('');
  const [operatingZone, setOperatingZone] = useState<string>('ZONE_B');
  const [latitude, setLatitude] = useState('5.3297');
  const [longitude, setLongitude] = useState('103.1370');
  const [radius, setRadius] = useState<number>(50); // Default 50m
  const [saving, setSaving] = useState(false);
  const [modalCompanyId, setModalCompanyId] = useState<number>(selectedCompanyId);
  const [modalWorkSchedules, setModalWorkSchedules] = useState<WorkSchedule[]>([]);
  const [loadingModalSchedules, setLoadingModalSchedules] = useState<boolean>(false);

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<CompanyBranch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);

  const handleOpenDeleteModal = (b: CompanyBranch) => {
    setBranchToDelete(b);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setDeletingBranch(true);
      await multiCompanyApi.deleteBranch(branchToDelete.code);
      toast.success(`Branch ${branchToDelete.code} deleted successfully`);
      setDeleteModalOpen(false);
      setBranchToDelete(null);
      await fetchBranches(selectedCompanyId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete branch');
    } finally {
      setDeletingBranch(false);
    }
  };

  const [schedulesCache, setSchedulesCache] = useState<Record<number, WorkSchedule[]>>({});

  const zoneOptions = useMemo(
    () => getOperatingZoneOptionsFromSchedules(workSchedules, selectedCompanyId),
    [workSchedules, selectedCompanyId]
  );

  const modalZoneOptions = useMemo(
    () =>
      getOperatingZoneOptionsFromSchedules(
        modalWorkSchedules.length > 0
          ? modalWorkSchedules
          : schedulesCache[modalCompanyId] || (modalCompanyId === selectedCompanyId ? workSchedules : []),
        modalCompanyId
      ),
    [modalWorkSchedules, schedulesCache, modalCompanyId, selectedCompanyId, workSchedules]
  );

  const handleModalCompanyChange = async (compId: number) => {
    setModalCompanyId(compId);
    if (schedulesCache[compId] && schedulesCache[compId].length > 0) {
      setModalWorkSchedules(schedulesCache[compId]);
      const cachedOptions = getOperatingZoneOptionsFromSchedules(schedulesCache[compId], compId);
      if (cachedOptions.length > 0) {
        setOperatingZone(cachedOptions[0].value);
      }
    }
    setLoadingModalSchedules(true);
    try {
      const scheds = await multiCompanyApi.getCompanyWorkSchedules(compId).catch(() => []);
      setSchedulesCache(prev => ({ ...prev, [compId]: scheds }));
      setModalWorkSchedules(scheds);
      const newZoneOptions = getOperatingZoneOptionsFromSchedules(scheds, compId);
      if (newZoneOptions.length > 0) {
        setOperatingZone((prev) => {
          const stillValid = newZoneOptions.some(
            (opt) => opt.value === prev || opt.value === normalizeZoneCode(prev)
          );
          return stillValid ? prev : newZoneOptions[0].value;
        });
      }
    } catch (e) {
      console.error("Failed to load work schedules for company:", e);
    } finally {
      setLoadingModalSchedules(false);
    }
  };

  const filteredBranches = useMemo(() => {
    if (zoneFilter === 'ALL') return branches;
    return branches.filter((b) => {
      const bZone = b.operating_zone || 'STANDARD';
      return (
        bZone === zoneFilter ||
        normalizeZoneCode(b.operating_zone) === normalizeZoneCode(zoneFilter) ||
        (!b.operating_zone && zoneFilter === 'STANDARD')
      );
    });
  }, [branches, zoneFilter]);

  // Map Picker Modal states
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapLat, setMapLat] = useState('5.3297');
  const [mapLng, setMapLng] = useState('103.1370');
  const [mapAddress, setMapAddress] = useState('');
  const [pasteCoordsInput, setPasteCoordsInput] = useState('');
  const [directMapBranch, setDirectMapBranch] = useState<CompanyBranch | null>(null);
  const [savingMapCoords, setSavingMapCoords] = useState(false);

  // Geofence modes modal
  const [geofenceModalOpen, setGeofenceModalOpen] = useState(false);
  const [selectedBranchForModes, setSelectedBranchForModes] = useState<CompanyBranch | null>(null);
  const [nightShiftRadius, setNightShiftRadius] = useState<number>(150);
  const [emergencyRadius, setEmergencyRadius] = useState<number>(500);

  useEffect(() => {
    if (activeCompany?.id) setSelectedCompanyId(activeCompany.id);
  }, [activeCompany?.id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.company?.id) {
        setSelectedCompanyId(e.detail.company.id);
        void fetchBranches(e.detail.company.id);
      }
    };
    window.addEventListener('rayhar_company_switched', handler);
    return () => window.removeEventListener('rayhar_company_switched', handler);
  }, []);

  const fetchBranches = async (cId: number) => {
    try {
      setLoading(true);
      const [res, scheds] = await Promise.all([
        multiCompanyApi.getCompanyBranches(cId),
        multiCompanyApi.getCompanyWorkSchedules(cId).catch(() => []),
      ]);
      setBranches(res);
      setWorkSchedules(scheds);
      setSchedulesCache(prev => ({ ...prev, [cId]: scheds }));
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
    const curCompId = selectedCompanyId || activeCompany?.id || 1;
    setModalCompanyId(curCompId);
    const initialScheds = schedulesCache[curCompId] || (curCompId === selectedCompanyId ? workSchedules : []);
    setModalWorkSchedules(initialScheds);
    const curOptions = getOperatingZoneOptionsFromSchedules(initialScheds, curCompId);
    setOperatingZone(curOptions[0]?.value || 'STANDARD');
    setLatitude('5.3297');
    setLongitude('103.1370');
    setRadius(50);
    setModalOpen(true);
    void handleModalCompanyChange(curCompId);
  };

  const handleOpenEditModal = (b: CompanyBranch) => {
    setEditingBranch(b);
    setBranchCode(b.code);
    setBranchName(b.name || b.branch || '');
    setLocationDistrict(b.location || '');
    const curCompId = b.company_id || selectedCompanyId || activeCompany?.id || 1;
    setModalCompanyId(curCompId);
    const initialScheds = schedulesCache[curCompId] || (curCompId === selectedCompanyId ? workSchedules : []);
    setModalWorkSchedules(initialScheds);
    const curOptions = getOperatingZoneOptionsFromSchedules(initialScheds, curCompId);
    const branchZone = b.operating_zone;
    const validZone = curOptions.some(opt => opt.value === branchZone || opt.value === normalizeZoneCode(branchZone))
      ? branchZone
      : curOptions[0]?.value || 'STANDARD';
    setOperatingZone(validZone);
    setLatitude(b.latitude ? b.latitude.toString() : '5.3297');
    setLongitude(b.longitude ? b.longitude.toString() : '103.1370');
    setRadius(b.radius || 50);
    setModalOpen(true);
    void handleModalCompanyChange(curCompId);
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

  const handleOpenMapModal = () => {
    setDirectMapBranch(null);
    const curLat = latitude && !isNaN(parseFloat(latitude)) ? latitude : '5.3297';
    const curLng = longitude && !isNaN(parseFloat(longitude)) ? longitude : '103.1370';
    setMapLat(curLat);
    setMapLng(curLng);
    setPasteCoordsInput(`${curLat}, ${curLng}`);
    setMapAddress(locationDistrict || '');
    setIsMapModalOpen(true);
  };

  const handleQuickMapOpen = (b: CompanyBranch) => {
    setDirectMapBranch(b);
    const curLat = b.latitude ? String(b.latitude) : '5.3297';
    const curLng = b.longitude ? String(b.longitude) : '103.1370';
    setMapLat(curLat);
    setMapLng(curLng);
    setPasteCoordsInput(`${curLat}, ${curLng}`);
    setMapAddress(b.location || '');
    setIsMapModalOpen(true);
  };

  const handlePasteCoordsChange = (val: string) => {
    setPasteCoordsInput(val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      setMapLat(parsed.lat);
      setMapLng(parsed.lon);
    }
  };

  const handleApplyMapLocation = () => {
    let lat = parseFloat(String(mapLat));
    let lng = parseFloat(String(mapLng));
    const parsed = parseCoordinates(pasteCoordsInput);
    if (parsed) {
      lat = parsed.numLat;
      lng = parsed.numLng;
      setMapLat(parsed.lat);
      setMapLng(parsed.lon);
    }
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      setMapLat(latStr);
      setMapLng(lngStr);
      setPasteCoordsInput(`${latStr}, ${lngStr}`);
      toast.success("Coordinates applied to map!");
      fastReverseGeocode(lat, lng).then((addr) => {
        if (addr) setMapAddress(addr);
      }).catch(console.error);
    } else {
      toast.error("Please enter valid latitude (-90 to 90) and longitude (-180 to 180)");
    }
  };

  const handleSaveMapCoordinates = async () => {
    const latNum = parseFloat(String(mapLat));
    const lngNum = parseFloat(String(mapLng));
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    const latStr = latNum.toFixed(6);
    const lngStr = lngNum.toFixed(6);

    if (directMapBranch) {
      try {
        setSavingMapCoords(true);
        await multiCompanyApi.updateBranch(directMapBranch.code, {
          latitude: latNum,
          longitude: lngNum,
          location: mapAddress || directMapBranch.location
        });
        toast.success(`Coordinates saved for ${directMapBranch.name || directMapBranch.code}!`);
        setIsMapModalOpen(false);
        setDirectMapBranch(null);
        await fetchBranches(selectedCompanyId);
      } catch (err: any) {
        toast.error(err.message || 'Failed to save branch coordinates');
      } finally {
        setSavingMapCoords(false);
      }
    } else {
      setLatitude(latStr);
      setLongitude(lngStr);
      if (mapAddress) {
        setLocationDistrict(mapAddress);
      }
      setIsMapModalOpen(false);
      toast.success("Coordinates applied to branch form!");
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
        name: toProperCase(branchName.trim()),
        location: locationDistrict.trim(),
        operating_zone: operatingZone,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: Number(radius),
        company_id: modalCompanyId
      };

      if (editingBranch) {
        await multiCompanyApi.updateBranch(editingBranch.code, payload);
        toast.success(`Updated branch ${branchName} successfully!`);
      } else {
        await multiCompanyApi.createCompanyBranch(modalCompanyId, payload);
        const compName = companies.find(c => c.id === modalCompanyId)?.company_name || 'company';
        toast.success(`Registered branch ${branchName} for ${compName}!`);
      }

      if (modalCompanyId !== selectedCompanyId) {
        setSelectedCompanyId(modalCompanyId);
        await fetchBranches(modalCompanyId);
      } else {
        await fetchBranches(selectedCompanyId);
      }
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
          <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
            Company Branch Scope:
          </span>
          <Select 
            value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {(() => {
                  const found = companies.find(c => c.id === selectedCompanyId);
                  if (!found) return 'Rayhar Travels (Main Company)';
                  const cName = toProperCase(found.company_name);
                  const cType = found.company_type === 'main' ? 'Main Company' : 'Subsidiary';
                  return `${cName} (${cType})`;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                    {toProperCase(c.company_name)} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1" className="text-xs font-bold">
                  Rayhar Travels (Main Company)
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-56 h-9 px-3 rounded-xl border-border dark:border-neutral-800 bg-background dark:bg-neutral-900 text-xs font-bold shrink-0 shadow-xs">
              <SelectValue placeholder="All Operating Zones" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs font-bold">All Operating Zones</SelectItem>
              {zoneOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                  {opt.shortLabel} — {opt.scheduleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto"
        >
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
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                <tr>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Code</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Branch Name</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">District / City</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Zone</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">GPS Coordinates</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Normal Radius</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {filteredBranches.map((b) => (
                  <tr key={b.code} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-black dark:text-white">
                      {formatBranchDisplayName(b) || toProperCase(b.name || b.branch)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {b.location || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {formatZoneDisplayName(b.operating_zone || 'ZONE_B')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => handleQuickMapOpen(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#942392]/10 text-[#942392] hover:bg-[#942392]/20 font-bold font-mono transition-all border border-[#942392]/25 cursor-pointer shadow-2xs hover:scale-[1.02]"
                        title="Click to view or edit location coordinates on map"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                        <span>{Number(b.latitude || 5.3297).toFixed(4)}°, {Number(b.longitude || 103.1370).toFixed(4)}°</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]">
                        {b.radius || 50} meters
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickMapOpen(b)}
                          className="h-8 px-2.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[#942392]/10 hover:text-[#942392]"
                          title="Open map & edit coordinates"
                        >
                          <MapPin className="w-3.5 h-3.5 mr-1 text-[#942392]" />
                          Map
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenGeofenceModes(b)}
                          className="h-8 px-2.5 rounded-full text-xs font-bold text-[#942392] hover:bg-[#942392]/10"
                          title="Multi-mode radius (Night shift, Emergency)"
                        >
                          Modes
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(b)}
                          className="h-8 px-3 rounded-full text-xs font-bold border-border/80 hover:bg-muted"
                        >
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(b)}
                          className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center shrink-0 cursor-pointer"
                          title={`Delete branch ${b.code}`}
                          aria-label={`Delete branch ${b.code}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
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
        <DialogContent className="w-[calc(100vw-2.5rem)] sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card my-auto">
          <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20 shrink-0">
            <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
              {editingBranch ? 'Update branch office configuration and geofence radius' : 'Insert a new regional branch office into the database'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBranch} className="p-6 space-y-4 bg-card flex-1 overflow-y-auto">
            {/* Target Entity Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                  Target Entity
                </label>
                <span className="text-[9px] font-bold text-[#942392]">
                  {loadingModalSchedules ? "Loading Schedules..." : "Work Schedule Scope"}
                </span>
              </div>
              <Select 
                value={modalCompanyId ? modalCompanyId.toString() : "1"} 
                onValueChange={(val) => void handleModalCompanyChange(parseInt(val, 10))}
              >
                <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm">
                  <SelectValue placeholder="Select Target Entity (Company)">
                    {(() => {
                      const found = companies.find(c => c.id === modalCompanyId);
                      if (!found) return 'Rayhar Travels (Main Company)';
                      const cName = toProperCase(found.company_name);
                      const cType = found.company_type === 'main' ? 'Main Company' : 'Subsidiary';
                      return `${cName} (${cType})`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                        <span>{toProperCase(c.company_name)}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-b border-border/60 my-2" />

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Operating Zone (From Work Schedule)</label>
                <span className="text-[9px] font-bold text-[#942392]">Auto-Assigns to Target Scope</span>
              </div>
              {(() => {
                const currentModalZone = modalZoneOptions.find((o) => o.value === operatingZone || o.value === normalizeZoneCode(operatingZone))?.value || modalZoneOptions[0]?.value || 'STANDARD';
                const selectedOpt = modalZoneOptions.find((o) => o.value === currentModalZone) || modalZoneOptions[0];
                const cleanCode = branchCode.trim().toUpperCase();
                const origCode = (editingBranch?.code || '').trim().toUpperCase();
                const baseCodes = selectedOpt
                  ? (origCode ? selectedOpt.branchCodes.filter((c) => c !== origCode) : selectedOpt.branchCodes)
                  : [];
                const previewCodes = selectedOpt ? Array.from(
                  new Set([...baseCodes, ...(cleanCode ? [cleanCode] : [])])
                ).sort() : [];

                return (
                  <>
                    <Select value={currentModalZone} onValueChange={(val: any) => setOperatingZone(val)}>
                      <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm">
                        <SelectValue placeholder="Select Zone" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {modalZoneOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                            {opt.fullLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOpt && (
                      <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-neutral-800/50 border border-border/60 space-y-1.5 text-[10px]">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-black text-foreground uppercase tracking-wider">
                            Schedule: {selectedOpt.scheduleName}
                          </span>
                          <span className="font-mono font-bold text-[#942392]">
                            {selectedOpt.hoursSummary}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-bold text-muted-foreground mr-1">Target Scope:</span>
                          {previewCodes.map((c) => (
                            <span
                              key={c}
                              className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                c === cleanCode
                                  ? 'bg-[#942392] text-white'
                                  : 'bg-background dark:bg-neutral-900 text-foreground border border-border/60'
                              }`}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="border-b border-border/60 my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Coordinates</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Lat, Lng"
                    value={latitude && longitude ? `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}` : ""}
                    onClick={handleOpenMapModal}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(',')) {
                        const [lat, lng] = val.split(',').map(s => s.trim());
                        setLatitude(lat);
                        setLongitude(lng);
                      }
                    }}
                    className="w-full h-11 px-3 bg-muted/50 rounded-xl text-xs font-bold opacity-80 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleOpenMapModal}
                    className="h-11 px-3 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#942392] text-white font-black uppercase text-[10px] tracking-wider hover:bg-[#800A7A] shadow-sm transition-colors"
                    title="Select GPS coordinates on Map"
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

            <div className="border-t border-border/60 pt-3 sticky bottom-0 bg-card/95 backdrop-blur-xs flex justify-end gap-3 mt-4 -mx-5 sm:-mx-6 px-5 sm:px-6 pb-1">
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

      {/* Map Picker Modal - Identical to Branches Overview (1st Screenshot) */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-4xl max-h-[85vh] p-0 border-none shadow-2xl overflow-hidden rounded-[24px] flex flex-col [&>button]:text-white [&>button]:hover:text-white/80 z-[70] my-auto">
          <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start shrink-0">
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">
                UPDATE BRANCH LOCATION
              </DialogTitle>
              <DialogDescription className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
                UPDATE GPS COORDINATES AND ADDRESS
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
            {/* Map Area */}
            <div className="md:col-span-2 relative h-full">
              <Map
                initialViewState={{
                  longitude: (() => {
                    const v = parseFloat(String(mapLng));
                    return !isNaN(v) ? v : 103.1370;
                  })(),
                  latitude: (() => {
                    const v = parseFloat(String(mapLat));
                    return !isNaN(v) ? v : 5.3297;
                  })(),
                  zoom: 16,
                }}
                style={{ height: "100%", width: "100%" }}
                mapStyle={MAPLIBRE_STYLE}
                onLoad={(e) => {
                  const map = e.target;
                  if (map && !(map as any)._removePatched) {
                    const originalRemove = map.remove.bind(map);
                    map.remove = () => {
                      try {
                        originalRemove();
                      } catch (err) {
                        console.warn("Suppressed maplibre remove error:", err);
                      }
                    };
                    (map as any)._removePatched = true;
                  }
                }}
                onClick={(e) => {
                  const { lat, lng } = e.lngLat;
                  setMapLat(lat.toFixed(6));
                  setMapLng(lng.toFixed(6));
                  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then((res) => res.json())
                    .then((data) => {
                      if (data && data.display_name) {
                        setMapAddress(data.display_name);
                      }
                    })
                    .catch(console.error);
                }}
              >
                <NavigationControl position="top-right" />
                {(() => {
                  const _lat = parseFloat(String(mapLat));
                  const _lng = parseFloat(String(mapLng));
                  return !isNaN(_lat) && !isNaN(_lng) ? (
                    <MapMarker longitude={_lng} latitude={_lat} anchor="bottom">
                      <div style={{ width: 24, height: 36 }}>
                        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
                            fill="#942392"
                          />
                          <circle cx="12" cy="12" r="5" fill="white" />
                        </svg>
                      </div>
                    </MapMarker>
                  ) : null;
                })()}
                {(() => {
                  const _lat = parseFloat(String(mapLat));
                  const _lng = parseFloat(String(mapLng));
                  if (!isNaN(_lat) && !isNaN(_lng)) return <MapController lat={_lat} lng={_lng} />;
                  return null;
                })()}
              </Map>
            </div>

            {/* Sidebar Controls */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] print:text-[13px] font-black uppercase tracking-widest text-foreground">
                    MANUAL COORDINATES
                  </label>
                  <Input
                    value={mapLat || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(',')) {
                        const [pLat, pLng] = val.split(',').map((s) => s.trim());
                        if (pLat) setMapLat(pLat);
                        if (pLng) setMapLng(pLng);
                      } else {
                        setMapLat(val);
                      }
                    }}
                    placeholder="Latitude"
                    className="h-10 rounded-xl text-xs font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal border-purple-400 focus-visible:ring-purple-400"
                  />
                  <Input
                    value={mapLng || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(',')) {
                        const [pLat, pLng] = val.split(',').map((s) => s.trim());
                        if (pLat) setMapLat(pLat);
                        if (pLng) setMapLng(pLng);
                      } else {
                        setMapLng(val);
                      }
                    }}
                    placeholder="Longitude"
                    className="h-10 rounded-xl text-xs font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border-purple-200 dark:border-purple-800"
                    onClick={() => {
                      const lat = parseFloat(String(mapLat));
                      const lng = parseFloat(String(mapLng));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setMapLat(String(lat));
                        setMapLng(String(lng));
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                          .then((r) => r.json())
                          .then((data) => {
                            if (data && data.display_name) {
                              setMapAddress(data.display_name);
                            }
                          })
                          .catch(console.error);
                      } else {
                        toast.error("Please enter valid latitude and longitude numbers");
                      }
                    }}
                  >
                    Apply Location
                  </Button>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] print:text-[13px] font-black uppercase tracking-widest text-foreground">
                    ADDRESS / DISPLAY NAME
                  </label>
                  <div
                    className={`p-4 bg-card border rounded-xl shadow-xs text-xs leading-relaxed ${
                      mapAddress ? "text-foreground font-medium" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {mapAddress || "Select a location on the map"}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMapModalOpen(false)}
                  className="flex-1 h-11 rounded-xl text-[10px] print:text-[13px] font-black uppercase tracking-wider bg-white dark:bg-neutral-800"
                >
                  CANCEL
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const lat = parseFloat(String(mapLat));
                    const lng = parseFloat(String(mapLng));
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setLatitude(lat.toFixed(6));
                      setLongitude(lng.toFixed(6));
                    }
                    if (mapAddress) {
                      setLocationDistrict(mapAddress);
                    }
                    setIsMapModalOpen(false);
                    toast.success("Branch coordinates and address updated!");
                  }}
                  className="flex-1 h-11 rounded-xl bg-[#942392] text-white hover:bg-[#800A7A] text-[10px] print:text-[13px] font-black uppercase tracking-wider shadow-md"
                >
                  SAVE
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-mode Geofence Settings Dialog */}
      {selectedBranchForModes && (
        <Dialog open={geofenceModalOpen} onOpenChange={setGeofenceModalOpen}>
          <DialogContent className="max-w-md overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 bg-card">
            <DialogHeader className="bg-[#942392] p-6 sm:rounded-t-lg m-0 text-left border-b border-white/20">
              <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">
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
                  <span className="font-bold text-foreground">
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
                  <span className="font-bold text-foreground">
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

      {/* Delete Branch Permanently Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && setDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 border-0 border-none shadow-2xl rounded-2xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#ff0000] p-5 border-b border-red-700/30 text-left">
            <DialogTitle className="text-xl font-black text-white">
              Delete Branch Permanently
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4 bg-card">
            <p className="text-sm text-foreground">
              Are you sure you want to delete branch <strong>{branchToDelete?.code} - {branchToDelete ? (formatBranchDisplayName(branchToDelete) || toProperCase(branchToDelete.name || branchToDelete.branch || '')) : ''}</strong>?
            </p>
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3">
              <p className="text-xs text-[#ff0000] font-medium leading-relaxed">
                ⚠️ This action is permanent and cannot be undone or recovered. All employee records associated with this account will be deleted.
              </p>
            </div>
          </div>
          <DialogFooter className="p-5 pt-0 flex items-center justify-end gap-2 bg-card">
            <Button 
              variant="outline" 
              onClick={() => { setDeleteModalOpen(false); setBranchToDelete(null); }}
              disabled={deletingBranch}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDeleteBranch}
              disabled={deletingBranch}
              className="bg-[#ff0000] hover:bg-[#cc0000] text-white"
            >
              {deletingBranch ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
