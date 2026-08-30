import React, { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "../config/api";
import { RefreshCw, MapPin , X} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

type Employee = {
  user_id: string;
  full_name?: string;
  branch?: string;
  department?: string;
};

type EmpLocation = {
  user_id: string;
  full_name?: string;
  branch?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  last_updated?: string | null; // ISO
  locationName?: string | null;
  department?: string | null;
  distance?: number | null;
  is_outstation?: boolean;
};

const getMarkerHTML = (loc: EmpLocation, isSelected: boolean) => {
  const isOnline = loc.lat && loc.lng;
  const statusColor = isSelected ? 'bg-amber-500' : (isOnline ? 'bg-emerald-500' : 'bg-rose-500');
  const avatarText = (loc.full_name || loc.user_id).substring(0, 2).toUpperCase();
  const timeText = loc.last_updated ? new Date(loc.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown';
  
  return (
    <div className="flex flex-col items-center justify-end w-full h-full group pb-1 cursor-pointer">
      <div className={`bg-card rounded-full shadow-lg p-1 pr-3 flex items-center gap-2 border ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border'} transition-all hover:scale-105 z-10`}>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground relative">
           {avatarText}
           <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-card`}></div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold whitespace-nowrap text-foreground leading-none">{loc.full_name || loc.user_id}</span>
          <span className="text-[10px] text-foreground whitespace-nowrap mt-1 leading-none">Updated {timeText}</span>
        </div>
      </div>
      <div className={`w-0.5 h-6 ${isSelected ? 'bg-amber-500' : 'bg-emerald-500/50'} z-0 -mt-1`}></div>
      <div className={`w-3 h-3 rounded-full ${statusColor} border-[2.5px] border-white shadow-sm shadow-black/20 z-10 -mt-1 relative`}>
      </div>
    </div>
  );
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

export default function GPSLocationTracker() {
  const { user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Record<string, EmpLocation>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const mapRef = useRef<any | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
    const iv = setInterval(() => void fetchData(), 15000);

    // Subscribe to dedicated employee-locations SSE stream for direct location payloads and events
    try {
      const es = new EventSource(`${API_BASE_URL}/api/employee-locations/stream`);
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data || "{}");
          if (!payload) return;
          if (payload.type === 'employee-locations' && Array.isArray(payload.locations)) {
            const list: Employee[] = [];
            const locMap: Record<string, EmpLocation> = {};
            payload.locations.forEach((r: any) => {
              const userId = r.user_id || r.userId || r.id;
              if (userId) {
                locMap[userId] = {
                  user_id: userId,
                  full_name: r.full_name || r.fullName || null,
                  branch: r.branch || null,
                  lat: r.latitude != null ? Number(r.latitude) : null,
                  lng: r.longitude != null ? Number(r.longitude) : null,
                  accuracy: r.accuracy != null ? Number(r.accuracy) : null,
                  last_updated: r.last_updated ? new Date(r.last_updated).toISOString() : (r.lastUpdated ? new Date(r.lastUpdated).toISOString() : null),
                  locationName: r.location || null,
                  department: r.department || null,
                  distance: r.distance != null ? Number(r.distance) : null,
                  is_outstation: !!r.is_outstation,
                };
                list.push({ user_id: userId, full_name: r.full_name || r.fullName || "", branch: r.branch || "", department: r.department || "" });
              }
            });
            setEmployees(list);
            setLocations(locMap);
            return;
          }

          // Other event types (arrivals, breaches) - show admin alerts
          if (payload.type === 'outstation-arrival' || payload.type === 'outstation' || payload.type === 'location-update') {
            // push alert
            pushAlert({ id: String(Date.now()), type: payload.type, userId: payload.userId || payload.user_id, arrived: payload.arrived, distance_m: payload.distance_m, radius_m: payload.radius_m, ts: new Date().toISOString() });
          }
        } catch (e) {
          console.error('SSE parse error', e);
        }
      };
      es.onerror = (e) => {
        console.error('Employee-locations SSE error', e);
        try { es.close(); } catch (e) {}
      };

      return () => {
        clearInterval(iv);
        try { es.close(); } catch (e) {}
      };
    } catch (e) {
      return () => clearInterval(iv);
    }
  }, []);

  const fetchData = async (showToast = false) => {
    setLoading(true);
    try {
      // Use aggregated endpoint to fetch all locations at once
      const res = await fetch(`${API_BASE_URL}/api/employee-locations`);
      const j = await res.json();
      const list: Employee[] = [];
      const locMap: Record<string, EmpLocation> = {};
      if (j && j.success && Array.isArray(j.locations)) {
        j.locations.forEach((r: any) => {
          const userId = r.user_id || r.userId || r.id;
          if (userId) {
            locMap[userId] = {
              user_id: userId,
              full_name: r.full_name || r.fullName || null,
              branch: r.branch || null,
              lat: r.latitude != null ? Number(r.latitude) : null,
              lng: r.longitude != null ? Number(r.longitude) : null,
              accuracy: r.accuracy != null ? Number(r.accuracy) : null,
              last_updated: r.last_updated ? new Date(r.last_updated).toISOString() : (r.lastUpdated ? new Date(r.lastUpdated).toISOString() : null),
              locationName: r.location || null,
              department: r.department || null,
              distance: r.distance != null ? Number(r.distance) : null,
              is_outstation: !!r.is_outstation,
            };
            list.push({ user_id: userId, full_name: r.full_name || r.fullName || "", branch: r.branch || "", department: r.department || "" });
          }
        });
      }
      setEmployees(list);
      setLocations(locMap);

      if (showToast) {
        toast({ title: "Location Updated", description: "Locations for all users have been updated successfully." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const visibleEmployees = useMemo(() => {
    let list = employees;
    if (role === 'employee' || role === 'branch_officer') {
      list = list.filter(e => e.user_id === user?.user_id);
    } else if (role === 'branch_leader') {
      list = list.filter(e => (e.branch || '') === (user?.branch || ''));
    } else if (role === 'head_of_department') {
      list = list.filter(e => (e.department || '') === (user?.department || ''));
    }
    return list;
  }, [employees, role, user]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    visibleEmployees.forEach((e) => set.add(e.branch || "Unknown"));
    return ["All", ...Array.from(set).sort((a, b) => {
      if (a === "Rayhar HQ" || a === "HQ") return -1;
      if (b === "Rayhar HQ" || b === "HQ") return 1;
      return a.localeCompare(b);
    })];
  }, [visibleEmployees]);

  const filtered = useMemo(() => {
    let result = visibleEmployees
      .filter((e) => (branchFilter === "All" ? true : (e.branch || "") === branchFilter))
      .filter((e) => (query ? (e.full_name || "").toLowerCase().includes(query.toLowerCase()) : true))
      .filter((e) => {
        if (statusFilter === "All") return true;
        const loc = locations[e.user_id];
        if (statusFilter === "Outstation") {
          return loc?.is_outstation;
        }
        const isAvail = !!(loc?.lat && loc?.lng && !loc?.is_outstation);
        if (statusFilter === "Available") return isAvail;
        if (statusFilter === "Unavailable") return !isAvail && !loc?.is_outstation;
        return true;
      });
      
    return result.sort((a, b) => {
      const locA = locations[a.user_id];
      const locB = locations[b.user_id];
      const timeA = locA?.last_updated ? new Date(locA.last_updated).getTime() : 0;
      const timeB = locB?.last_updated ? new Date(locB.last_updated).getTime() : 0;
      return timeB - timeA;
    });
  }, [visibleEmployees, branchFilter, query, statusFilter, locations]);

  const focusOn = (empId: string) => {
    const loc = locations[empId];
    if (!loc || loc.lat == null || loc.lng == null || isNaN(Number(loc.lat)) || isNaN(Number(loc.lng))) { toast({ title: "No Location Data", description: "This employee hasn't submitted their GPS location yet or it is invalid.", variant: "default" }); return; } if (!mapRef.current) return;
    try {
      const mapObj = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
      mapObj.flyTo({ center: [Number(loc.lng), Number(loc.lat)], zoom: 16, duration: 1500 });
    } catch (err) {
      // ignore
    }
    setSelected(empId);
  };

  // Location history modal
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const historyItemsPerPage = 10;

  const [apiBranches, setApiBranches] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/branches`).then(r => r.json()).then(j => {
      if (j.success && j.branches) setApiBranches(j.branches);
    }).catch(() => {});
  }, []);


    useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && historyFor) {
        closeHistory();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [historyFor]);

  const openHistory = async (userId: string) => {
    setHistoryFor(userId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee-location-history?userId=${encodeURIComponent(userId)}&days=14`);
      const j = await res.json();
      if (j && j.success) {
        const sorted = (j.history || []).slice().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(sorted);
          setHistoryPage(1);
        setReplayIndex(0);
        setReplayPlaying(false);
      }
      else setHistory([]);
    } catch (e) { setHistory([]); }
    setHistoryLoading(false);
  };

  const closeHistory = () => { setHistoryFor(null); setHistory([]); };

  // Admin alerts (arrival/departure/breach)
  const [alerts, setAlerts] = useState<any[]>([]);
  const pushAlert = (a: any) => setAlerts((s) => [{ ...a }, ...s].slice(0, 20));
  const dismissAlert = (id: string) => setAlerts((s) => s.filter((x) => x.id !== id));

  // Replay state for history modal
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!replayPlaying) {
      if (replayTimerRef.current) { clearInterval(replayTimerRef.current); replayTimerRef.current = null; }
      return;
    }
    if (history.length === 0) return;
    const intervalMs = Math.max(250, Math.round(1000 / replaySpeed));
    replayTimerRef.current = window.setInterval(() => {
      setReplayIndex((idx) => {
        if (idx >= history.length - 1) {
          setReplayPlaying(false);
          return idx;
        }
        return idx + 1;
      });
    }, intervalMs) as unknown as number;
    return () => { if (replayTimerRef.current) { clearInterval(replayTimerRef.current); replayTimerRef.current = null; } };
  }, [replayPlaying, replaySpeed, history]);

  const statusDot = (last_iso?: string | null) => {
    if (!last_iso) return "🔴";
    const diff = Date.now() - new Date(last_iso).getTime();
    const mins = diff / 1000 / 60;
    if (mins <= 10) return "🟢";
    if (mins <= 240) return "🟡";
    return "🔴";
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div>
            {/* Left side empty for title space, since page title is in AppLayout usually, but we keep this div to push filters right */}
            <h2 className="text-xl font-bold md:hidden">Location Tracker</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Input placeholder="Search Employee..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-auto" />
                {query && (
                  <button 
                    onClick={() => setQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
            <Select onValueChange={(v) => setBranchFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void fetchData(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Map
            </Button>
          </div>
        </div>
        </div>

      <div className="flex flex-col gap-4">
        <div className="h-[520px] bg-card rounded-lg overflow-hidden">
          <Map reuseMaps id="gps-map"
            ref={mapRef}
            initialViewState={{
              longitude: 103.4194,
              latitude: 4.2248,
              zoom: 7
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={{
              version: 8,
              sources: {
                "osm": {
                  type: "raster",
                  tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"],
                  tileSize: 256,
                  attribution: "&copy; OpenStreetMap contributors"
                }
              },
              layers: [{ id: "osm-layer", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }]
            }}
          >
            <NavigationControl position="top-left" />

            {Object.values(
              filtered.reduce((acc, emp) => {
                const loc = locations[emp.user_id];
                if (!loc || loc.lat == null || loc.lng == null || isNaN(Number(loc.lat)) || isNaN(Number(loc.lng))) return acc;
                // Separate the selected user so they get their own marker tooltip
                const key = emp.user_id === selected ? `selected-${emp.user_id}` : `${Number(loc.lat).toFixed(5)},${Number(loc.lng).toFixed(5)}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(loc);
                return acc;
              }, {} as Record<string, EmpLocation[]>)
            ).map((group, idx) => {
              const first = group[0];
              if (!first) return null;
              const isSelected = group.some((l) => selected === l.user_id);
              const isOnline = first.lat && first.lng;
              const statusColor = isSelected ? 'bg-amber-500' : (isOnline ? 'bg-emerald-500' : 'bg-rose-500');
              
              return (
                <Marker 
                  key={`group-${idx}`}
                  longitude={Number(first.lng)} 
                  latitude={Number(first.lat)} 
                  anchor="bottom"
                  onClick={(e) => { 
                    e.originalEvent.stopPropagation(); 
                    if (group.length === 1) focusOn(first.user_id); 
                  }}
                  style={{ zIndex: isSelected ? 50 : 10 }}
                >
                  {group.length > 1 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex flex-col items-center justify-end w-full h-full group pb-1 cursor-pointer">
                          <div className={`bg-card rounded-full shadow-lg p-1 pr-3 flex items-center gap-2 border ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border'} transition-all hover:scale-105 z-10`}>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground relative">
                               +{group.length}
                               <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-card`}></div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold whitespace-nowrap text-foreground leading-none">
                                {group.length} Employees Here
                              </span>
                              <span className="text-[10px] text-foreground whitespace-nowrap mt-1 leading-none">
                                Click to view list
                              </span>
                            </div>
                          </div>
                          <div className={`w-0.5 h-6 ${isSelected ? 'bg-amber-500' : 'bg-emerald-500/50'} z-0 -mt-1`}></div>
                          <div className={`w-3 h-3 rounded-full ${statusColor} border-[2.5px] border-white shadow-sm shadow-black/20 z-10 -mt-1 relative`}></div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 z-[100] mb-2" side="top" sideOffset={10}>
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm border-b pb-1">Employees at this location</h4>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {group.map(emp => (
                              <div key={emp.user_id} className="flex flex-col cursor-pointer hover:bg-muted p-2 rounded border border-transparent hover:border-border transition-colors" onClick={() => focusOn(emp.user_id)}>
                                <span className="font-semibold text-sm">{emp.full_name || emp.user_id}</span>
                                <span className="text-xs text-foreground">{emp.last_updated ? new Date(emp.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    getMarkerHTML(first, isSelected)
                  )}
                </Marker>
              );
            })}
          </Map>
        </div>

          <div>
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black">Employee List</h3>
                <p className="text-xs text-foreground">Showing {filtered.length} employees</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search by name..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-48 h-8 text-xs"
                />
                {query && (
                  <button 
                    onClick={() => setQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground z-10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {branches.length > 1 && (
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">{b === "All" ? "All Branches" : b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Status</SelectItem>
                    <SelectItem value="Available" className="text-xs">Available</SelectItem>
                    <SelectItem value="Unavailable" className="text-xs">Unavailable</SelectItem>
                    <SelectItem value="Outstation" className="text-xs">Outstation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg [&>div]:max-h-[600px] [&>div]:overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const loc = locations[e.user_id];
                  return (
                    <TableRow key={e.user_id} className="hover:bg-muted/50">
                      <TableCell className="font-bold">{e.full_name || e.user_id}</TableCell>
                      <TableCell>{e.branch}</TableCell>
                      <TableCell>
                        {loc?.is_outstation ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 text-xs font-bold border border-pink-200 dark:border-pink-500/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            Outstation
                          </span>
                        ) : (
                          <>{statusDot(loc?.last_updated)} {loc?.lat && loc?.lng ? "Available" : "Offline"}</>
                        )}
                      </TableCell>
                      <TableCell>{loc?.last_updated ? new Date(loc.last_updated).toLocaleString() : "-"}</TableCell>
                      <TableCell>{loc?.distance != null ? `${Math.round(loc.distance)}m` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button onClick={() => focusOn(e.user_id)} variant={selected === e.user_id ? "secondary" : "ghost"}>
                            <MapPin className="w-4 h-4 mr-2" /> View
                          </Button>
                          <Button onClick={() => openHistory(e.user_id)} variant="outline">History</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    {historyFor && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeHistory(); }}>
          <div className="w-full max-w-5xl bg-card rounded-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase">Location History - {employees.find(e => e.user_id === historyFor)?.full_name || historyFor}</h3>
              <Button onClick={closeHistory} variant="ghost" size="sm">Close</Button>
            </div>
            <div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden [&>div]:flex-1 [&>div]:overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Coordinate (Latitude, Longitude)</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Distance from Branch</TableHead>
                    <TableHead>Location Status</TableHead>
                    <TableHead>Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading history...</TableCell></TableRow>
                  ) : history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No history found</TableCell></TableRow>
                  ) : (
                    (() => {
                      const totalHistoryPages = Math.ceil(history.length / historyItemsPerPage);
                      const startIndex = (historyPage - 1) * historyItemsPerPage;
                      const paginatedHistory = history.slice(startIndex, startIndex + historyItemsPerPage);
                      return paginatedHistory.map((h, i) => {
                      const emp = employees.find(e => e.user_id === historyFor);
                      const branchName = emp?.branch || "HQ";
                      const bObj = apiBranches.find(b => b.name === branchName || b.code === branchName);
                      let distance: number | null = null;
                      if (bObj && bObj.latitude && bObj.longitude) {
                        distance = getDistance(h.lat, h.lng, parseFloat(bObj.latitude), parseFloat(bObj.longitude));
                      }
                      const radius = bObj?.radius || bObj?.allowed_radius || 100;
                      const isOffSite = distance !== null && distance > radius;
                        const isNoGPS = Number(h.lat) === 0 && Number(h.lng) === 0;
                        
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(h.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>{isNoGPS ? "N/A" : `${Number(h.lat).toFixed(7)}, ${Number(h.lng).toFixed(7)}`}</TableCell>
                            <TableCell>{branchName}</TableCell>
                            <TableCell>{isNoGPS || distance === null ? "-" : `${Math.round(distance)} m`}</TableCell>
                            <TableCell>
                              {isNoGPS ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 text-[10px] font-black border border-slate-200 dark:border-slate-500/30 uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  No GPS
                                </span>
                              ) : isOffSite ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 text-[10px] font-black border border-orange-200 dark:border-orange-500/30 uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  Off-Site {h.is_update ? "- UPDATED" : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-500/30 uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  On-Site {h.is_update ? "- UPDATED" : ""}
                                </span>
                              )}
                          </TableCell>
                          <TableCell>
                            {h.attendance_status ? (() => {
                              const statusColors: Record<string, string> = {
                                'Clock In': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
                                'Clock Out': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
                                'Replacement Leave': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
                                'Outstation': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
                              };
                              const dotColors: Record<string, string> = {
                                'Clock In': 'bg-blue-500',
                                'Clock Out': 'bg-indigo-500',
                                'Replacement Leave': 'bg-amber-500',
                                'Outstation': 'bg-purple-500',
                              };
                              const cls = statusColors[h.attendance_status] || 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-500/30';
                              const dot = dotColors[h.attendance_status] || 'bg-teal-500';
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${cls}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                  {h.attendance_status}
                                </span>
                              );
                            })() : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
      </>
    );
}

