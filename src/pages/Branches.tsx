import { sanitizeUrl, safeFileUrl } from '@/utils/security';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Clock,
  Loader2,
  MapPin,
  TrendingUp,
  Users, User,
  FileText,
  PhoneCall,
  X,
  Trash2,
  LayoutGrid,
  List,
  Plus,
  Search,
  UserCheck, Leaf, Briefcase, UserX } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "../config/api";
import { MapContainer, TileLayer, Marker as LeafletMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createBranchPinIcon = () =>
  L.divIcon({
    className: 'branch-location-pin',
    html: `<div style="width: 28px; height: 40px; display: flex; align-items: flex-end; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); cursor: grab;">
      <svg viewBox="0 0 24 36" width="28" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#942392"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });

function BranchLocationPickerMap({
  lat,
  lng,
  onPickLocation,
}: {
  lat: number;
  lng: number;
  onPickLocation: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const markerRef = useRef<any>(null);

  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (!isNaN(lat) && !isNaN(lng)) {
      try {
        map.flyTo([lat, lng], map.getZoom() || 16, { duration: 0.8 });
      } catch (e) {
        // ignore
      }
    }
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onPickLocation(e.latlng.lat, e.latlng.lng);
    },
  });

  const pinIcon = useMemo(() => createBranchPinIcon(), []);

  return (
    <LeafletMarker
      ref={markerRef}
      position={[lat, lng]}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (marker != null) {
            const pos = marker.getLatLng();
            onPickLocation(pos.lat, pos.lng);
          }
        },
      }}
    />
  );
}

// Convert any string to Proper Case (title case), e.g. "SEPANG" -> "Sepang"
import {
  toProperCase,
  parseCoordinates,
  smartGeocode,
  fastReverseGeocode,
} from "@/utils/branchUtils";
import { useCompany } from "@/modules/multi-company/contexts/CompanyContext";
import { multiCompanyApi } from "@/modules/multi-company/services/multiCompanyApi";
import { WorkSchedule } from "@/modules/multi-company/types/multiCompany.types";
import {
  getBranchOperatingHoursDisplay,
  getOperatingZoneOptionsFromSchedules,
  normalizeZoneCode,
  formatZoneDisplayName,
} from "@/utils/scheduleZoneUtils";


import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { getCleanReason } from "@/lib/leaveStorage";
import PageActions from "@/components/layout/PageActions";

const branches = [
  {
    code: "HQ",
    name: "Rayhar HQ",
    location: "Kemaman,Terengganu",
    leader: "MD KHAN IDRIS BIN MD KHAN IBRAHIM",
  },
  {
    code: "KMM",
    name: "Kemaman",
    location: "Kemaman,Terengganu",
    leader: "-",
  },
  {
    code: "CNH",
    name: "Cheneh",
    location: "Kemaman,Terengganu",
    leader: "-",
  },
  {
    code: "KBG",
    name: "Kuala Berang",
    location: "Hulu Terengganu,Terengganu",
    leader: "-",
  },
  {
    code: "TGG",
    name: "Kuala Terengganu",
    location: "Kuala Terengganu,Terengganu",
    leader: "-",
  },
  {
    code: "DGN",
    name: "Dungun",
    location: "Dungun,Terengganu",
    leader: "-",
  },
  {
    code: "JTH",
    name: "Jertih",
    location: "Besut,Terengganu",
    leader: "-",
  },
  {
    code: "KBR",
    name: "Kota Bharu",
    location: "Kota Bharu,Kelantan",
    leader: "-",
  },
  {
    code: "RMP",
    name: "Rompin",
    location: "Rompin,Pahang",
    leader: "-",
  },
  {
    code: "MZM",
    name: "Muadzam Shah",
    location: "Muadzam Shah,Pahang",
    leader: "-",
  },
  {
    code: "SHA",
    name: "Shah Alam",
    location: "Shah Alam,Selangor",
    leader: "-",
  },
  {
    code: "BBB",
    name: "Bandar Baru Bangi",
    location: "Bandar Baru Bangi,Selangor",
    leader: "-",
  },
  {
    code: "KUL",
    name: "Kuala Lumpur",
    location: "Kuala Lumpur,Wilayah Persekutuan",
    leader: "-",
  },
  { code: "IPH", name: "Ipoh", location: "Ipoh,Perak", leader: "-" },
  {
    code: "MJG",
    name: "Manjung",
    location: "Manjung,Perak",
    leader: "-",
  },
  {
    code: "KKS",
    name: "Kuala Kangsar",
    location: "Kuala Kangsar,Perak",
    leader: "-",
  },
  {
    code: "MLK",
    name: "Melaka",
    location: "Melaka,Melaka",
    leader: "-",
  },
  {
    code: "AOR",
    name: "Alor Setar",
    location: "Alor Setar,Kedah",
    leader: "-",
  },
  {
    code: "BTM",
    name: "Bertam",
    location: "Bertam,Pulau Pinang",
    leader: "-",
  },
  {
    code: "SNS",
    name: "Seremban",
    location: "Seremban,Negeri Sembilan",
    leader: "-",
  },
  {
    code: "BTP",
    name: "Batu Pahat",
    location: "Batu Pahat,Johor",
    leader: "-",
  },
  {
    code: "JB",
    name: "Johor Bharu",
    location: "Johor Bharu,Johor",
    leader: "-",
  },
  {
    code: "TWU",
    name: "Tawau",
    location: "Tawau,Sabah",
    leader: "-",
  },
];

const getBranchLeaderInfo = (branch: any) => {
  const isHQ = (branch?.code || "").toUpperCase() === "HQ";
  const roleLabel = isHQ ? "MANAGING DIRECTOR:" : "BRANCH LEADER:";
  const tableRoleLabel = isHQ ? "Managing Director" : "Branch Leader";

  let name = (branch?.leader_name || "").trim();
  if (!name) {
    if (isHQ) {
      name = "MD KHAN IDRIS BIN MD KHAN IBRAHIM";
    } else {
      name = "-";
    }
  }
  return { isHQ, roleLabel, tableRoleLabel, name };
};


type BranchEmployee = {
  department?: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  today_status: string;
  annual_leave_balance: number;
  pending_leaves: number;
  approved_leaves: number;
  rejected_leaves: number;
  total_leave_requests: number;
  mc_leaves: number;
  days_present: number;
  attendance_rate: number | null;
};

function renderTodayStatusBadge(status: string) {
  const baseClasses = "inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] whitespace-nowrap";

  if (status === "Present (On Time)" || status === "Present") {
    return (
      <span className={`${baseClasses} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30`}>
        {status}
      </span>
    );
  }
  if (status === "Present (Late)") {
    return (
      <span className={`${baseClasses} bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30`}>
        {status}
      </span>
    );
  }
  if (status === "Outstation") {
    return (
      <span className={`${baseClasses} bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30`}>
        {status}
      </span>
    );
  }
  if (status === "On Leave") {
    return (
      <span className={`${baseClasses} bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30`}>
        {status}
      </span>
    );
  }
  if (status === "Company Leave") {
    return (
      <span className={`${baseClasses} bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30`}>
        {status}
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30`}>
      {status || "Absent"}
    </span>
  );
}

