import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "../config/api";
import Map, { Marker as MapMarker, NavigationControl, useMap as useMapLibre } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPLIBRE_STYLE = {
  version: 8 as const,
  sources: {
    "osm": {
      type: "raster" as const,
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors"
    }
  },
  layers: [{ id: "osm-layer", type: "raster" as const, source: "osm", minzoom: 0, maxzoom: 19 }]
};

// Smart geocoding: tries multiple strategies for Malaysian addresses
async function smartGeocode(address: string): Promise<{lat: string, lon: string} | null> {
  const trySearch = async (q: string) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=my&limit=1&accept-language=en`);
    const data = await r.json();
    return data && data.length > 0 ? data[0] : null;
  };

  // Strategy 1: Full address + Malaysia
  let result = await trySearch(address + ", Malaysia");
  if (result) return result;

  // Strategy 2: Strip lot/unit numbers (common in Malaysian addresses)
  // Remove LOT XXXX, NO. X, PT XXX patterns
  const stripped = address
    .replace(/\b(LOT|PT|NO\.?|UNIT|BLOK|BLK|KM|KILOMETER)\s*[\d\w-]+[,\s]*/gi, '')
    .replace(/^[,\s]+/, '').trim();
  if (stripped && stripped !== address) {
    result = await trySearch(stripped + ", Malaysia");
    if (result) return result;
  }

  // Strategy 3: Extract words that look like town/city (skip lot numbers, ignore short tokens)
  // Split by commas and try from right to left (city/state usually at end)
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const partial = parts.slice(i).join(', ');
    if (partial.length > 3) {
      result = await trySearch(partial + ", Malaysia");
      if (result) return result;
    }
  }

  // Strategy 4: Try just last 2 parts (town, state)
  if (parts.length >= 2) {
    result = await trySearch(parts.slice(-2).join(', ') + ", Malaysia");
    if (result) return result;
  }

  return null;
}


function MapController({ lat, lng }: { lat: number, lng: number }) {
  const { current: map } = useMapLibre();
  useEffect(() => {
    if (map && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo({ center: [lng, lat], zoom: map.getZoom(), duration: 1000 });
    }
  }, [lat, lng, map]);
  return null;
}


import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { getCleanReason } from "@/lib/leaveStorage";
import PageActions from "@/components/layout/PageActions";

const branches = [
  {
    code: "HQ",
    name: "Rayhar HQ",
    location: "Kemaman,Terengganu",
    leader: "Maria Santos",
  },
  {
    code: "KMM",
    name: "Kemaman",
    location: "Kemaman,Terengganu",
    leader: "Maria Santos",
  },
  {
    code: "CNH",
    name: "Cheneh",
    location: "Kemaman,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "KBG",
    name: "Kuala Berang",
    location: "Hulu Terengganu,Terengganu",
    leader: "David Chen",
  },
  {
    code: "TGG",
    name: "Kuala Terengganu",
    location: "Kuala Terengganu,Terengganu",
    leader: "David Chen",
  },
  {
    code: "DGN",
    name: "Dungun",
    location: "Dungun,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "JTH",
    name: "Jertih",
    location: "Besut,Terengganu",
    leader: "Roberto Lim",
  },
  {
    code: "KBR",
    name: "Kota Bharu",
    location: "Kota Bharu,Kelantan",
    leader: "Roberto Lim",
  },
  {
    code: "RMP",
    name: "Rompin",
    location: "Rompin,Pahang",
    leader: "Roberto Lim",
  },
  {
    code: "MZM",
    name: "Muadzam Shah",
    location: "Muadzam Shah,Pahang",
    leader: "Roberto Lim",
  },
  {
    code: "SHA",
    name: "Shah Alam",
    location: "Shah Alam,Selangor",
    leader: "Roberto Lim",
  },
  {
    code: "BBB",
    name: "Bandar Baru Bangi",
    location: "Bandar Baru Bangi,Selangor",
    leader: "Roberto Lim",
  },
  {
    code: "KUL",
    name: "Kuala Lumpur",
    location: "Kuala Lumpur,Wilayah Persekutuan",
    leader: "Roberto Lim",
  },
  { code: "IPH", name: "Ipoh", location: "Ipoh,Perak", leader: "Roberto Lim" },
  {
    code: "MJG",
    name: "Manjung",
    location: "Manjung,Perak",
    leader: "Roberto Lim",
  },
  {
    code: "KKS",
    name: "Kuala Kangsar",
    location: "Kuala Kangsar,Perak",
    leader: "Roberto Lim",
  },
  {
    code: "MLK",
    name: "Melaka",
    location: "Melaka,Melaka",
    leader: "Roberto Lim",
  },
  {
    code: "AOR",
    name: "Alor Setar",
    location: "Alor Setar,Kedah",
    leader: "Roberto Lim",
  },
  {
    code: "BTM",
    name: "Bertam",
    location: "Bertam,Pulau Pinang",
    leader: "Roberto Lim",
  },
  {
    code: "SNS",
    name: "Seremban",
    location: "Seremban,Negeri Sembilan",
    leader: "Roberto Lim",
  },
  {
    code: "BTP",
    name: "Batu Pahat",
    location: "Batu Pahat,Johor",
    leader: "Roberto Lim",
  },
  {
    code: "JB",
    name: "Johor Bharu",
    location: "Johor Bharu,Johor",
    leader: "Roberto Lim",
  },
  {
    code: "TWU",
    name: "Tawau",
    location: "Tawau,Sabah",
    leader: "Roberto Lim",
  },
];

type BranchEmployee = {
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

export default function Branches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
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
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [editBranchData, setEditBranchData] = useState<any>({});
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const openEditModal = () => {
    setEditBranchData({
      code: selectedBranch.code,
      name: selectedBranch.name,
      location: selectedBranch.location || "",
      operating_zone: selectedBranch.operating_zone || "ZONE_B",
      latitude: selectedBranch.latitude || "",
      longitude: selectedBranch.longitude || "",
      radius: selectedBranch.radius || 50
    });
    setIsEditBranchModalOpen(true);
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches/${encodeURIComponent(editBranchData.code)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBranchData.name,
          location: editBranchData.location,
          operating_zone: editBranchData.operating_zone,
          latitude: parseFloat(editBranchData.latitude) || null,
          longitude: parseFloat(editBranchData.longitude) || null,
          radius: parseFloat(editBranchData.radius) || 50,
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Branch updated successfully!");
        setIsEditBranchModalOpen(false);
        fetchBranchesList();
        setSelectedBranch(data.branch || { ...selectedBranch, ...editBranchData });
      } else {
        toast.error(data.error || "Failed to update branch");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const filteredBranches = useMemo(() => {
    return allBranches.filter(
      (b) =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allBranches, searchQuery]);

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to page 1 whenever search or pageSize changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / pageSize));
  const paginatedBranches = viewMode === "grid" ? filteredBranches : filteredBranches.slice((currentPage - 1) * pageSize, currentPage * pageSize);



  const fetchTemporaryStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments-all`);
      const data = await res.json();
      if (data.success) {
        setTemporaryStaff(data.assignments || []);
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

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/branches`);
        const data = await response.json();
        if (data.success) {
          setAllBranches(data.branches);
        }
      } catch (err) {
        console.error("Error fetching branches", err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const fetchBranchesList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`);
      const data = await response.json();
      if (data.success) setAllBranches(data.branches);
    } catch (err) {}
  };

  useEffect(() => {
    if (allBranches.length > 0) {
      const fetchBranchStats = async () => {
        try {
          const params = new URLSearchParams({
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          });
          const response = await fetch(
            `${API_BASE_URL}/api/analytics/branch-stats?${params}`,
          );
          const data = await response.json();
          if (data.success) setBranchStats(data.data || []);
        } catch (err) {
          console.error("Error fetching branch stats", err);
        }
      };
      fetchBranchStats();
    }
  }, [allBranches]);

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

  const handleDeleteBranch = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (code === "HQ") {
      toast.error("Cannot delete default Rayhar HQ branch");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete branch ${code}?`))
      return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/branches/${encodeURIComponent(code)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Branch deleted successfully");
        fetchBranchesList();
      } else {
        toast.error(data.error || "Failed to delete branch");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/branches-stats`);
        const data = await response.json();
        if (data.success) {
          setBranchStats(data.stats || []);
        }
      } catch (err) {
        console.error("Error fetching branch stats", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

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
                onClick={() => setSelectedBranch(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Back to branches
                </span>
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-responsive-xl font-black text-foreground tracking-tight truncate">
                  {selectedBranch.name}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                >
                  {selectedBranch.code}
                </Badge>
                <Button variant="outline" size="sm" onClick={openEditModal} className="h-8 text-xs font-bold ml-2">Edit Branch</Button>
              </div>
              <p className="text-responsive-sm text-foreground font-medium mt-1">
                Branch staff overview and analytics
              </p>
            </div>
            
            {selectedBranch.operating_zone && (
              <div className="flex-shrink-0 bg-white dark:bg-card border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md self-start">
                <p className="mb-2"><span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Operating Hours ({selectedBranch.operating_zone === 'ZONE_A' ? 'Zone A' : 'Zone B'})</span></p>
                <div className="flex flex-wrap sm:flex-nowrap gap-4 sm:gap-6 text-[11px] text-foreground">
                  {selectedBranch.operating_zone === 'ZONE_A' ? (
                    <>
                      <div className="space-y-1 border-l-2 border-[#942392] pl-2.5">
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#942392]" /> 8:30 AM – 5:30 PM (Saturday – Wednesday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#942392]" /> 8:30 AM – 1:00 PM (Thursday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#942392]" /> 8:30 AM – 5:30 PM (First Thursday of the Month)</p>
                      </div>
                      <div className="space-y-1 border-l-2 border-rose-500 pl-2.5">
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (Friday)</p>
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (First Saturday of the Month)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 border-l-2 border-[#942392] pl-2.5">
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#942392]" /> 8:30 AM – 5:30 PM (Monday – Friday)</p>
                        <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#942392]" /> 8:30 AM – 1:00 PM (Saturday)</p>
                      </div>
                      <div className="space-y-1 border-l-2 border-rose-500 pl-2.5">
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (Sunday)</p>
                        <p className="flex items-center gap-2 text-rose-500/90"><X className="w-3 h-3" /> Closed (First Saturday of the Month)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 bg-card/60 backdrop-blur-md rounded-[32px] border border-border/50">
              <Loader2 className="h-10 w-10 animate-spin text-[#942392]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground animate-pulse">
                Syncing Branch Data...
              </p>
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-foreground border-b border-border">
                        <th className="text-left py-4 px-6 text-[10px] tracking-[0.2em] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Personnel
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] tracking-[0.2em] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Leave Balance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] tracking-[0.2em] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Attendance
                        </th>
                        <th className="text-left py-4 px-6 text-[10px] tracking-[0.2em] text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">
                          Today
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employees.length > 0 ? (
                        employees.map((employee) => (
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
                                <div className="w-9 h-9 rounded-xl bg-[#942392]/10 flex items-center justify-center text-[11px] font-black text-[#942392] group-hover:scale-110 transition-transform">
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
                                  <p className="text-[10px] text-foreground truncate font-medium uppercase tracking-widest">
                                    {employee.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs uppercase">
                              {employee.annual_leave_balance} DAYS
                            </td>
                            <td className="py-4 px-6 font-bold text-foreground text-xs">
                              {employee.attendance_rate || 0}%
                            </td>
                            <td className="py-4 px-6">
                              <Badge
                                className={`text-[9px] font-black px-2.5 h-5 ${
                                  employee.today_status === "Present (On Time)" || employee.today_status === "Present"
                                    ? "bg-emerald-500 text-white"
                                    : employee.today_status === "Present (Late)"
                                      ? "bg-amber-500 text-white"
                                      : employee.today_status === "Outstation"
                                        ? "bg-pink-500 text-white"
                                        : employee.today_status === "On Leave"
                                          ? "bg-blue-500 text-white"
                                          : employee.today_status === "Company Leave"
                                            ? "bg-purple-500 text-white"
                                            : "bg-rose-500 text-white"
                                }`}
                              >
                                {employee.today_status}
                              </Badge>
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
                    employees.map((employee) => (
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
                            <Badge
                              className={`text-[9px] font-black h-5 shrink-0 ${
                                employee.today_status === "Present (On Time)" || employee.today_status === "Present"
                                  ? "bg-emerald-500 text-white"
                                  : employee.today_status === "Present (Late)"
                                    ? "bg-amber-500 text-white"
                                    : employee.today_status === "Outstation"
                                      ? "bg-pink-500 text-white"
                                      : employee.today_status === "On Leave"
                                        ? "bg-blue-500 text-white"
                                        : employee.today_status === "Company Leave"
                                          ? "bg-purple-500 text-white"
                                          : "bg-rose-500 text-white"
                              }`}
                            >
                              {employee.today_status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground uppercase tracking-wider">
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
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Original Branch</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {onDutyStaff.map((assignment: any) => (
                                    <tr key={`duty-${assignment.id}`} className="hover:bg-purple-500/5 transition-colors">
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-[11px] font-black text-purple-700 dark:text-purple-300">
                                            {assignment.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-foreground">{assignment.name}</p>
                                            <p className="text-[10px] text-foreground truncate font-medium uppercase tracking-widest flex items-center gap-1">
                                              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">TEMP</span>
                                              {assignment.employee}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 font-medium text-foreground text-xs">
                                        {assignment.primary_branch} • {assignment.department}
                                      </td>
                                      <td className="py-4 px-6 text-xs font-semibold text-foreground">
                                        {new Date(assignment.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(assignment.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                      <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md rounded-[24px]">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-500/10 text-slate-900 dark:text-slate-100 border-b border-slate-500/20">
                                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Personnel</th>
                                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Original Branch</th>
                                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Assignment Period</th>
                                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {branchTempStaff.map((assignment: any) => {
                                  const isActive = onDutyStaff.some((a: any) => a.id === assignment.id);
                                  return (
                                    <tr key={`hist-${assignment.id}`} className="hover:bg-slate-500/5 transition-colors opacity-80">
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-slate-500/20 flex items-center justify-center text-[11px] font-black text-slate-700 dark:text-slate-300">
                                            {assignment.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-bold text-foreground">{assignment.name}</p>
                                            <p className="text-[10px] text-foreground truncate font-medium uppercase tracking-widest flex items-center gap-1">
                                              {assignment.employee}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 font-medium text-foreground text-xs">
                                        {assignment.primary_branch} • {assignment.department}
                                      </td>
                                      <td className="py-4 px-6 text-xs font-semibold text-foreground">
                                        {new Date(assignment.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(assignment.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="py-4 px-6 text-xs font-semibold">
                                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-widest font-black ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                          {isActive ? 'On Duty' : assignment.status}
                                        </span>
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
            <DialogContent className="max-w-2xl w-full overflow-hidden max-h-[90vh] p-0 flex flex-col">
              <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">STAFF PROFILE</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">VIEW AND ANALYZE STAFF METRICS</DialogDescription>
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {selectedEmployee ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Bio */}
                      <div className="bg-card p-6 rounded-[24px] border border-border/50 flex flex-col items-center text-center shadow-sm">
                        <div className="w-24 h-24 rounded-2xl bg-[#942392] flex items-center justify-center text-white text-4xl font-black shadow-xl mb-4">
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
                          className="mt-4 text-[10px] uppercase font-black px-3 py-1 bg-[#942392]/10 text-[#942392] border-none"
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
                              {selectedBranch?.name || "BRANCH"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              Department
                            </span>
                            <span className="font-black text-foreground">
                              Haji Umrah (BHU)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                              Status
                            </span>
                            <Badge
                              className={`text-white font-black text-[9px] h-5 ${selectedEmployee.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`}
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
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                              Annual Left
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-emerald-500/30 transition-colors group">
                            <TrendingUp className="mb-2 h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.attendance_rate || 0}%
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                              Attendance
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-amber-500/30 transition-colors group">
                            <Clock className="mb-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.pending_leaves}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                              Pending
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-border/50 p-4 bg-card/50 hover:border-purple-500/30 transition-colors group">
                            <FileText className="mb-2 h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                            <p className="text-2xl font-black text-foreground">
                              {selectedEmployee.mc_leaves || 0}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
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
                              <Badge className="bg-emerald-500 text-white font-black h-5 text-[10px] group-hover:scale-110 transition-transform">
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
                              <Badge className="bg-amber-500 text-white font-black h-5 text-[10px] group-hover:scale-110 transition-transform">
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
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="px-3 py-1.5 text-xs font-bold bg-muted/30 border-border/60 flex items-center justify-center rounded-md h-9"
                >
                  Total{" "}
                  <span className="ml-2 flex items-center justify-center bg-[#942392] text-white rounded-md h-5 min-w-[20px] px-1.5 text-[10px] leading-none shrink-0">
                    {allBranches.length}
                  </span>
                </Badge>
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
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
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg px-3 py-1.5 h-7 gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 touch-target ${
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
                    className={`rounded-lg px-3 py-1.5 h-7 gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 touch-target ${
                      viewMode === "line"
                        ? "bg-[#942392] text-white hover:bg-[#942392]/90 shadow-md"
                        : "text-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </Button>
                </div>
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
                const leader =
                  branch.leader_name || staticInfo?.leader || "Branch Leader";

                return (
                  <Card
                    key={branch.code}
                    className="cursor-pointer hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] hover:-translate-y-1.5 transition-all duration-300 border border-slate-100 dark:border-slate-800/80 shadow-[0_16px_40px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.45)] bg-white dark:bg-card overflow-visible group rounded-[32px] relative pt-12"
                    onClick={() =>
                      setSelectedBranch({
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
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[82px] h-[82px] rounded-full bg-white dark:bg-card p-1 shadow-[0_8px_25px_rgba(0,0,0,0.12)] border-[3px] border-white dark:border-slate-800 flex items-center justify-center z-20 group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full bg-[#EDE4F0] dark:bg-purple-950/60 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-[#942392]" strokeWidth={2.2} />
                      </div>
                    </div>

                    <CardContent className="p-0 relative">
                      {/* Top Right Badges */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                        <div className="font-extrabold text-[11px] h-8 px-3.5 bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] rounded-xl flex items-center justify-center">
                          {branch.code}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 bg-white/95 dark:bg-slate-800/95 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80 dark:border-slate-700 flex items-center justify-center"
                          onClick={(e) => handleDeleteBranch(e, branch.code)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Branch Info */}
                      <div className="flex flex-col items-center pt-2 pb-4">
                        <h3 className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl leading-tight text-center px-4">
                          {branch.name}
                        </h3>
                        <div className="flex items-center justify-center gap-1.5 mt-2 px-6 max-w-full">
                          <MapPin className="w-3.5 h-3.5 text-[#942392] shrink-0" />
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight text-center line-clamp-1">
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
                          <p className="text-[9px] font-black text-[#942392] uppercase mt-1 tracking-widest">Present</p>
                        </div>
                        {/* Leave */}
                        <div className="flex-1 flex flex-col items-center border-r border-slate-100 dark:border-slate-800 last:border-0">
                          <Leaf className="w-5 h-5 text-amber-500 mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-amber-500 leading-none">{onLeave}</p>
                          <p className="text-[9px] font-black text-amber-500 uppercase mt-1 tracking-widest">Leave</p>
                        </div>
                        {/* Outstation */}
                        <div className="flex-1 flex flex-col items-center border-r border-slate-100 dark:border-slate-800 last:border-0">
                          <Briefcase className="w-5 h-5 text-[#942392] mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-[#942392] leading-none">{outstation}</p>
                          <p className="text-[9px] font-black text-[#942392] uppercase mt-1 tracking-widest">Outstation</p>
                        </div>
                        {/* Absent */}
                        <div className="flex-1 flex flex-col items-center">
                          <UserX className="w-5 h-5 text-amber-500 mb-1.5" strokeWidth={2.2} />
                          <p className="text-xl font-black text-amber-500 leading-none">{absent}</p>
                          <p className="text-[9px] font-black text-amber-500 uppercase mt-1 tracking-widest">Absent</p>
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
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
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                        <div className="text-right min-w-0">
                          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                            Leader:
                          </p>
                          <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate uppercase max-w-[160px]">
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
                  <Table>
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
                        <TableHead>Leader</TableHead>
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
                        const leader =
                          branch.leader_name ||
                          staticInfo?.leader ||
                          "Branch Leader";

                        return (
                          <TableRow
                            key={branch.code}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={() =>
                              setSelectedBranch({
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
                                  <p className="font-medium text-foreground flex items-center gap-2">
                                    {branch.name}
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[9px] h-4 px-1.5 bg-muted/20 border-border/50"
                                    >
                                      {branch.code}
                                    </Badge>
                                  </p>
                                  <p className="text-[10px] text-foreground truncate uppercase tracking-widest">
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
                              <span className="text-sm italic text-foreground truncate block max-w-[150px]">
                                {leader}
                              </span>
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
                                  handleDeleteBranch(e, branch.code)
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
          <div className="p-4 sm:p-6 space-y-6">
            {loadingLeaves ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#942392]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
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
                              className="pdf-btn flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#942392] text-white px-3 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-md"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Save to PDF
                            </button>
                          </div>
                          <div className="text-center border-b-2 border-foreground/50 dark:border-purple-500/50 pb-4">
                            <h2 className="text-2xl font-black tracking-tighter text-foreground dark:text-purple-400">
                              RAYHAR GROUP
                            </h2>
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60 dark:text-purple-300">
                              Permohonan Cuti Kakitangan
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Nama Penuh
                              </span>
                              <p className="border-b pb-1 border-border/40 truncate">
                                {selectedEmployee?.full_name}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Cawangan
                              </span>
                              <p className="border-b pb-1 border-border/40">
                                {selectedBranch?.code || "HQ"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Jenis Cuti
                              </span>
                              <p className="border-b pb-1 border-border/40">
                                {req.leave_type}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50">
                                Status
                              </span>
                              <p
                                className={`font-black uppercase ${req.status === "Rejected" ? "text-rose-600" : "text-[#942392]"}`}
                              >
                                {req.status}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 rounded-[20px] border border-border/50">
                            <div className="text-center flex flex-col justify-center">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">
                                Dari
                              </p>
                              <p className="font-black text-xs sm:text-sm">{fromStr}</p>
                            </div>
                            <div className="text-center flex flex-col justify-center border-l border-border/50">
                              <p className="text-[9px] uppercase font-black text-slate-950 dark:text-slate-50 mb-1">
                                Hingga
                              </p>
                              <p className="font-black text-xs sm:text-sm">{toStr}</p>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 rounded-[14px] border border-border/50 py-1 shadow-sm flex flex-col justify-center">
                              <p className="text-[9px] uppercase font-black text-[#942392]">
                                Hari
                              </p>
                              <p className="font-black text-lg text-[#942392] leading-none mt-0.5">
                                {req.days}
                              </p>
                            </div>
                            <div className="text-center rounded-[14px] border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center py-1">
                              <p className="text-[9px] uppercase font-black text-emerald-600">Baki Layak</p>
                              <p className="font-black text-sm text-emerald-600 mt-0.5">
                                {selectedEmployee?.annual_leave_balance ?? req.balance ?? "-"} HARI
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-slate-950 dark:text-slate-50 tracking-widest">
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
                                  <span className="text-[10px] font-black text-[#942392] uppercase tracking-widest">
                                    MC Attachment
                                  </span>
                                </div>
                                <a
                                  href={`${API_BASE_URL}${req.mc_file_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-black uppercase tracking-widest bg-[#942392] text-white px-4 py-2 rounded-xl hover:bg-[#5e0080] transition-colors shadow-lg"
                                >
                                  View File
                                </a>
                              </div>
                            )}

                          <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="w-4 h-4 text-rose-500" />
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
                                Maklumat Waris (Kecemasan)
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-[20px]">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Nama
                                </span>
                                <p className="text-[11px] font-bold truncate">
                                  {req.waris_nama || "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Hubungan
                                </span>
                                <p className="text-[11px] font-bold truncate">
                                  {req.waris_hubungan || "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  No. Telefon
                                </span>
                                <p className="text-[11px] font-black text-[#942392]">
                                  {req.waris_phone || "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black text-slate-950 dark:text-slate-50 uppercase">
                                  Alamat
                                </span>
                                <p className="text-[10px] font-bold text-foreground break-words">
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
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">
                                  Approval History
                                </h3>
                              </div>
                              <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                                {req.approval_history.map((history: any, idx: number) => (
                                  <div key={idx} className="relative flex items-start gap-4">
                                    <div className={`absolute left-4 -translate-x-1/2 flex h-2 w-2 items-center justify-center rounded-full border border-white dark:border-slate-900 ${history.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'} z-10`} />
                                    <div className="ml-6 flex-1 bg-muted/30 rounded-[16px] p-3 border border-border/40">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${history.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                            {history.status}
                                          </span>
                                          <span className="text-[10px] font-black text-foreground/70">
                                            by {history.approver_name || history.approver_id}
                                          </span>
                                        </div>
                                        <span className="text-[8px] font-black text-foreground/50">
                                          {new Date(history.created_at).toLocaleDateString('ms-MY')}
                                        </span>
                                      </div>
                                      {history.remarks && (
                                        <p className="text-[10px] italic text-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg mt-1">
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
                          <div className="hidden print:grid grid-cols-2 gap-16 pt-12 pb-4">
                            <div className="border-t border-foreground pt-2 text-center">
                              <p className="text-[10px] font-bold uppercase">Tandatangan Kakitangan</p>
                            </div>
                            <div className="border-t border-foreground pt-2 text-center">
                              <p className="text-[10px] font-bold uppercase">Kelulusan Pengurus / HR</p>
                            </div>
                          </div>
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

      <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
        <DialogContent className="max-w-2xl p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">BRANCH REGISTRATION</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">UPDATE REGIONAL BRANCH OFFICE IN THE DATABASE</DialogDescription>
              </div>
            </div>
          </div>
          <form onSubmit={handleEditBranch} className="p-8 space-y-6 bg-white dark:bg-card">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH CODE</label>
                <Input value={editBranchData.code || ""} readOnly disabled className="h-11 rounded-xl bg-muted/50 text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH NAME</label>
                <Input 
                  value={editBranchData.name || ""} 
                  onChange={(e) => setEditBranchData({...editBranchData, name: e.target.value})} 
                  required
                  className="h-11 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">BRANCH LOCATION / DISTRICT</label>
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
                  className="h-11 rounded-xl text-xs font-bold flex-1"
                />
                <button
                  type="button"
                  title="Find Coordinates from Address"
                  className="h-11 px-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1 text-xs font-bold"
                  onClick={async () => {
                    const addr = editBranchData.location;
                    if (!addr) { toast.error("Please enter an address first"); return; }
                    toast.loading("Searching coordinates...");
                    try {
                      const result = await smartGeocode(addr);
                      toast.dismiss();
                      if (result) {
                        setEditBranchData((prev: any) => ({...prev, latitude: result.lat, longitude: result.lon}));
                        toast.success("Coordinates found! Click 'Update Location' to view on map.");
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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">OPERATING ZONE</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-input bg-transparent text-xs font-bold shadow-sm"
                  value={editBranchData.operating_zone || "ZONE_B"}
                  onChange={(e) => setEditBranchData({...editBranchData, operating_zone: e.target.value})}
                >
                  <option value="ZONE_A">ZONE A (Fri/Sat Weekend)</option>
                  <option value="ZONE_B">ZONE B (Sat/Sun Weekend)</option>
                </select>
              </div>
              <div className="space-y-1.5 cursor-pointer" onClick={() => setIsMapModalOpen(true)}>
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">COORDINATES</label>
                <div className="flex items-center gap-2 h-11 px-4 border border-input rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                  <MapPin className="w-4 h-4 text-[#942392]" />
                  <span className="text-xs font-bold text-foreground">
                    {editBranchData.latitude && editBranchData.longitude 
                      ? `${editBranchData.latitude}, ${editBranchData.longitude}` 
                      : "Select from map"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Radius</label>
                <span className="text-[10px] font-black text-foreground">0m – 500m</span>
              </div>
              <div className="relative pt-6">
                {/* Floating animated label */}
                <div
                  className="absolute -top-1 flex flex-col items-center pointer-events-none transition-all duration-150"
                  style={{ left: `calc(${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}% - ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100) * 0.28}px)` }}
                >
                  <div className="bg-[#942392] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                    {editBranchData.radius || 50}m
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#942392]" />
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={editBranchData.radius || 50}
                  onChange={(e) => setEditBranchData({...editBranchData, radius: e.target.value})}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #942392 0%, #942392 ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-foreground font-bold">0m</span>
                  <span className="text-[9px] text-foreground font-bold">500m</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditBranchModalOpen(false)} className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-wider">Discard</Button>
              <Button type="submit" className="h-11 px-6 rounded-xl bg-[#942392] text-white hover:bg-[#942392]/90 text-[10px] font-black uppercase tracking-wider shadow-md">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-4xl p-0 border-none shadow-2xl overflow-hidden rounded-[24px] flex flex-col">
            <div className="p-6 bg-gradient-to-r from-[#942392] to-purple-500 text-white flex justify-between items-start shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight m-0 text-white">UPDATE BRANCH LOCATION</DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase tracking-wider text-white/80 m-0 mt-1">UPDATE GPS COORDINATES AND ADDRESS</DialogDescription>
                </div>
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
            <div className="md:col-span-2 relative h-full">
              <Map reuseMaps id="branch-coord-picker"
                initialViewState={{
                  longitude: (() => { const v = parseFloat(String(editBranchData.longitude)); return !isNaN(v) ? v : 103.4194; })(),
                  latitude: (() => { const v = parseFloat(String(editBranchData.latitude)); return !isNaN(v) ? v : 4.2248; })(),
                  zoom: 16
                }}
                style={{ height: "100%", width: "100%" }}
                mapStyle={MAPLIBRE_STYLE}
                onClick={(e) => {
                  const { lat, lng } = e.lngLat;
                  setEditBranchData({...editBranchData, latitude: lat.toString(), longitude: lng.toString()});
                  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(res => res.json())
                    .then(data => {
                      if(data && data.display_name) {
                        setEditBranchData((prev: any) => ({...prev, location: data.display_name}));
                      }
                    }).catch(console.error);
                }}
              >
                <NavigationControl position="top-left" />
                {(() => {
                  const _lat = parseFloat(String(editBranchData.latitude));
                  const _lng = parseFloat(String(editBranchData.longitude));
                  return (!isNaN(_lat) && !isNaN(_lng)) ? (
                    <MapMarker longitude={_lng} latitude={_lat} anchor="bottom">
                      <div style={{ width: 24, height: 36 }}>
                        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="#942392"/>
                          <circle cx="12" cy="12" r="5" fill="white"/>
                        </svg>
                      </div>
                    </MapMarker>
                  ) : null;
                })()}
                {(() => {
                  const _lat = parseFloat(String(editBranchData.latitude));
                  const _lng = parseFloat(String(editBranchData.longitude));
                  if (!isNaN(_lat) && !isNaN(_lng)) return <MapController lat={_lat} lng={_lng} />;
                  return null;
                })()}
              </Map>

            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground">Manual Coordinates</label>
                  <Input 
                    value={editBranchData.latitude || ""} 
                    onChange={(e) => setEditBranchData({...editBranchData, latitude: e.target.value})}
                    placeholder="Latitude"
                    className="h-10 rounded-xl text-xs font-bold border-purple-400 focus-visible:ring-purple-400"
                  />
                  <Input 
                    value={editBranchData.longitude || ""} 
                    onChange={(e) => setEditBranchData({...editBranchData, longitude: e.target.value})}
                    placeholder="Longitude"
                    className="h-10 rounded-xl text-xs font-bold"
                  />
                  <Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200" onClick={() => {
                    const lat = parseFloat(String(editBranchData.latitude));
                    const lng = parseFloat(String(editBranchData.longitude));
                    if (!isNaN(lat) && !isNaN(lng)) {
                      // Force re-render to trigger MapController flyTo
                      setEditBranchData((prev: any) => ({...prev, latitude: String(lat), longitude: String(lng)}));
                      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                        .then(r => r.json())
                        .then(data => {
                          if (data && data.display_name) {
                            setEditBranchData((prev: any) => ({...prev, location: data.display_name}));
                          }
                        }).catch(console.error);
                    }
                  }}>
                    Apply Location
                  </Button>
                </div>
                
                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground">Address / Display Name</label>
                  <div className="p-4 bg-white dark:bg-card border rounded-xl shadow-sm text-xs text-foreground leading-relaxed">
                    {editBranchData.location || "Select a location on the map"}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto flex gap-3 pt-6">
                <Button type="button" variant="outline" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white">Cancel</Button>
                <Button type="button" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[#942392] text-white hover:bg-[#942392]/90 text-[10px] font-black uppercase tracking-wider shadow-md">Save</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


