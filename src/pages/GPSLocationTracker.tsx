import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "../config/api";
import { RefreshCw, MapPin } from "lucide-react";

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
    return () => clearInterval(iv);
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

  const statusDot = (last_iso?: string | null) => {
    if (!last_iso) return "🔴";
    const diff = Date.now() - new Date(last_iso).getTime();
    const mins = diff / 1000 / 60;
    if (mins <= 10) return "🟢";
    if (mins <= 240) return "🟡";
    return "🔴";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">GPS Location Tracker</h2>
          <p className="text-sm text-muted-foreground">Live staff GPS locations (based on today's clock-in).</p>
        </div>

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[520px] bg-card rounded-lg overflow-hidden">
          <MapContainer
            whenCreated={(map) => (mapRef.current = map)}
            center={[4.2248, 103.4194]}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {Object.values(locations)
              .filter((l) => l.lat != null && l.lng != null)
              .map((l) => (
                <React.Fragment key={l.user_id}>
                  <CircleMarker
                    center={[l.lat as number, l.lng as number]}
                    radius={8}
                    pathOptions={{ color: selected === l.user_id ? "#f59e0b" : "#7c3aed" }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <div className="font-bold">{l.full_name}</div>
                        <div className="text-sm">{l.branch}</div>
                        <div className="text-sm">{l.locationName}</div>
                        <div className="text-xs text-muted-foreground">Updated: {l.last_updated ? new Date(l.last_updated).toLocaleString() : "-"}</div>
                      </div>
                    </Popup>
                  </CircleMarker>

                  {/* accuracy circle in metres */}
                  {l.accuracy != null && (
                    <Circle
                      center={[l.lat as number, l.lng as number]}
                      radius={Math.max(1, l.accuracy as number)}
                      pathOptions={{ color: "#60a5fa", opacity: 0.25, fillOpacity: 0.08 }}
                    />
                  )}
                </React.Fragment>
              ))}
          </MapContainer>
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
                        <Button onClick={() => focusOn(e.user_id)} variant={selected === e.user_id ? "secondary" : "ghost"}>
                          <MapPin className="w-4 h-4 mr-2" /> View
                        </Button>
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
  );
}
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, MapPin, Building2, CircleDot, Clock3, Crosshair, Filter, Eye } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const employeeLocations = [
  {
    id: "ahmad",
    name: "Ahmad Abdullah",
    branch: "KL",
    status: "available",
    lastUpdated: "5:12 PM",
    accuracy: "±8m",
    accuracyMeters: 8,
    location: "Kuala Lumpur, Malaysia",
    lat: 3.1390,
    lng: 101.6869,
  },
  {
    id: "nurul",
    name: "Nurul Aisyah",
    branch: "HQ",
    status: "available",
    lastUpdated: "5:10 PM",
    accuracy: "±12m",
    accuracyMeters: 12,
    location: "Kuala Lumpur, Malaysia",
    lat: 3.1467,
    lng: 101.6950,
  },
  {
    id: "siti",
    name: "Siti Aminah",
    branch: "Melaka",
    status: "old",
    lastUpdated: "3:45 PM",
    accuracy: "±25m",
    accuracyMeters: 25,
    location: "Melaka, Malaysia",
    lat: 2.1896,
    lng: 102.2501,
  },
  {
    id: "ali",
    name: "Ali Rahman",
    branch: "Kota Bharu",
    status: "offline",
    lastUpdated: "Yesterday",
    accuracy: "—",
    accuracyMeters: 0,
    location: "Kota Bharu, Malaysia",
    lat: 6.1237,
    lng: 102.2434,
  },
];

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, 11, { animate: true, duration: 1.2 });
    }
  }, [center, map]);

  return null;
}

