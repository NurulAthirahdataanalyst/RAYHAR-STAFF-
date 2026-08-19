import React, { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "../config/api";
import { RefreshCw, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
};

const getMarkerHTML = (loc: EmpLocation, isSelected: boolean) => {
  const isOnline = loc.lat && loc.lng;
  const statusColor = isSelected ? 'bg-amber-500' : (isOnline ? 'bg-emerald-500' : 'bg-rose-500');
  const avatarText = (loc.full_name || loc.user_id).substring(0, 2).toUpperCase();
  const timeText = loc.last_updated ? new Date(loc.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown';
  
  return (
    <div className="flex flex-col items-center justify-end w-full h-full group pb-1 cursor-pointer">
      <div className={`bg-card rounded-full shadow-lg p-1 pr-3 flex items-center gap-2 border ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border'} transition-all hover:scale-105 z-10`}>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground relative">
           {avatarText}
           <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-card`}></div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold whitespace-nowrap text-foreground leading-none">{loc.full_name || loc.user_id}</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1 leading-none">Updated {timeText}</span>
        </div>
      </div>
      <div className={`w-0.5 h-6 ${isSelected ? 'bg-amber-500' : 'bg-emerald-500/50'} z-0 -mt-1`}></div>
      <div className={`w-3 h-3 rounded-full ${statusColor} border-[2.5px] border-white shadow-sm shadow-black/20 z-10 -mt-1 relative`}>
      </div>
    </div>
  );
};

export default function GPSLocationTracker() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Record<string, EmpLocation>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("All");
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
                };
                list.push({ user_id: userId, full_name: r.full_name || r.fullName || "", branch: r.branch || "" });
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

  const fetchData = async () => {
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
            };
            list.push({ user_id: userId, full_name: r.full_name || r.fullName || "", branch: r.branch || "" });
          }
        });
      }
      setEmployees(list);
      setLocations(locMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const branches = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(e.branch || "Unknown"));
    return ["All", ...Array.from(set).sort()];
  }, [employees]);

  const filtered = useMemo(() => {
    return employees
      .filter((e) => (branchFilter === "All" ? true : (e.branch || "") === branchFilter))
      .filter((e) => (query ? (e.full_name || "").toLowerCase().includes(query.toLowerCase()) : true));
  }, [employees, branchFilter, query]);

  const focusOn = (empId: string) => {
    const loc = locations[empId];
    if (!loc || loc.lat == null || loc.lng == null || !mapRef.current) return;
    try {
      mapRef.current.setView([loc.lat, loc.lng], 16, { animate: true });
    } catch (err) {
      // ignore
    }
    setSelected(empId);
  };

  // Location history modal
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (userId: string) => {
    setHistoryFor(userId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employee-location-history?userId=${encodeURIComponent(userId)}&days=14`);
      const j = await res.json();
      if (j && j.success) {
        const sorted = (j.history || []).slice().sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setHistory(sorted);
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
          <Input placeholder="Search Employee..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Button onClick={() => void fetchData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        {/* Alerts panel */}
        <div className="fixed top-20 right-6 z-50 w-80">
          {alerts.map((a) => (
            <div key={a.id} className="mb-2 rounded-lg bg-white/95 dark:bg-slate-900 p-2 shadow border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold">{a.type}</div>
                  <div className="text-[11px] text-muted-foreground">User: {a.userId}</div>
                  {a.arrived != null && <div className="text-[11px]">Arrived: {String(a.arrived)}</div>}
                </div>
                <div>
                  <button className="text-xs text-muted-foreground" onClick={() => dismissAlert(a.id)}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-[520px] bg-card rounded-lg overflow-hidden">
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: 103.4194,
              latitude: 4.2248,
              zoom: 7
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          >
            <NavigationControl position="top-left" />

            {Object.values(
              Object.values(locations)
                .filter((l) => l.lat != null && l.lng != null)
                .reduce((acc, loc) => {
                  const latNum = Number(loc.lat);
                  const lngNum = Number(loc.lng);
                  const key = `${latNum.toFixed(4)},${lngNum.toFixed(4)}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(loc);
                  return acc;
                }, {} as Record<string, EmpLocation[]>)
            ).map((group, idx) => {
              const first = group[0];
              const isSelected = group.some((l) => selected === l.user_id);
              const isOnline = first.lat && first.lng;
              const statusColor = isSelected ? 'bg-amber-500' : (isOnline ? 'bg-emerald-500' : 'bg-rose-500');
              
              return (
                <Marker 
                  key={`group-${idx}`}
                  longitude={first.lng as number} 
                  latitude={first.lat as number} 
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
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground relative">
                               +{group.length}
                               <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-card`}></div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold whitespace-nowrap text-foreground leading-none">
                                {group.length} Employees Here
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1 leading-none">
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
                                <span className="text-xs text-muted-foreground">{emp.last_updated ? new Date(emp.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
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
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black">Employee List</h3>
              <p className="text-xs text-muted-foreground">Showing {filtered.length} employees</p>
            </div>
          </div>

          <div className="overflow-auto max-h-[480px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const loc = locations[e.user_id];
                  return (
                    <TableRow key={e.user_id}>
                      <TableCell>{e.full_name || e.user_id}</TableCell>
                      <TableCell>{e.branch}</TableCell>
                      <TableCell>{statusDot(loc?.last_updated)} {loc?.lat && loc?.lng ? "Available" : "Offline"}</TableCell>
                      <TableCell>{loc?.last_updated ? new Date(loc.last_updated).toLocaleString() : "-"}</TableCell>
                      <TableCell>{loc?.accuracy ? `±${loc.accuracy}m` : "—"}</TableCell>
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
    </div>
    {historyFor && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-4xl bg-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Location History - {historyFor}</h3>
            <div className="flex items-center gap-2">
              <Button onClick={closeHistory} variant="ghost">Close</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="col-span-2 h-96 rounded overflow-hidden border border-border">
              {historyLoading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : history.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No history found</div>
              ) : (
                <Map
                  initialViewState={{
                    longitude: history[0].lng,
                    latitude: history[0].lat,
                    zoom: 13
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
                >
                  <NavigationControl position="top-left" />
                  <Source id="route" type="geojson" data={{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: history.map(h => [h.lng, h.lat])
                    }
                  }}>
                    <Layer 
                      id="route-line"
                      type="line"
                      layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                      paint={{ 'line-color': '#7c3aed', 'line-width': 4 }}
                    />
                  </Source>
                  {history[replayIndex] && (
                    <Marker longitude={history[replayIndex].lng} latitude={history[replayIndex].lat} color="red" />
                  )}
                </Map>
              )}
            </div>

            <div className="col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <Button onClick={() => { setReplayIndex(0); setReplayPlaying(true); }} disabled={history.length === 0}>Play</Button>
                <Button onClick={() => setReplayPlaying(!replayPlaying)} disabled={history.length === 0}>{replayPlaying ? 'Pause' : 'Resume'}</Button>
                <Button onClick={() => { setReplayPlaying(false); setReplayIndex(0); }} variant="outline">Reset</Button>
                <select value={String(replaySpeed)} onChange={(e) => setReplaySpeed(Number(e.target.value))} className="ml-2">
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="4">4x</option>
                </select>
              </div>

              <div className="text-sm">
                <div>Point {Math.min(history.length, Math.max(0, replayIndex + 1))} / {history.length}</div>
                <div className="text-xs text-muted-foreground mt-2">Current: {history[replayIndex] ? new Date(history[replayIndex].timestamp).toLocaleString() : '-'}</div>
                <div className="text-xs text-muted-foreground">Coordinates: {history[replayIndex] ? `${history[replayIndex].lat}, ${history[replayIndex].lng}` : '-'}</div>
                <div className="text-xs text-muted-foreground">Accuracy: {history[replayIndex]?.accuracy ?? '—'}</div>
              </div>

              <div className="max-h-64 overflow-auto border border-border rounded p-2">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-1">Time</th>
                      <th className="p-1">Coords</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className={`border-t ${i === replayIndex ? 'bg-violet-50' : ''}`}>
                        <td className="p-1">{new Date(h.timestamp).toLocaleString()}</td>
                        <td className="p-1">{h.lat}, {h.lng}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