export default function Branches() {
  const navigate = useNavigate();
  const { activeCompany, companies } = useCompany();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const branchParam = searchParams.get("branch");

  const handleSelectBranch = (branchData: any) => {
    setSearchParams({ branch: branchData.code });
    setSelectedBranch(branchData);
  };

  const handleBackToBranches = () => {
    setSearchParams({});
    setSelectedBranch(null);
  };

  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(10);
  const personnelTableRef = useRef<HTMLTableElement>(null);
  const branchesTableRef = useRef<HTMLTableElement>(null);
  const [temporaryStaff, setTemporaryStaff] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handlePrint = useReactToPrint({});
  const [loading, setLoading] = useState(false);
  const [viewLeaveStatus, setViewLeaveStatus] = useState<
    "Approved" | "Pending" | "Rejected" | null
  >(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "line">(() => {
    return (
      (localStorage.getItem("branchesViewMode") as "grid" | "line") || "grid"
    );
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [schedulesCache, setSchedulesCache] = useState<Record<number, WorkSchedule[]>>({});
  const [addModalWorkSchedules, setAddModalWorkSchedules] = useState<WorkSchedule[]>([]);
  const [editModalWorkSchedules, setEditModalWorkSchedules] = useState<WorkSchedule[]>([]);
  const [loadingAddSchedules, setLoadingAddSchedules] = useState(false);
  const [loadingEditSchedules, setLoadingEditSchedules] = useState(false);

  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [editBranchData, setEditBranchData] = useState<any>({});

  // Add New Branch State
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [addBranchData, setAddBranchData] = useState<any>({
    code: "",
    name: "",
    location: "",
    operating_zone: "STANDARD",
    latitude: "",
    longitude: "",
    radius: "50",
    company_id: activeCompany?.id || 1,
  });

  const zoneOptions = useMemo(
    () => getOperatingZoneOptionsFromSchedules(workSchedules, selectedCompanyId),
    [workSchedules, selectedCompanyId]
  );

  const addZoneOptions = useMemo(
    () =>
      getOperatingZoneOptionsFromSchedules(
        addModalWorkSchedules.length > 0
          ? addModalWorkSchedules
          : schedulesCache[addBranchData.company_id] || (addBranchData.company_id === selectedCompanyId ? workSchedules : []),
        addBranchData.company_id
      ),
    [addModalWorkSchedules, schedulesCache, addBranchData.company_id, selectedCompanyId, workSchedules]
  );

  const editZoneOptions = useMemo(
    () =>
      getOperatingZoneOptionsFromSchedules(
        editModalWorkSchedules.length > 0
          ? editModalWorkSchedules
          : schedulesCache[editBranchData.company_id] || (editBranchData.company_id === selectedCompanyId ? workSchedules : []),
        editBranchData.company_id
      ),
    [editModalWorkSchedules, schedulesCache, editBranchData.company_id, selectedCompanyId, workSchedules]
  );

  const handleAddCompanyChange = async (compId: number) => {
    setAddBranchData((prev: any) => ({ ...prev, company_id: compId }));
    if (schedulesCache[compId] && schedulesCache[compId].length > 0) {
      setAddModalWorkSchedules(schedulesCache[compId]);
      const cachedOptions = getOperatingZoneOptionsFromSchedules(schedulesCache[compId], compId);
      if (cachedOptions.length > 0) {
        setAddBranchData((prev: any) => ({ ...prev, company_id: compId, operating_zone: cachedOptions[0].value }));
      }
    }
    setLoadingAddSchedules(true);
    try {
      const scheds = await multiCompanyApi.getCompanyWorkSchedules(compId).catch(() => []);
      setSchedulesCache(prev => ({ ...prev, [compId]: scheds }));
      setAddModalWorkSchedules(scheds);
      const newZoneOptions = getOperatingZoneOptionsFromSchedules(scheds, compId);
      if (newZoneOptions.length > 0) {
        setAddBranchData((prev: any) => {
          const currentZone = prev.operating_zone;
          const stillValid = newZoneOptions.some(
            (opt) => opt.value === currentZone || opt.value === normalizeZoneCode(currentZone)
          );
          return stillValid ? prev : { ...prev, operating_zone: newZoneOptions[0].value };
        });
      }
    } catch (e) {
      console.error("Failed to load schedules for company:", e);
    } finally {
      setLoadingAddSchedules(false);
    }
  };

  const handleEditCompanyChange = async (compId: number) => {
    setEditBranchData((prev: any) => ({ ...prev, company_id: compId }));
    if (schedulesCache[compId] && schedulesCache[compId].length > 0) {
      setEditModalWorkSchedules(schedulesCache[compId]);
      const cachedOptions = getOperatingZoneOptionsFromSchedules(schedulesCache[compId], compId);
      if (cachedOptions.length > 0) {
        setEditBranchData((prev: any) => ({ ...prev, company_id: compId, operating_zone: cachedOptions[0].value }));
      }
    }
    setLoadingEditSchedules(true);
    try {
      const scheds = await multiCompanyApi.getCompanyWorkSchedules(compId).catch(() => []);
      setSchedulesCache(prev => ({ ...prev, [compId]: scheds }));
      setEditModalWorkSchedules(scheds);
      const newZoneOptions = getOperatingZoneOptionsFromSchedules(scheds, compId);
      if (newZoneOptions.length > 0) {
        setEditBranchData((prev: any) => {
          const currentZone = prev.operating_zone;
          const stillValid = newZoneOptions.some(
            (opt) => opt.value === currentZone || opt.value === normalizeZoneCode(currentZone)
          );
          return stillValid ? prev : { ...prev, operating_zone: newZoneOptions[0].value };
        });
      }
    } catch (e) {
      console.error("Failed to load schedules for company:", e);
    } finally {
      setLoadingEditSchedules(false);
    }
  };
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [pasteCoordsInput, setPasteCoordsInput] = useState('');
  const [mapTargetModal, setMapTargetModal] = useState<'add' | 'edit'>('edit');

  const openMapForAddBranch = () => {
    setMapTargetModal('add');
    const lat = addBranchData.latitude || '5.3297';
    const lng = addBranchData.longitude || '103.1370';
    setPasteCoordsInput(addBranchData.latitude && addBranchData.longitude ? `${addBranchData.latitude}, ${addBranchData.longitude}` : '');
    setEditBranchData((prev: any) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: addBranchData.location || ''
    }));
    setIsMapModalOpen(true);
  };

  const openMapForEditBranch = () => {
    setMapTargetModal('edit');
    const lat = editBranchData.latitude || '5.3297';
    const lng = editBranchData.longitude || '103.1370';
    setPasteCoordsInput(editBranchData.latitude && editBranchData.longitude ? `${editBranchData.latitude}, ${editBranchData.longitude}` : '');
    setIsMapModalOpen(true);
  };

  const handlePasteCoordsChange = (val: string) => {
    setPasteCoordsInput(val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      setEditBranchData((prev: any) => ({
        ...prev,
        latitude: parsed.lat,
        longitude: parsed.lon,
      }));
    }
  };

  const handleApplyLocation = () => {
    let lat = parseFloat(String(editBranchData.latitude));
    let lng = parseFloat(String(editBranchData.longitude));
    const parsed = parseCoordinates(pasteCoordsInput);
    if (parsed) {
      lat = parsed.numLat;
      lng = parsed.numLng;
    }
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      setEditBranchData((prev: any) => ({
        ...prev,
        latitude: latStr,
        longitude: lngStr
      }));
      setPasteCoordsInput(`${latStr}, ${lngStr}`);
      toast.success("Coordinates applied to map!");
      fastReverseGeocode(lat, lng).then((addr) => {
        if (addr) setEditBranchData((prev: any) => ({ ...prev, location: addr }));
      }).catch(console.error);
    } else {
      toast.error("Please enter valid latitude (-90 to 90) and longitude (-180 to 180)");
    }
  };

  const handleSaveMapCoordinates = () => {
    const latNum = parseFloat(String(editBranchData.latitude));
    const lngNum = parseFloat(String(editBranchData.longitude));
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    const latStr = latNum.toFixed(6);
    const lngStr = lngNum.toFixed(6);

    if (mapTargetModal === 'add') {
      setAddBranchData((prev: any) => ({
        ...prev,
        latitude: latStr,
        longitude: lngStr,
        location: editBranchData.location || prev.location
      }));
    } else {
      setEditBranchData((prev: any) => ({
        ...prev,
        latitude: latStr,
        longitude: lngStr
      }));
    }
    setIsMapModalOpen(false);
    toast.success("Branch coordinates updated!");
  };

  const openAddModal = () => {
    const curCompId = selectedCompanyId || activeCompany?.id || 1;
    const initialScheds = schedulesCache[curCompId] || (curCompId === selectedCompanyId ? workSchedules : []);
    const curOptions = getOperatingZoneOptionsFromSchedules(initialScheds, curCompId);
    setAddModalWorkSchedules(initialScheds);
    setAddBranchData({
      code: "",
      name: "",
      location: "",
      operating_zone: curOptions[0]?.value || "STANDARD",
      latitude: "",
      longitude: "",
      radius: "50",
      company_id: curCompId,
    });
    setIsAddBranchModalOpen(true);
    void handleAddCompanyChange(curCompId);
  };

  const openEditModal = () => {
    const curCompId = selectedBranch.company_id || selectedCompanyId || activeCompany?.id || 1;
    const initialScheds = schedulesCache[curCompId] || (curCompId === selectedCompanyId ? workSchedules : []);
    const curOptions = getOperatingZoneOptionsFromSchedules(initialScheds, curCompId);
    setEditModalWorkSchedules(initialScheds);
    const branchZone = selectedBranch.operating_zone;
    const validZone = curOptions.some(opt => opt.value === branchZone || opt.value === normalizeZoneCode(branchZone))
      ? branchZone
      : curOptions[0]?.value || "STANDARD";
    setEditBranchData({
      original_code: selectedBranch.code,
      code: selectedBranch.code,
      name: selectedBranch.name,
      location: selectedBranch.location || "",
      operating_zone: validZone,
      latitude: selectedBranch.latitude || "",
      longitude: selectedBranch.longitude || "",
      radius: selectedBranch.radius || 50,
      company_id: curCompId,
    });
    setIsEditBranchModalOpen(true);
    void handleEditCompanyChange(curCompId);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBranchData.code || !addBranchData.name) {
      toast.error("Branch Code and Name are required");
      return;
    }
    setIsSubmittingBranch(true);
    try {
      const targetCompId = addBranchData.company_id || selectedCompanyId || activeCompany?.id || 1;
      const response = await fetch(`${API_BASE_URL}/api/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addBranchData.code.trim().toUpperCase(),
          name: toProperCase(addBranchData.name.trim()),
          location: addBranchData.location.trim(),
          operating_zone: addBranchData.operating_zone,
          latitude: parseFloat(addBranchData.latitude) || null,
          longitude: parseFloat(addBranchData.longitude) || null,
          radius: parseFloat(addBranchData.radius) || 50,
          company_id: targetCompId,
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const compName = companies.find(c => c.id === targetCompId)?.company_name || 'company';
        toast.success(`Branch registered successfully for ${compName}!`);
        setIsAddBranchModalOpen(false);
        setAddBranchData({ code: "", name: "", location: "", operating_zone: "ZONE_B", latitude: "", longitude: "", radius: "50", company_id: targetCompId });
        if (targetCompId !== selectedCompanyId) {
          setSelectedCompanyId(targetCompId);
          void fetchBranches(targetCompId);
          void fetchStats(targetCompId);
        } else {
          fetchBranchesList();
        }
      } else {
        toast.error(data.error || "Failed to register branch");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const oldCode = (editBranchData.original_code || selectedBranch?.code || editBranchData.code || '').trim().toUpperCase();
    const newCode = (editBranchData.code || '').trim().toUpperCase();
    if (!newCode || !editBranchData.name?.trim()) {
      toast.error("Branch Code and Name are required");
      return;
    }
    try {
      const targetCompId = editBranchData.company_id || selectedCompanyId || activeCompany?.id || 1;
      const response = await fetch(`${API_BASE_URL}/api/branches/${encodeURIComponent(oldCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: toProperCase(editBranchData.name.trim()),
          location: editBranchData.location?.trim() || "",
          operating_zone: editBranchData.operating_zone,
          latitude: parseFloat(editBranchData.latitude) || null,
          longitude: parseFloat(editBranchData.longitude) || null,
          radius: parseFloat(editBranchData.radius) || 50,
          company_id: targetCompId,
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Branch ${newCode} updated successfully!`);
        setIsEditBranchModalOpen(false);
        const updatedBranchObj = data.branch || { ...selectedBranch, ...editBranchData, code: newCode, name: toProperCase(editBranchData.name.trim()) };
        setSelectedBranch(updatedBranchObj);
        if (oldCode !== newCode) {
          setSearchParams({ branch: newCode });
        }
        await fetchBranchesList();
        void fetchStats(targetCompId);
        window.dispatchEvent(new CustomEvent('app:refresh'));
        window.dispatchEvent(new CustomEvent('rayhar_branches_updated', { detail: { oldCode, newCode, name: updatedBranchObj.name } }));
      } else {
        toast.error(data.error || "Failed to update branch");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const filteredBranches = useMemo(() => {
    return allBranches.filter((b) => {
      const matchesSearch =
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const bZone = b.operating_zone || 'STANDARD';
      const matchesZone =
        zoneFilter === "ALL" ||
        bZone === zoneFilter ||
        normalizeZoneCode(b.operating_zone) === normalizeZoneCode(zoneFilter) ||
        (!b.operating_zone && zoneFilter === "STANDARD");
      return matchesSearch && matchesZone;
    });
  }, [allBranches, searchQuery, zoneFilter]);

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever search, zoneFilter or pageSize changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, zoneFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / pageSize));
  const paginatedBranches = viewMode === "grid" ? filteredBranches : filteredBranches.slice((currentPage - 1) * pageSize, currentPage * pageSize);



  const fetchTemporaryStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments-all`);
      const data = await res.json();
      if (data.success) {
        const list = data.assignments || [];
        const missingBranches = Array.from(
          new Set(
            list
              .filter((a: any) => a.status === "Active" && !a.today_status && a.primary_branch)
              .map((a: any) => a.primary_branch)
          )
        ) as string[];

        if (missingBranches.length > 0) {
          const statusMap: Record<string, string> = {};
          await Promise.all(
            missingBranches.map(async (br) => {
              try {
                const bRes = await fetch(`${API_BASE_URL}/api/branch-employees?branch=${encodeURIComponent(br)}`);
                const bData = await bRes.json();
                if (bData.success && Array.isArray(bData.employees)) {
                  bData.employees.forEach((emp: any) => {
                    if (emp.user_id && emp.today_status) {
                      statusMap[emp.user_id] = emp.today_status;
                    }
                  });
                }
              } catch (err) {
                console.error("Failed to fetch branch employees for temp staff status", err);
              }
            })
          );
          setTemporaryStaff(
            list.map((a: any) => ({
              ...a,
              today_status: a.today_status || statusMap[a.user_id] || "Absent",
            }))
          );
        } else {
          setTemporaryStaff(list);
        }
      }
    } catch (e) {
      console.error("Failed to fetch temporary staff", e);
    }
  };

  useEffect(() => {
    fetchTemporaryStaff();
  }, []);

  useEffect(() => {
    localStorage.setItem("branchesViewMode", viewMode);
  }, [viewMode]);

  const fetchBranches = async (companyId?: number) => {
    try {
      const cId = companyId || selectedCompanyId || activeCompany?.id || 1;
      const [response, schedulesData] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branches?company_id=${cId}`),
        multiCompanyApi.getCompanyWorkSchedules(cId).catch(() => []),
      ]);
      const data = await response.json();
      if (data.success) {
        setAllBranches(data.branches);
      }
      setWorkSchedules(schedulesData || []);
      setSchedulesCache(prev => ({ ...prev, [cId]: schedulesData || [] }));
    } catch (err) {
      console.error("Error fetching branches", err);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    const cId = activeCompany?.id || 1;
    setSelectedCompanyId(cId);
    void fetchBranches(cId);
  }, [activeCompany?.id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.company?.id) {
        setSelectedCompanyId(e.detail.company.id);
        void fetchBranches(e.detail.company.id);
        void fetchStats(e.detail.company.id);
      }
    };
    window.addEventListener('rayhar_company_switched', handler);
    return () => window.removeEventListener('rayhar_company_switched', handler);
  }, []);

  const fetchBranchesList = async () => {
    try {
      const cId = selectedCompanyId || activeCompany?.id || 1;
      const [response, schedulesData] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branches?company_id=${cId}`),
        multiCompanyApi.getCompanyWorkSchedules(cId).catch(() => []),
      ]);
      const data = await response.json();
      if (data.success) setAllBranches(data.branches);
      setWorkSchedules(schedulesData || []);
      setSchedulesCache(prev => ({ ...prev, [cId]: schedulesData || [] }));
    } catch (err) {}
  };

  useEffect(() => {
    if (!selectedBranch || !selectedBranch.code) return;
    const fetchBranchEmployees = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/branch-employees?branch=${selectedBranch.code}`,
        );
        const data = await response.json();
        if (data.success) {
          const emps = data.employees || [];
          setEmployees(emps);
          setEmployeeCurrentPage(1);
          if (emps.length > 0) {
            setSelectedEmployeeId(emps[0].user_id);
          } else {
            setSelectedEmployeeId("");
          }
        }
      } catch (error) {
        console.error("Branch employee fetch error:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBranchEmployees();
  }, [selectedBranch]);

  useEffect(() => {
    if (branchParam && allBranches.length > 0) {
      if (!selectedBranch || selectedBranch.code !== branchParam) {
        const found = allBranches.find((b) => b.code === branchParam);
        if (found) {
          const staticInfo = branches.find((sb) => sb.code === found.code);
          const stat = branchStats.find((s) => s.branch === found.code);
          const totalEmployees = stat ? stat.total_employees : 0;
          const attendanceRate = stat ? stat.attendance_rate : 0;
          const location =
            found.location &&
            found.location !== "Rayhar Branch" &&
            found.location !== "RAYHAR BRANCH" &&
            found.location !== ""
              ? found.location
              : staticInfo?.location || "Rayhar Branch";
          const leaderInfo = getBranchLeaderInfo(found);
          const leader = leaderInfo.name;

          setSelectedBranch({
            ...found,
            location,
            leader,
            employees: totalEmployees,
            attendance: attendanceRate,
            operating_zone: found.operating_zone || "ZONE_B",
          });
        }
      }
    } else if (!branchParam && selectedBranch) {
      setSelectedBranch(null);
    }
  }, [branchParam, allBranches, branchStats]);

  useEffect(() => {
    const handleAppRefresh = () => {
      fetchBranchesList();
      fetchTemporaryStaff();
      if (selectedBranch?.code) {
        setSelectedBranch((prev: any) => (prev ? { ...prev } : null));
      }
    };
    window.addEventListener("app:refresh", handleAppRefresh);
    return () => window.removeEventListener("app:refresh", handleAppRefresh);
  }, [selectedBranch?.code]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);

  const openDeleteModalForBranch = (b: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (b?.code === "HQ") {
      toast.error("Cannot delete default Rayhar HQ branch");
      return;
    }
    setBranchToDelete(b);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setDeletingBranch(true);
      const res = await fetch(
        `${API_BASE_URL}/api/branches/${encodeURIComponent(branchToDelete.code)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Branch ${branchToDelete.code} deleted successfully`);
        setDeleteModalOpen(false);
        setBranchToDelete(null);
        fetchBranchesList();
      } else {
        toast.error(data.error || "Failed to delete branch");
      }
    } catch (err) {
      toast.error("Server error");
    } finally {
      setDeletingBranch(false);
    }
  };

  const fetchStats = async (companyId?: number) => {
    try {
      const cId = companyId || activeCompany?.id || 1;
      const response = await fetch(`${API_BASE_URL}/api/branches-stats?company_id=${cId}`);
      const data = await response.json();
      if (data.success) {
        setBranchStats(data.stats || []);
      }
    } catch (err) {
      console.error("Error fetching branch stats", err);
    }
  };

  useEffect(() => {
    const cId = activeCompany?.id || 1;
    void fetchStats(cId);
    const interval = setInterval(() => {
      void fetchStats(activeCompany?.id || 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeCompany?.id]);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!viewLeaveStatus || !selectedEmployeeId) {
        setEmployeeLeaves([]);
        return;
      }
      setLoadingLeaves(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/leave-requests?userId=${selectedEmployeeId}`,
        );
        const data = await response.json();
        if (data.success) {
          setEmployeeLeaves(data.leaveRequests || []);
        } else {
          setEmployeeLeaves([]);
        }
      } catch (err) {
        console.error("Error fetching leaves", err);
        setEmployeeLeaves([]);
      } finally {
        setLoadingLeaves(false);
      }
    };
    fetchLeaves();
  }, [viewLeaveStatus, selectedEmployeeId]);

  

  const paginatedEmployees = useMemo(() => { const start = (employeeCurrentPage - 1) * employeePageSize; return employees.slice(start, start + employeePageSize); }, [employees, employeeCurrentPage, employeePageSize]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.user_id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {selectedBranch ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
            <div className="min-w-0 flex-1">
              <Button
                type="button"
                variant="ghost"
                className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#942392] transition-colors touch-target no-global-hover"
                onClick={handleBackToBranches}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] print:text-[13px] font-black uppercase tracking-widest">
                  Back to branches
                </span>
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-responsive-xl font-black text-foreground tracking-tight truncate">
                  {toProperCase(selectedBranch.name)}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-[8px] print:text-[13px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                >
                  {selectedBranch.code}
                </Badge>
                {user?.role === "hr_admin" && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <Button variant="outline" size="sm" onClick={openEditModal} className="h-8 text-xs print:text-[11px] font-bold">Edit Branch</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => openDeleteModalForBranch(selectedBranch, e)}
                      className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center shrink-0 cursor-pointer"
                      title={`Delete branch ${selectedBranch.code}`}
                      aria-label={`Delete branch ${selectedBranch.code}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-responsive-sm text-foreground font-medium mt-1">
                Branch staff overview and analytics
              </p>
            </div>
            
            {selectedBranch.operating_zone && (() => {
              const hoursDisplay = getBranchOperatingHoursDisplay(selectedBranch, workSchedules);
              return (
                <div className="flex-shrink-0 bg-card border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md self-start">
                  <p className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] print:text-[13px] font-bold text-foreground uppercase tracking-wider">
                      Operating Hours ({hoursDisplay.zoneLabel})
                    </span>
                    <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 border-[#942392]/30 text-[#942392]">
                      {hoursDisplay.scheduleName}
                    </Badge>
                  </p>
                  <div className="flex flex-wrap sm:flex-nowrap gap-4 sm:gap-6 text-[9px] print:text-[13px] text-foreground">
                    <div className="space-y-1 border-l-2 border-[#942392] pl-2.5">
                      {hoursDisplay.openLines.map((line, idx) => (
                        <p key={idx} className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-[#942392]" /> {line}
                        </p>
                      ))}
                    </div>
                    {hoursDisplay.closedLines.length > 0 && (
                      <div className="space-y-1 border-l-2 border-rose-500 pl-2.5">
                        {hoursDisplay.closedLines.map((line, idx) => (
                          <p key={idx} className="flex items-center gap-2 text-rose-500/90">
                            <X className="w-3 h-3" /> {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#942392]" />
              <p className="text-[10px] print:text-[13px] font-black uppercase tracking-[0.2em] text-foreground animate-pulse">
                Syncing Branch Data...
              </p>
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table ref={personnelTableRef} className="w-full text-sm scroll-mt-20">
                    <thead>
                      <tr className="bg-muted/30 text-foreground border-b border-border">
                        <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Personnel
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Position
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Leave Balance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Attendance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Today
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.length > 0 ? (
                        paginatedEmployees.map((employee) => (
                          <tr
                            key={employee.user_id}
                            className={`cursor-pointer transition-colors group hover:bg-[#942392]/5 ${
                              selectedEmployee?.user_id === employee.user_id
                                ? "bg-[#942392]/10"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedEmployeeId(employee.user_id);
                              setIsStatsOpen(true);
                            }}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#942392]/10 flex items-center justify-center text-[9px] print:text-[13px] font-black text-[#942392] group-hover:scale-110 transition-transform">
                                  {employee.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground group-hover:text-[#942392] transition-colors">
                                    {employee.full_name}
                                  </p>
                                  <p className="text-[8px] print:text-[13px] text-foreground truncate font-medium uppercase tracking-widest">
                                    {employee.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs capitalize">
                              {(employee.role === "operation_manager" || employee.role === "finance_manager") ? "Operation Manager" : employee.role === "hr_admin" ? "HR Admin" : employee.role ? String(employee.role).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "Employee"}
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs uppercase">
                              {employee.annual_leave_balance} DAYS
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs">
                              {employee.attendance_rate || 0}%
                            </td>
                            <td className="py-4 px-6">
                              {renderTodayStatusBadge(employee.today_status)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-12 text-center text-foreground italic font-medium"
                          >
                            No personnel found in this branch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-border/50">
                  {employees.length > 0 ? (
                    paginatedEmployees.map((employee) => (
                      <div
                        key={employee.user_id}
                        className="p-4 active:bg-[#942392]/5 transition-colors flex items-center gap-4 cursor-pointer"
                        onClick={() => {
                          setSelectedEmployeeId(employee.user_id);
                          setIsStatsOpen(true);
                        }}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#942392]/10 flex items-center justify-center text-sm font-black text-[#942392] shrink-0">
                          {employee.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-black text-sm text-foreground truncate">
                              {employee.full_name}
                            </p>
                            {renderTodayStatusBadge(employee.today_status)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] print:text-[13px] font-bold text-foreground uppercase tracking-wider">
                            <span>ID: {employee.user_id}</span>
                            <span className="opacity-30">•</span>
                            <span>Rate: {employee.attendance_rate || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-foreground italic font-medium p-6">
                      No personnel found.
                    </div>
                  )}
                </div>
                
                <TablePagination
                  currentPage={employeeCurrentPage}
                  totalItems={employees.length}
                  pageSize={employeePageSize}
                  onPageChange={setEmployeeCurrentPage}
                  onPageSizeChange={setEmployeePageSize}
                  tableRef={personnelTableRef}
                />
              </CardContent>
            </Card>
          )}

          {/* Temporary Staff Sections */}
          {!loading && (
            <div className="mt-8 mb-4 space-y-8">
              {(() => {
                const branchTempStaff = temporaryStaff.filter((a: any) => a.temp_branch === selectedBranch?.code);
                
                const onDutyStaff = branchTempStaff.filter((a: any) => {
                  if (a.status !== 'Active') return false;
                  const start = new Date(a.start_date);
                  const end = new Date(a.end_date);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(23, 59, 59, 999);
                  const now = new Date();
                  return now >= start && now <= end;
                });

                if (branchTempStaff.length === 0) return null;

                return (
                  <>
                    {/* On Duty Section */}
                    {onDutyStaff.length > 0 && (
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-4">Temporary Staff On Duty</h3>
                        <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-purple-500/10 text-purple-900 dark:text-purple-100 border-b border-purple-500/20">
                                    <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                                    <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Permanent Branch</th>
                                    {selectedBranch?.code === "HQ" && (
                                      <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Department</th>
                                    )}
                                    <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                                    <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Today Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {onDutyStaff.map((assignment: any) => (
                                    <tr key={`duty-${assignment.id}`} className="hover:bg-purple-500/5 transition-colors">
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-[9px] print:text-[13px] font-black text-purple-700 dark:text-purple-300">
                                            {assignment.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-foreground text-sm">{assignment.name}</p>
                                            <p className="text-[8px] print:text-[13px] text-foreground truncate font-medium uppercase tracking-widest flex items-center gap-1">
                                              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">TEMP</span>
                                              {assignment.employee}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 font-semibold text-foreground text-sm">
                                        {selectedBranch?.code === "HQ" ? assignment.primary_branch : `${assignment.primary_branch}${assignment.department ? ` • ${assignment.department}` : ''}`}
                                      </td>
                                      {selectedBranch?.code === "HQ" && (
                                        <td className="py-4 px-6 font-semibold text-foreground text-sm">
                                          {assignment.assigned_department || assignment.department || 'All Departments'}
                                        </td>
                                      )}
                                      <td className="py-4 px-6 text-sm font-semibold text-foreground uppercase">
                                        {new Date(assignment.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} - {new Date(assignment.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                      </td>
                                      <td className="py-4 px-6">
                                        {renderTodayStatusBadge(assignment.today_status || "Absent")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* History Section */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-4">History of Temporary Staff</h3>
                      <Card className="border-none shadow-sm overflow-hidden bg-card rounded-[24px]">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-purple-500/10 text-purple-900 dark:text-purple-100 border-b border-purple-500/20">
                                  <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                                  <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Permanent Branch</th>
                                  {selectedBranch?.code === "HQ" && (
                                    <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Department</th>
                                  )}
                                  <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                                  <th className="text-left py-4 px-6 text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {branchTempStaff.map((assignment: any) => {
                                  const isActive = onDutyStaff.some((a: any) => a.id === assignment.id);
                                  return (
                                    <tr key={`hist-${assignment.id}`} className="hover:bg-purple-500/5 transition-colors">
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-[9px] print:text-[13px] font-black text-purple-700 dark:text-purple-300">
                                            {assignment.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-foreground text-sm">{assignment.name}</p>
                                            <p className="text-[8px] print:text-[13px] text-foreground truncate font-medium uppercase tracking-widest flex items-center gap-1">
                                              {assignment.employee}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 font-semibold text-foreground text-sm">
                                        {selectedBranch?.code === "HQ" ? assignment.primary_branch : `${assignment.primary_branch}${assignment.department ? ` • ${assignment.department}` : ''}`}
                                      </td>
                                      {selectedBranch?.code === "HQ" && (
                                        <td className="py-4 px-6 font-semibold text-foreground text-sm">
                                          {assignment.assigned_department || assignment.department || 'All Departments'}
                                        </td>
                                      )}
                                      <td className="py-4 px-6 text-sm font-semibold text-foreground uppercase">
                                        {new Date(assignment.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} - {new Date(assignment.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                      </td>
                                      <td className="py-4 px-6 text-xs font-semibold">
                                        {(() => {
                                          const start = new Date(assignment.start_date);
                                          const end = assignment.end_date ? new Date(assignment.end_date) : new Date('2099-12-31');
                                          start.setHours(0, 0, 0, 0);
                                          end.setHours(23, 59, 59, 999);
                                          const now = new Date();

                                          const isDuty = assignment.status === 'Active' && now >= start && now <= end;
                                          const isUpcoming = assignment.status === 'Active' && now < start;
                                          const isCompleted = assignment.status === 'Completed' || (assignment.status === 'Active' && now > end);

                                          let statusText = assignment.status;
                                          let badgeClass = 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700';

                                          if (isDuty) {
                                            statusText = 'ON DUTY';
                                            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
                                          } else if (isUpcoming) {
                                            statusText = 'UPCOMING';
                                            badgeClass = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
                                          } else if (isCompleted) {
                                            statusText = 'COMPLETED';
                                            badgeClass = 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700';
                                          } else if (assignment.status === 'Cancelled') {
                                            statusText = 'CANCELLED';
                                            badgeClass = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
                                          }

                                          return (
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] print:text-[12px] uppercase tracking-wider font-bold border ${badgeClass}`}>
                                              {statusText}
                                            </span>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                );
              })()}
            </div>
          )}


          <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <DialogContent className="max-w-2xl w-full overflow-hidden max-h-[90vh] p-0 gap-0 flex flex-col">
              <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start shrink-0 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">STAFF PROFILE</DialogTitle>
                    <DialogDescription className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/80 m-0 mt-1">VIEW AND ANALYZE STAFF METRICS</DialogDescription>
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {selectedEmployee ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Bio */}
                      <div className="bg-card p-6 rounded-[24px] border border-border/50 flex flex-col items-center text-center shadow-sm">
                        <div className="w-24 h-24 rounded-2xl bg-[#942392] flex items-center justify-center text-white text-2xl print:text-4xl font-black shadow-xl mb-4">
                          {selectedEmployee.full_name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-black text-foreground leading-tight">
                          {selectedEmployee.full_name}
                        </h2>
                        <p className="text-sm font-bold text-[#942392] mt-1">
                          {selectedEmployee.email}
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-4 text-[8px] print:text-[13px] uppercase font-black px-3 py-1 bg-[#942392]/10 text-[#942392] border-none"
                        >
                          {selectedEmployee.role === "finance_manager" || selectedEmployee.role === "Finance Manager" || selectedEmployee.role === "operation_manager" ? "Operation Manager" : selectedEmployee.role === "hr_admin" ? "HR Admin" : selectedEmployee.role.replace(/_/g, " ")}
                        </Badge>

                        <div className="mt-6 pt-6 border-t border-border/50 w-full space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              User ID
                            </span>
                            <span className="font-black text-foreground">
                              {selectedEmployee.user_id}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              Branch
                            </span>
                            <span className="font-black text-foreground">
                              {toProperCase(selectedBranch?.name) || "Branch"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              Department
                            </span>
                            <span className="font-black text-foreground">
                              {selectedEmployee.department || "Not Assigned"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              Status
                            </span>
                            <Badge
                              className={`text-white font-black text-[9px] print:text-[13px] h-5 ${selectedEmployee.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`}
                            >
                              {selectedEmployee.status || "Active"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Stats */}
                      <div className="space-y-4">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest px-1">
                          Performance & Leave
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-[#942392]/30 transition-colors group">
                            <CalendarCheck className="mb-2 h-4 w-4 text-[#942392] group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.annual_leave_balance}
                            </p>
                            <p className="text-[10px] print:text-[13px] font-black uppercase tracking-wider text-foreground">
                              Annual Left
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-emerald-500/30 transition-colors group">
                            <TrendingUp className="mb-2 h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.attendance_rate || 0}%
                            </p>
                            <p className="text-[10px] print:text-[13px] font-black uppercase tracking-wider text-foreground">
                              Attendance
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-amber-500/30 transition-colors group">
                            <Clock className="mb-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.pending_leaves}
                            </p>
                            <p className="text-[10px] print:text-[13px] font-black uppercase tracking-wider text-foreground">
                              Pending
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-purple-500/30 transition-colors group">
                            <FileText className="mb-2 h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.mc_leaves || 0}
                            </p>
                            <p className="text-[10px] print:text-[13px] font-black uppercase tracking-wider text-foreground">
                              Total MC
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest px-1">
                            Quick Links
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              className="flex items-center justify-between w-full rounded-[14px] bg-emerald-500/10 px-4 py-3 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 group touch-target"
                              onClick={() => setViewLeaveStatus("Approved")}
                            >
                              <span className="text-xs font-black text-emerald-700">
                                Approved Leaves
                              </span>
                              <Badge className="bg-[#228b22] text-white font-black h-5 text-[8px] print:text-[13px] group-hover:scale-110 transition-transform">
                                {selectedEmployee.approved_leaves}
                              </Badge>
                            </button>
                            <button
                              className="flex items-center justify-between w-full rounded-[14px] bg-amber-500/10 px-4 py-3 hover:bg-amber-500/20 transition-all border border-amber-500/20 group touch-target"
                              onClick={() => setViewLeaveStatus("Pending")}
                            >
                              <span className="text-xs font-black text-amber-700">
                                Pending Approvals
                              </span>
                              <Badge className="bg-amber-500 text-white font-black h-5 text-[8px] print:text-[13px] group-hover:scale-110 transition-transform">
                                {selectedEmployee.pending_leaves}
                              </Badge>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-foreground opacity-40">
                    <Users className="w-16 h-16 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      Select staff to view
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <PageActions>
            {!loadingBranches && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {companies && companies.length > 1 && (
                  <Select 
                    value={selectedCompanyId ? selectedCompanyId.toString() : "1"} 
                    onValueChange={(val) => {
                      const newCId = parseInt(val, 10);
                      setSelectedCompanyId(newCId);
                      void fetchBranches(newCId);
                      void fetchStats(newCId);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-56 h-9 px-3 rounded-xl border-border/60 bg-muted/30 text-xs font-bold shrink-0">
                      <SelectValue placeholder="Company Branch Scope">
                        {(() => {
                          const found = companies.find(c => c.id === selectedCompanyId);
                          if (!found) return 'Rayhar Travels (Main Company)';
                          return `${toProperCase(found.company_name)}`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                          {toProperCase(c.company_name)} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
                  <Input
                    placeholder="Search branches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9 rounded-xl border-border/60 bg-muted/30 focus-visible:ring-[#942392]/30 text-xs font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="w-full sm:w-52 h-9 px-3 rounded-xl border-border/60 bg-muted/30 text-xs font-bold shrink-0">
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
                <div className="flex items-center h-9 gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg px-2.5 h-full gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      viewMode === "grid"
                        ? "bg-[#942392] text-white hover:bg-[#942392]/90 shadow-md"
                        : "text-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("line")}
                    className={`rounded-lg px-2.5 h-full gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      viewMode === "line"
                        ? "bg-[#942392] text-white hover:bg-[#942392]/90 shadow-md"
                        : "text-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className="px-2.5 py-1.5 text-xs print:text-[11px] font-bold bg-muted/30 border-border/60 flex items-center justify-center rounded-md h-9 shrink-0"
                >
                  Total{" "}
                  <span className="ml-1.5 flex items-center justify-center bg-[#942392] text-white rounded-md h-5 min-w-[20px] px-1.5 text-[8px] print:text-[13px] leading-none shrink-0">
                    {allBranches.length}
                  </span>
                </Badge>
                <Button 
                  onClick={openAddModal}
                  className="rounded-xl px-3.5 py-2 h-9 text-xs font-black uppercase tracking-wider bg-[#942392] hover:bg-[#5e0080] text-white shadow-md flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch</span>
                </Button>
              </div>
            )}
          </PageActions>
          {loadingBranches ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#942392]" />
              <p className="text-xs font-black uppercase tracking-widest text-foreground animate-pulse">
                Scanning Network...
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 gap-y-12 sm:gap-y-14">
              {paginatedBranches.map((branch) => {
                const stat = branchStats.find((s) => s.branch === branch.code);
                const totalEmployees = stat ? stat.total_employees : 0;
                const presentToday = stat ? stat.present_today : 0;
                const onLeave = stat ? stat.on_leave : 0;
                const outstation = stat ? stat.outstation || 0 : 0;
                const absent = Math.max(
                  0,
                  totalEmployees - presentToday - onLeave - outstation,
                );
                const attendanceRate =
                  totalEmployees > 0
                    ? Math.round((presentToday / totalEmployees) * 100)
                    : 0;
                const staticInfo = branches.find((b) => b.code === branch.code);
                const location =
                  branch.location &&
                  branch.location !== "Rayhar Branch" &&
                  branch.location !== "RAYHAR BRANCH" &&
                  branch.location !== ""
                    ? branch.location
                    : staticInfo?.location || "Rayhar Branch";
                const leaderInfo = getBranchLeaderInfo(branch);
                const leader = leaderInfo.name;

                return (
                  <Card
                    key={branch.code}
                    className="cursor-pointer hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] hover:-translate-y-1.5 transition-all duration-300 border border-slate-100 dark:border-slate-800/80 shadow-[0_16px_40px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)] bg-card overflow-visible group rounded-[32px] relative flex flex-col justify-between h-full"
                    onClick={() =>
                      handleSelectBranch({
                        ...branch,
                        location,
                        leader,
                        employees: totalEmployees,
                        attendance: attendanceRate,
                        operating_zone: branch.operating_zone || 'ZONE_B'
                      })
                    }
                  >
                    {/* Floating Icon Circle */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[80px] h-[80px] rounded-full bg-card p-1 shadow-[0_8px_25px_rgba(0,0,0,0.12)] border-[3px] border-white dark:border-slate-800 flex items-center justify-center z-20 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full bg-[#EDE4F0] dark:bg-purple-950/60 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-[#942392]" strokeWidth={2.2} />
                      </div>
                    </div>

                    {/* Top Left Zone Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20">
                      <div className={`font-extrabold text-[9px] print:text-[13px] h-7 px-2.5 shadow-sm rounded-xl flex items-center justify-center border ${
                        normalizeZoneCode(branch.operating_zone) === "ZONE_A"
                          ? "bg-amber-50/95 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                          : "bg-purple-50/95 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800 text-[#942392] dark:text-purple-300"
                      }`}>
                        {formatZoneDisplayName(branch.operating_zone)}
                      </div>
                    </div>

                    {/* Top Right Badges */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                      <div className="font-extrabold text-[9px] print:text-[13px] h-7 px-2.5 bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                        {branch.code}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 bg-white/95 dark:bg-slate-800/95 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center"
                        onClick={(e) => openDeleteModalForBranch(branch, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <CardContent className="p-0 pt-12 sm:pt-14 relative flex-1 flex flex-col justify-between">
                      {/* Branch Info */}
                      <div className="flex flex-col items-center px-4 pt-1 pb-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg leading-tight text-center">
                          {toProperCase(branch.name)}
                        </h3>
                        <div className="flex items-center justify-center gap-1.5 mt-2 px-2 max-w-full">
                          <MapPin className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                          <span className="text-[8px] print:text-[13px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight text-center line-clamp-1">
                            {location}
                          </span>
                        </div>
                      </div>

                      {/* 4 Stats */}
                      <div className="flex items-center justify-between border-t border-b border-slate-100 dark:border-slate-800/80 py-4 mx-4">
                        {/* Present */}
                        <div className="flex-1 flex flex-col items-center border-r border-slate-100 dark:border-slate-800 last:border-0">
                          <UserCheck className="w-5 h-5 text-[#942392] mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-[#942392] leading-none">{presentToday}</p>
                          <p className="text-[9px] print:text-[13px] font-black text-[#942392] uppercase mt-1 tracking-widest">Present</p>
                        </div>
                        {/* Leave */}
                        <div className="flex-1 flex flex-col items-center border-r border-slate-100 dark:border-slate-800 last:border-0">
                          <Leaf className="w-5 h-5 text-amber-500 mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-amber-500 leading-none">{onLeave}</p>
                          <p className="text-[9px] print:text-[13px] font-black text-amber-500 uppercase mt-1 tracking-widest">Leave</p>
                        </div>
                        {/* Outstation */}
                        <div className="flex-1 flex flex-col items-center border-r border-slate-100 dark:border-slate-800 last:border-0">
                          <Briefcase className="w-5 h-5 text-[#942392] mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-[#942392] leading-none">{outstation}</p>
                          <p className="text-[9px] print:text-[13px] font-black text-[#942392] uppercase mt-1 tracking-widest">Outstation</p>
                        </div>
                        {/* Absent */}
                        <div className="flex-1 flex flex-col items-center">
                          <UserX className="w-5 h-5 text-amber-500 mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-amber-500 leading-none">{absent}</p>
                          <p className="text-[9px] print:text-[13px] font-black text-amber-500 uppercase mt-1 tracking-widest">Absent</p>
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="px-6 py-4 flex items-center justify-between gap-2 min-h-[58px]">
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[#942392]" strokeWidth={2.2} />
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{totalEmployees}</span>
                          </div>
                          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-500" strokeWidth={2.2} />
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{attendanceRate}%</span>
                          </div>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
                        <div className="text-right min-w-0 flex-1 max-w-[185px]">
                          <p className="text-[9px] print:text-[13px] font-black text-black dark:text-white uppercase tracking-widest leading-none">
                            {leaderInfo.roleLabel}
                          </p>
                          <p className="text-[10px] print:text-[13px] font-black text-black dark:text-white mt-0.5 uppercase line-clamp-2 leading-tight break-words" title={leader}>
                            {leader}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table ref={branchesTableRef} className="scroll-mt-20">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="py-4 pl-6">Branch Name</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Leave</TableHead>
                        <TableHead className="text-center">Outstation</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Staff</TableHead>
                        <TableHead className="text-center">
                          Attendance
                        </TableHead>
                        <TableHead>Branch Leader / MD</TableHead>
                        <TableHead className="text-right pr-6">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBranches.map((branch) => {
                        const stat = branchStats.find(
                          (s) => s.branch === branch.code,
                        );
                        const totalEmployees = stat ? stat.total_employees : 0;
                        const presentToday = stat ? stat.present_today : 0;
                        const onLeave = stat ? stat.on_leave : 0;
                        const outstation = stat ? stat.outstation || 0 : 0;
                        const absent = Math.max(
                          0,
                          totalEmployees - presentToday - onLeave - outstation,
                        );
                        const attendanceRate =
                          totalEmployees > 0
                            ? Math.round((presentToday / totalEmployees) * 100)
                            : 0;
                        const staticInfo = branches.find(
                          (b) => b.code === branch.code,
                        );
                        const location =
                          branch.location &&
                          branch.location !== "Rayhar Branch" &&
                          branch.location !== "RAYHAR BRANCH" &&
                          branch.location !== ""
                            ? branch.location
                            : staticInfo?.location || "Rayhar Branch";
                        const leaderInfo = getBranchLeaderInfo(branch);
                        const leader = leaderInfo.name;

                        return (
                          <TableRow
                            key={branch.code}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={() =>
                              handleSelectBranch({
                                ...branch,
                                location,
                                leader,
                                employees: totalEmployees,
                                attendance: attendanceRate,
                              })
                            }
                          >
                            <TableCell className="py-4 pl-6 font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-foreground flex items-center gap-2">
                                    <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
                                    {toProperCase(branch.name)}
                                  </span>
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[9px] print:text-[13px] h-4 px-1.5 bg-muted/20 border-border/50"
                                    >
                                      {branch.code}
                                    </Badge>
                                  </p>
                                  <p className="text-[8px] print:text-[13px] text-foreground truncate uppercase tracking-widest">
                                    {location}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {presentToday > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
                                >
                                  {presentToday}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {onLeave > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/5 text-amber-600 border-amber-500/20"
                                >
                                  {onLeave}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {outstation > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/5 text-blue-600 border-blue-500/20"
                                >
                                  {outstation}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {absent > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-500/5 text-rose-600 border-rose-500/20"
                                >
                                  {absent}
                                </Badge>
                              ) : (
                                <span className="text-sm font-medium text-foreground">
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {totalEmployees}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              <Badge
                                variant="outline"
                                className="bg-primary/5 text-primary border-primary/20"
                              >
                                {attendanceRate}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  {leaderInfo.tableRoleLabel}
                                </span>
                                <span className="text-sm font-semibold text-foreground block max-w-[220px] line-clamp-2 leading-tight" title={leader}>
                                  {leader}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell
                              className="text-right pr-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 shrink-0 hover:bg-rose-500/10 hover:text-rose-500 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) =>
                                  openDeleteModalForBranch(branch, e)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Pagination Bar ── */}
          {!loadingBranches && filteredBranches.length > 0 && viewMode === "line" && (
            <div className="mt-4 rounded-xl overflow-hidden border border-border/50">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredBranches.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                tableRef={branchesTableRef}
              />
            </div>
          )}
        </div>
      )}

      {/* LEAVE DETAILS DIALOG */}
      <Dialog
        open={!!viewLeaveStatus}
        onOpenChange={(open) => !open && setViewLeaveStatus(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] border-none shadow-2xl rounded-[32px] p-0 overflow-hidden flex flex-col safe-area-bottom">
          <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl font-black tracking-tight">
                <FileText className="h-6 w-6" />
                {viewLeaveStatus} Records
              </DialogTitle>
              <DialogDescription className="text-white/80 font-bold">
                Reviewing leave history for {selectedEmployee?.full_name}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 print:p-6 space-y-6">
            {loadingLeaves ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#942392]" />
                <p className="text-[10px] print:text-[13px] font-black uppercase tracking-widest text-foreground">
                  Fetching Forms...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeLeaves.filter((req) => {
                  const status = (req.status || "").toLowerCase().trim();
                  const viewStatus = (viewLeaveStatus || "")
                    .toLowerCase()
                    .trim();
                  if (viewStatus === "pending")
                    return status.includes("pending");
                  return status === viewStatus;
                }).length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3 opacity-30">
                    <FileText className="w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-widest">
                      No matching records found
                    </p>
                  </div>
                ) : (
                  employeeLeaves
                    .filter((req) => {
                      const status = (req.status || "").toLowerCase().trim();
                      const viewStatus = (viewLeaveStatus || "")
                        .toLowerCase()
                        .trim();
                      if (viewStatus === "pending")
                        return status.includes("pending");
                      return status === viewStatus;
                    })
                    .map((req) => {
                      const fromStr = new Date(
                        req.start_date,
                      ).toLocaleDateString("ms-MY", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      const toStr = new Date(req.end_date).toLocaleDateString(
                        "ms-MY",
                        { day: "2-digit", month: "2-digit", year: "numeric" },
                      );
                      return (
                        <div
                          key={req.leave_id}
                          id={`leave-form-${req.leave_id}`}
                          className="rounded-[24px] border border-border/50 p-5 sm:p-6 space-y-6 bg-card shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Save to PDF Button */}
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={() => {
                                const el = document.getElementById(`leave-form-${req.leave_id}`);
                                if (!el) return;
                                const originalTitle = document.title;
                                document.title = `Leave_Form_${selectedEmployee?.full_name?.replace(/ /g,'_') || 'Staff'}_${req.start_date}`;
                                handlePrint(() => el);
                                setTimeout(() => {
                                  document.title = originalTitle;
                                }, 500);
                              }}
                              className="pdf-btn flex items-center gap-1.5 text-[10px] print:text-[13px] font-black uppercase tracking-widest bg-[#942392] text-white px-3 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-md"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Save to PDF
                            </button>
                          </div>
                          <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                            <h2 className="text-2xl print:text-4xl font-black tracking-tighter text-foreground dark:text-purple-400">
                              RAYHAR GROUP
                            </h2>
                            <p className="text-[10px] print:text-xs font-black tracking-[0.2em] print:tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">
                              Permohonan Cuti Kakitangan
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 text-xs print:text-[11px] font-bold">
                            <div className="space-y-1 print:space-y-1.5">
                              <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Nama Penuh
                              </span>
                              <p className="border-b pb-1 print:pb-2 border-border/40 truncate">
                                {selectedEmployee?.full_name}
                              </p>
                            </div>
                            <div className="space-y-1 print:space-y-1.5">
                              <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Cawangan
                              </span>
                              <p className="border-b pb-1 print:pb-2 border-border/40">
                                {selectedBranch?.code || "HQ"}
                              </p>
                            </div>
                            <div className="space-y-1 print:space-y-1.5">
                              <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Jenis Cuti
                              </span>
                              <p className="border-b pb-1 print:pb-2 border-border/40">
                                {req.leave_type}
                              </p>
                            </div>
                            <div className="space-y-1 print:space-y-1.5">
                              <span className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Status
                              </span>
                              <p
                                className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#942392]"}`}
                              >
                                {req.status}
                              </p>
                            </div>
                          </div>

                          {!(req.leave_type === "Replacement Leave" || req.leave_type === "Cuti Ganti") ? (
                            <div className="grid grid-cols-4 gap-3 print:gap-4">
                      {/* Dari */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Dari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{req.from}</p>
                        </div>
                      </div>
                      
                      {/* Hingga */}
                      <div className="border border-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 text-center border-b border-border/50">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-slate-950 dark:text-slate-50">Hingga</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-center">{req.to}</p>
                        </div>
                      </div>
                      
                      {/* Bilangan Hari */}
                      <div className="border border-[#942392]/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-[#942392]/5 p-1.5 text-center border-b border-[#942392]/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Bilangan Hari</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-[#942392] text-center">{req.days}</p>
                        </div>
                      </div>
                      
                      {/* Baki Layak */}
                      <div className="border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-emerald-50 p-1.5 text-center border-b border-emerald-500/20 dark:bg-emerald-950/20">
                          <p className="text-[9px] print:text-[13px] uppercase font-black text-emerald-600">Baki Layak</p>
                        </div>
                        <div className="p-2 flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
                          <p className="font-black text-xs sm:text-sm print:text-[11px] text-emerald-600 text-center">{req.balance ?? "-"} HARI</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-[20px] border border-border/50">
                              <span className="text-[10px] print:text-[13px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-wider pl-2">Jumlah Hari Cuti Ganti</span>
                              <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 px-6 py-1.5 shadow-sm flex flex-col justify-center">
                                <p className="text-[9px] print:text-[13px] uppercase font-black text-[#942392]">Hari</p>
                                <p className="font-black text-lg text-[#942392] leading-none mt-0.5">{req.days}</p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <p className="text-[10px] print:text-[13px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">
                              Sebab / Tujuan
                            </p>
                            <p className="rounded-[16px] border border-border/40 p-4 font-bold text-foreground bg-muted/10 text-sm leading-relaxed">
                              "{getCleanReason(req.reason) || "-"}"
                            </p>
                          </div>

                          {(req.leave_type === "Sick Leave" ||
                            req.leave_type === "Cuti Sakit") &&
                            req.mc_file_url && (
                              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[16px] flex items-center justify-between group print:hidden">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-[#942392]" />
                                  <span className="text-[10px] print:text-[13px] font-black text-[#942392] uppercase tracking-widest">
                                    MC Attachment
                                  </span>
                                </div>
                                <a
                                  href={sanitizeUrl(safeFileUrl(req.mc_file_url, "about:blank"))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] print:text-[13px] font-black uppercase tracking-widest bg-[#942392] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                                >
                                  View File
                                </a>
                              </div>
                            )}

                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4 text-rose-500" />
                              <h3 className="text-[10px] print:text-[13px] font-black uppercase tracking-[0.2em]">
                                Maklumat Waris (Kecemasan)
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 print:gap-y-6 print:gap-x-8 bg-muted/20 print:bg-transparent print:border-none p-4 print:px-0 rounded-[20px]">
                              <div className="space-y-1 print:space-y-1.5">
                                <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Nama
                                </span>
                                <p className="text-xs print:text-[11px] font-bold truncate">
                                  {req.waris_nama || "-"}
                                </p>
                              </div>
                              <div className="space-y-1 print:space-y-1.5">
                                <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Hubungan
                                </span>
                                <p className="text-xs print:text-[11px] font-bold truncate">
                                  {req.waris_hubungan || "-"}
                                </p>
                              </div>
                              <div className="space-y-1 print:space-y-1.5">
                                <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  No. Telefon
                                </span>
                                <p className="text-[9px] print:text-[13px] font-black text-[#942392]">
                                  {req.waris_phone || "-"}
                                </p>
                              </div>
                              <div className="space-y-1 print:space-y-1.5">
                                <span className="text-[10px] print:text-[13px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Alamat
                                </span>
                                <p className="text-[10px] print:text-[13px] font-bold text-foreground break-words">
                                  {req.waris_alamat || "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Approval History Timeline */}
                          {req.approval_history && req.approval_history.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-border/50">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#942392]" />
                                <h3 className="text-[10px] print:text-[13px] font-black uppercase tracking-[0.2em]">
                                  Approval History
                                </h3>
                              </div>
                              <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                                {req.approval_history.map((history: any, idx: number) => (
                                  <div key={idx} className="relative flex items-start gap-4">
                                    <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-[#228b22]' : 'bg-rose-500'} z-10`} />
                                    <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] print:text-[13px] font-black uppercase px-2 py-0.5 rounded-md ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                            {history.status}
                                          </span>
                                          <span className="text-[10px] print:text-[13px] font-black text-foreground/70">
                                            by {history.approver_name || history.approver_id}
                                          </span>
                                        </div>
                                        <span className="text-[10px] print:text-[13px] font-black text-foreground/50">
                                          {new Date(history.created_at).toLocaleDateString('ms-MY')}
                                        </span>
                                      </div>
                                      {history.remarks && (
                                        <p className="text-[8px] print:text-[13px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
                                          "{history.remarks}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Signatures hidden on screen, visible on print */}
                          <div className="hidden print:block pt-24 mt-12 pb-2">
                            <div className="grid grid-cols-2 gap-16">
                              <div className="border-t border-foreground pt-2 text-center">
                                <p className="text-[10px] print:text-[13px] font-bold uppercase">Tandatangan Kakitangan</p>
                              </div>
                              <div className="border-t border-foreground pt-2 text-center">
                                <p className="text-[10px] print:text-[13px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                              </div>
                            </div>
                            <p className="text-[9px] print:text-[13px] text-center italic mt-4 text-foreground">
                              Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                            </p>
                          </div>

                          <p className="text-[8px] print:text-[13px] text-center italic text-muted-foreground pt-4 print:hidden">
                            Borang ini sah digunakan sebagai bukti rasmi cuti kakitangan setelah mendapat kelulusan pihak pengurusan.
                          </p>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Branch Modal */}
      <Dialog open={isAddBranchModalOpen} onOpenChange={setIsAddBranchModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 border-none shadow-2xl rounded-3xl p-0 gap-0 my-auto">
          <DialogHeader className="bg-[#942392] p-5 sm:p-6 m-0 border-b border-white/20 text-left shrink-0">
            <DialogTitle className="text-white font-black uppercase tracking-tight m-0 text-lg">Add New Branch</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">
              Insert a new regional branch office into the database
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBranch} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-card">
            {/* Scrollable Form Body */}
            <div className="px-5 sm:px-6 pt-4 pb-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Target Entity Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                    Target Entity
                  </label>
                  <span className="text-[9px] font-bold text-[#942392]">
                    {loadingAddSchedules ? "Loading Schedules..." : "Work Schedule Scope"}
                  </span>
                </div>
                <Select 
                  value={addBranchData.company_id ? addBranchData.company_id.toString() : "1"} 
                  onValueChange={(val) => void handleAddCompanyChange(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm">
                    <SelectValue placeholder="Select Target Entity (Company)">
                      {(() => {
                        const found = companies.find(c => c.id === addBranchData.company_id);
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
                    value={addBranchData.code}
                    onChange={(e) => setAddBranchData({...addBranchData, code: e.target.value})}
                    className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-black uppercase placeholder:normal-case outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Name</label>
                  <Input
                    placeholder="e.g. ALOR SETAR"
                    value={addBranchData.name}
                    onChange={(e) => setAddBranchData({...addBranchData, name: e.target.value})}
                    className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold placeholder:normal-case uppercase outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Branch Location / District</label>
                  <button
                    type="button"
                    onClick={openMapForAddBranch}
                    className="text-[9px] font-bold text-[#942392] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" /> Pick on Map
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type address or paste coordinates & press Enter"
                    value={addBranchData.location}
                    onChange={(e) => setAddBranchData({...addBranchData, location: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const addr = addBranchData.location;
                        if (!addr.trim()) return;
                        toast.loading("Searching coordinates...");
                        smartGeocode(addr).then(result => {
                          toast.dismiss();
                          if (result) {
                            setAddBranchData((prev: any) => ({...prev, latitude: result.lat, longitude: result.lon}));
                            toast.success("Coordinates found & updated!");
                          } else {
                            toast.error("Could not find coordinates. Try entering just the town/city name.");
                          }
                        }).catch(() => { toast.dismiss(); toast.error("Search failed"); });
                      }
                    }}
                    className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold"
                  />
                  <button
                    type="button"
                    className="h-11 px-3.5 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#942392]/10 text-[#942392] hover:bg-[#942392]/20 transition-colors border border-[#942392]/20 font-bold text-xs cursor-pointer"
                    onClick={async () => {
                      const addr = addBranchData.location;
                      if (!addr.trim()) return;
                      toast.loading("Searching coordinates...");
                      try {
                        const result = await smartGeocode(addr);
                        toast.dismiss();
                        if (result) {
                          setAddBranchData((prev: any) => ({...prev, latitude: result.lat, longitude: result.lon}));
                          toast.success("Coordinates found!");
                        } else {
                          toast.error("Could not find coordinates.");
                        }
                      } catch { toast.dismiss(); toast.error("Search failed"); }
                    }}
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Operating Zone (From Work Schedule)</label>
                  <span className="text-[9px] font-bold text-[#942392]">Auto-Assigns to Target Scope</span>
                </div>
                {(() => {
                  const currentAddZone = addZoneOptions.find((o) => o.value === addBranchData.operating_zone || o.value === normalizeZoneCode(addBranchData.operating_zone))?.value || addZoneOptions[0]?.value || 'STANDARD';
                  const selectedOpt = addZoneOptions.find((o) => o.value === currentAddZone) || addZoneOptions[0];
                  const cleanCode = (addBranchData.code || "").trim().toUpperCase();
                  const previewCodes = selectedOpt ? Array.from(
                    new Set([...selectedOpt.branchCodes, ...(cleanCode ? [cleanCode] : [])])
                  ).sort() : [];

                  return (
                    <>
                      <Select value={currentAddZone} onValueChange={(val) => setAddBranchData({ ...addBranchData, operating_zone: val })}>
                        <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm">
                          <SelectValue placeholder="Select Zone" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {addZoneOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                              {opt.fullLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedOpt && (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-[10px]">
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
                                    ? "bg-[#942392] text-white"
                                    : "bg-background text-foreground border border-border/60"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#942392]" />
                      GPS Coordinates
                    </label>
                    <span className="text-[9px] font-bold text-[#942392]">Lat, Lng</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 5.3297, 103.1370"
                      value={addBranchData.latitude && addBranchData.longitude ? `${addBranchData.latitude}, ${addBranchData.longitude}` : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseCoordinates(val);
                        if (parsed) {
                          setAddBranchData((prev: any) => ({ ...prev, latitude: parsed.lat, longitude: parsed.lon }));
                        } else if (val.includes(',')) {
                          const [lat, lng] = val.split(',').map(s => s.trim());
                          setAddBranchData((prev: any) => ({ ...prev, latitude: lat, longitude: lng }));
                        }
                      }}
                      className="w-full h-11 px-3 bg-muted/40 border border-border/80 focus:border-[#942392] rounded-xl text-xs font-mono font-bold"
                    />
                    <Button
                      type="button"
                      onClick={openMapForAddBranch}
                      className="h-11 px-3.5 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#942392] hover:bg-[#800A7A] text-white font-black uppercase text-[10px] tracking-wider shadow-sm transition-all cursor-pointer"
                      title="Select GPS coordinates on Map"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Select on Map
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Normal Radius</label>
                    <span className="text-[9px] font-black text-[#942392]">{addBranchData.radius || 50}m</span>
                  </div>
                  <div className="flex items-center gap-4 h-11 px-3 bg-muted/20 border border-border/50 rounded-xl">
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={addBranchData.radius || 50}
                      onChange={(e) => setAddBranchData({...addBranchData, radius: e.target.value})}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #942392 0%, #942392 ${(((parseFloat(addBranchData.radius || "50") - 0) / 500) * 100)}%, #e5e7eb ${(((parseFloat(addBranchData.radius || "50") - 0) / 500) * 100)}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="text-[10px] font-black w-12 text-right bg-[#942392]/10 text-[#942392] py-1 px-1.5 rounded-md font-mono">
                      {addBranchData.radius}m
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-border/60 bg-card/95 backdrop-blur-xs shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIsAddBranchModalOpen(false)} className="rounded-xl text-xs font-black uppercase cursor-pointer">Cancel</Button>
              <Button type="submit" disabled={isSubmittingBranch} className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2 cursor-pointer">
                {isSubmittingBranch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSubmittingBranch ? "Saving..." : "Add Branch"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 border-none shadow-2xl rounded-3xl overflow-hidden my-auto">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start border-b border-white/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">BRANCH REGISTRATION</DialogTitle>
                <DialogDescription className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/80 m-0 mt-1">UPDATE REGIONAL BRANCH OFFICE IN THE DATABASE</DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={handleEditBranch} className="flex flex-col flex-1 min-h-0 overflow-hidden bg-card">
            <div className="px-5 sm:px-8 pt-4 pb-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Target Entity Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                    TARGET ENTITY (COMPANY)
                  </label>
                  <span className="text-[10px] font-bold text-[#942392]">
                    {loadingEditSchedules ? "Loading Schedules..." : "Work Schedule Scope"}
                  </span>
                </div>
                <Select 
                  value={editBranchData.company_id ? editBranchData.company_id.toString() : "1"} 
                  onValueChange={(val) => void handleEditCompanyChange(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs print:text-[11px] font-bold shadow-sm">
                    <SelectValue placeholder="Select Target Entity (Company)">
                      {(() => {
                        const found = companies.find(c => c.id === editBranchData.company_id);
                        if (!found) return 'Rayhar Travels (Main Company)';
                        const cName = toProperCase(found.company_name);
                        const cType = found.company_type === 'main' ? 'Main Company' : 'Subsidiary';
                        return `${cName} (${cType})`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()} className="text-xs print:text-[11px] font-bold">
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

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH CODE</label>
                  <Input 
                    value={editBranchData.code || ""} 
                    onChange={(e) => setEditBranchData({...editBranchData, code: e.target.value.toUpperCase()})} 
                    required
                    placeholder="e.g. KMM"
                    className="h-11 rounded-xl text-xs print:text-[11px] font-bold uppercase" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH NAME</label>
                  <Input 
                    value={editBranchData.name || ""} 
                    onChange={(e) => setEditBranchData({...editBranchData, name: e.target.value})} 
                    required
                    className="h-11 rounded-xl text-xs print:text-[11px] font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH LOCATION / DISTRICT</label>
                <div className="flex gap-2">
                  <Input 
                    value={editBranchData.location || ""} 
                    onChange={(e) => setEditBranchData({...editBranchData, location: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const addr = editBranchData.location;
                        if (!addr) return;
                        toast.loading("Searching coordinates...");
                        smartGeocode(addr).then(result => {
                          toast.dismiss();
                          if (result) {
                            setEditBranchData((prev: any) => ({...prev, latitude: result.lat, longitude: result.lon}));
                            toast.success("Coordinates found!");
                          } else {
                            toast.error("Could not find coordinates. Try entering just the town/city name.");
                          }
                        }).catch(() => { toast.dismiss(); toast.error("Search failed"); });
                      }
                    }}
                    placeholder="Type address & press Enter or click 🔍"
                    className="h-11 rounded-xl text-xs print:text-[11px] font-bold flex-1"
                  />
                  <button
                    type="button"
                    title="Find Coordinates from Address"
                    className="h-11 px-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1 text-xs print:text-[11px] font-bold cursor-pointer"
                    onClick={async () => {
                      const addr = editBranchData.location;
                      if (!addr) { toast.error("Please enter an address first"); return; }
                      toast.loading("Searching coordinates...");
                      try {
                        const result = await smartGeocode(addr);
                        toast.dismiss();
                        if (result) {
                          setEditBranchData((prev: any) => ({...prev, latitude: result.lat, longitude: result.lon}));
                          toast.success("Coordinates found!");
                        } else {
                          toast.error("Could not find coordinates. Try entering just the town/city name.");
                        }
                      } catch { toast.dismiss(); toast.error("Search failed"); }
                    }}
                  >
                    🔍
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] print:text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">OPERATING ZONE (WORK SCHEDULE)</label>
                {(() => {
                  const currentEditZone = editZoneOptions.find((o) => o.value === editBranchData.operating_zone || o.value === normalizeZoneCode(editBranchData.operating_zone))?.value || editZoneOptions[0]?.value || 'STANDARD';
                  return (
                    <Select
                      value={currentEditZone}
                      onValueChange={(val) => setEditBranchData({ ...editBranchData, operating_zone: val })}
                    >
                      <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs print:text-[11px] font-bold shadow-sm">
                        <SelectValue placeholder="Select Zone" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {editZoneOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs print:text-[11px] font-bold">
                            {opt.fullLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>

              {(() => {
                const selectedOpt = editZoneOptions.find((o) => o.value === normalizeZoneCode(editBranchData.operating_zone)) || editZoneOptions[0];
                if (!selectedOpt) return null;
                const cleanCode = (editBranchData.code || "").trim().toUpperCase();
                const origCode = (editBranchData.original_code || selectedBranch?.code || "").trim().toUpperCase();
                const baseCodes = origCode ? selectedOpt.branchCodes.filter((c) => c !== origCode) : selectedOpt.branchCodes;
                const previewCodes = Array.from(
                  new Set([...baseCodes, ...(cleanCode ? [cleanCode] : [])])
                ).sort();
                return (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-[10px]">
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
                              ? "bg-[#942392] text-white"
                              : "bg-background text-foreground border border-border/60"
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* GPS Coordinates & Radius in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#942392]" />
                      GPS Coordinates
                    </label>
                    <span className="text-[9px] font-bold text-[#942392]">Lat, Lng</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 5.3297, 103.1370"
                      value={editBranchData.latitude && editBranchData.longitude ? `${editBranchData.latitude}, ${editBranchData.longitude}` : (editBranchData.latitude || "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseCoordinates(val);
                        if (parsed) {
                          setEditBranchData((prev: any) => ({ ...prev, latitude: parsed.lat, longitude: parsed.lon }));
                        } else if (val.includes(',')) {
                          const [lat, lng] = val.split(',').map(s => s.trim());
                          setEditBranchData((prev: any) => ({ ...prev, latitude: lat, longitude: lng }));
                        } else {
                          setEditBranchData((prev: any) => ({ ...prev, latitude: val }));
                        }
                      }}
                      className="w-full h-11 px-3 bg-muted/40 border border-border/80 focus:border-[#942392] rounded-xl text-xs font-mono font-bold"
                    />
                    <Button
                      type="button"
                      onClick={openMapForEditBranch}
                      className="h-11 px-3.5 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#942392] hover:bg-[#800A7A] text-white font-black uppercase text-[10px] tracking-wider shadow-sm transition-all cursor-pointer"
                      title="Select GPS coordinates on Map"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Select on Map
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-foreground uppercase tracking-widest">Normal Radius</label>
                    <span className="text-[9px] font-black text-[#942392]">{editBranchData.radius || 50}m</span>
                  </div>
                  <div className="flex items-center gap-4 h-11 px-3 bg-muted/20 border border-border/50 rounded-xl">
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={editBranchData.radius || 50}
                      onChange={(e) => setEditBranchData({...editBranchData, radius: e.target.value})}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #942392 0%, #942392 ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="text-[10px] font-black w-12 text-right bg-[#942392]/10 text-[#942392] py-1 px-1.5 rounded-md font-mono">
                      {editBranchData.radius || 50}m
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold px-1">
                    <span>0m</span>
                    <span>500m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-border/60 bg-card/95 backdrop-blur-xs shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIsEditBranchModalOpen(false)} className="rounded-xl text-xs font-black uppercase cursor-pointer">Discard</Button>
              <Button type="submit" disabled={isSubmittingBranch} className="rounded-xl px-6 bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase flex items-center gap-2 cursor-pointer">
                {isSubmittingBranch ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmittingBranch ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-0 gap-0 border-none shadow-2xl overflow-hidden rounded-[24px] flex flex-col my-auto">
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">UPDATE BRANCH LOCATION</DialogTitle>
                <DialogDescription className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/80 m-0 mt-1">UPDATE GPS COORDINATES AND ADDRESS</DialogDescription>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 h-[520px]">
            <div className="md:col-span-2 relative h-full">
              {(() => {
                const curLat = parseFloat(String(editBranchData.latitude)) || 4.2248;
                const curLng = parseFloat(String(editBranchData.longitude)) || 103.4194;
                return (
                  <MapContainer
                    center={[curLat, curLng]}
                    zoom={16}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      subdomains={['a', 'b', 'c']}
                      maxZoom={19}
                    />
                    <BranchLocationPickerMap
                      lat={curLat}
                      lng={curLng}
                      onPickLocation={(lat, lng) => {
                        const latStr = lat.toFixed(6);
                        const lngStr = lng.toFixed(6);
                        setEditBranchData((prev: any) => ({ ...prev, latitude: latStr, longitude: lngStr }));
                        setPasteCoordsInput(`${latStr}, ${lngStr}`);
                        fastReverseGeocode(lat, lng).then((addr) => {
                          if (addr) setEditBranchData((prev: any) => ({ ...prev, location: addr }));
                        }).catch(console.error);
                      }}
                    />
                  </MapContainer>
                );
              })()}
            </div>
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
              <div className="space-y-4">
                {/* Google Maps Quick Paste */}
                <div className="space-y-1.5 p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <label className="text-[10px] print:text-[13px] font-black uppercase tracking-wider text-[#942392]">
                    PASTE COORDINATES (GOOGLE MAPS)
                  </label>
                  <Input 
                    value={pasteCoordsInput}
                    onChange={(e) => handlePasteCoordsChange(e.target.value)}
                    placeholder="e.g. 5.3297, 103.1370 or Maps link"
                    className="h-10 rounded-xl text-xs font-mono font-bold bg-white dark:bg-background border-purple-300 dark:border-purple-700 focus-visible:ring-[#942392]"
                  />
                </div>

                {/* Manual Coordinates */}
                <div className="space-y-2">
                  <label className="text-[10px] print:text-[13px] font-black uppercase tracking-widest text-foreground">MANUAL COORDINATES</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      value={editBranchData.latitude || ""} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditBranchData((prev: any) => ({ ...prev, latitude: val }));
                        setPasteCoordsInput(`${val}, ${editBranchData.longitude || ""}`);
                      }}
                      placeholder="Latitude"
                      className="h-10 rounded-xl text-xs print:text-[11px] font-mono font-bold"
                    />
                    <Input 
                      value={editBranchData.longitude || ""} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditBranchData((prev: any) => ({ ...prev, longitude: val }));
                        setPasteCoordsInput(`${editBranchData.latitude || ""}, ${val}`);
                      }}
                      placeholder="Longitude"
                      className="h-10 rounded-xl text-xs print:text-[11px] font-mono font-bold"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200 cursor-pointer shadow-xs" 
                    onClick={handleApplyLocation}
                  >
                    Apply Location
                  </Button>
                </div>
                
                {/* Address lookup display */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] print:text-[13px] font-black uppercase tracking-widest text-foreground">Address / Display Name</label>
                  <div className={`p-3 bg-card border rounded-xl shadow-xs text-xs leading-relaxed max-h-24 overflow-y-auto ${editBranchData.location ? 'text-foreground font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                    {editBranchData.location || "Click map or click Apply Location to locate address"}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto flex gap-3 pt-6 border-t border-border/60 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">Cancel</Button>
                <Button type="button" onClick={handleSaveMapCoordinates} className="flex-1 h-11 rounded-xl bg-[#942392] hover:bg-[#800A7A] text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer">Save Coordinates</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Permanently Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && setDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 gap-0 border-0 border-none shadow-2xl rounded-2xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#ff0000] p-5 border-b border-red-700/30 text-left">
            <DialogTitle className="text-xl font-black text-white">
              Delete Branch Permanently
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4 bg-card">
            <p className="text-sm text-foreground">
              Are you sure you want to delete branch <strong>{branchToDelete?.code} - {branchToDelete ? (toProperCase(branchToDelete.name || branchToDelete.branch || '')) : ''}</strong>?
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
}