export default function GPSLocationTracker() {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("ahmad");
  const [refreshTick, setRefreshTick] = useState(0);

  const branchOptions = ["All", ...Array.from(new Set(employeeLocations.map((item) => item.branch)))];

  const filteredEmployees = useMemo(() => {
    return employeeLocations.filter((employee) => {
      const matchesSearch = employee.name.toLowerCase().includes(search.toLowerCase());
      const matchesBranch = branchFilter === "All" || employee.branch === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [branchFilter, search]);

  useEffect(() => {
    if (filteredEmployees.length === 0) return;
    const hasSelected = filteredEmployees.some((item) => item.id === selectedId);
    if (!hasSelected) {
      setSelectedId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedId]);

  const selectedEmployee =
    filteredEmployees.find((employee) => employee.id === selectedId) ||
    employeeLocations.find((employee) => employee.id === selectedId) ||
    employeeLocations[0];

  const statusStyles: Record<string, { label: string; className: string; dot: string }> = {
    available: { label: "Available", className: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
    old: { label: "Old", className: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    offline: { label: "Offline", className: "bg-red-100 text-red-700 border border-red-200", dot: "bg-red-500" },
  };

  const selectedStatus = statusStyles[selectedEmployee.status] || statusStyles.available;

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">GPS Location Tracker</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">My Staff Live Locations</h2>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search employee"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Employee..."
                className="h-10 rounded-md border border-border bg-background pl-9 text-sm"
              />
            </div>

            <div className="relative min-w-[150px]">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-border bg-background px-9 text-sm font-medium text-foreground outline-none ring-0"
              >
                {branchOptions.map((branch) => (
                  <option value={branch} key={branch}>
                    {branch === "All" ? "Branch" : branch}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setRefreshTick((value) => value + 1)}
              className="h-10 gap-2 rounded-md border border-border bg-background text-sm font-semibold"
            >
              <RefreshCw className={`h-4 w-4 ${refreshTick > 0 ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">Map</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                {filteredEmployees.length} employees
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[440px] w-full">
              <MapContainer center={[selectedEmployee.lat, selectedEmployee.lng]} zoom={10} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFocus center={[selectedEmployee.lat, selectedEmployee.lng]} />

                {filteredEmployees.map((employee) => (
                  <div key={employee.id}>
                    <Circle
                      center={[employee.lat, employee.lng]}
                      radius={employee.accuracyMeters > 0 ? employee.accuracyMeters * 10 : 25}
                      pathOptions={{
                        color: employee.status === "available" ? "#22c55e" : employee.status === "old" ? "#f59e0b" : "#ef4444",
                        fillColor: employee.status === "available" ? "#22c55e" : employee.status === "old" ? "#f59e0b" : "#ef4444",
                        fillOpacity: 0.12,
                        weight: 1.5,
                      }}
                    />
                    <Marker position={[employee.lat, employee.lng]} />
                  </div>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="space-y-5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <CircleDot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">{selectedEmployee.name}</p>
                  <p className="text-xs text-muted-foreground">Current Location</p>
                </div>
              </div>
              <Badge className={selectedStatus.className}>
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${selectedStatus.dot}`} />
                {selectedStatus.label}
              </Badge>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Employee</span>
                <span className="font-bold text-foreground">{selectedEmployee.name}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Status</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {selectedStatus.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-bold text-foreground">{selectedEmployee.lastUpdated}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GPS Accuracy</span>
                <span className="font-bold text-foreground">{selectedEmployee.accuracy}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="max-w-[160px] text-right font-bold text-foreground">{selectedEmployee.location}</span>
              </div>
            </div>

            <Button className="w-full bg-[#7B0099] hover:bg-[#62007d] text-white font-bold">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
            <Crosshair className="h-4 w-4 text-primary" />
            Employee Location Table
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className={employee.id === selectedEmployee.id ? "bg-violet-50/60" : ""}>
                    <TableCell className="font-semibold text-foreground">{employee.name}</TableCell>
                    <TableCell>{employee.branch}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${statusStyles[employee.status].className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyles[employee.status].dot}`} />
                        {statusStyles[employee.status].label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{employee.lastUpdated}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{employee.accuracy}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-border bg-background px-3 text-xs font-bold"
                        onClick={() => setSelectedId(employee.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
