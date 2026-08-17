import sys

def patch_settings():
    with open("c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/Settings.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add imports
    imports_to_add = """import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

function LocationPicker({ setLocation }: { setLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
"""
    content = content.replace('import { API_BASE_URL } from "../config/api";', 'import { API_BASE_URL } from "../config/api";\n' + imports_to_add)

    # 2. Add states
    states_to_add = """  const [branchLat, setBranchLat] = useState("");
  const [branchLng, setBranchLng] = useState("");
  const [branchRadius, setBranchRadius] = useState("50");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);"""
    content = content.replace('const [branchZoneInput, setBranchZoneInput] = useState("ZONE_B");', 'const [branchZoneInput, setBranchZoneInput] = useState("ZONE_B");\n' + states_to_add)

    # 3. Handle Add Branch payload
    old_payload = """          operating_zone: branchZoneInput,
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
        })"""
    new_payload = """          operating_zone: branchZoneInput,
          latitude: parseFloat(branchLat) || null,
          longitude: parseFloat(branchLng) || null,
          radius: parseFloat(branchRadius) || 50,
          operatorName: user?.full_name || user?.name || "Athirah Rahman",
          operatorRole: role || "hr_admin"
        })"""
    content = content.replace(old_payload, new_payload)

    # 4. Handle Add Branch reset
    old_reset = """        setBranchZoneInput("ZONE_B");"""
    new_reset = """        setBranchZoneInput("ZONE_B");
        setBranchLat("");
        setBranchLng("");
        setBranchRadius("50");"""
    content = content.replace(old_reset, new_reset)

    # 5. Handle Cancel Reset
    old_cancel_reset = """                      setBranchZoneInput("ZONE_B");
                    }}"""
    new_cancel_reset = """                      setBranchZoneInput("ZONE_B");
                      setBranchLat("");
                      setBranchLng("");
                      setBranchRadius("50");
                    }}"""
    content = content.replace(old_cancel_reset, new_cancel_reset)

    # 6. Add UI for Coordinates and Radius, and the Dialog
    form_zone = """                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-foreground/70 uppercase tracking-widest ml-1">
                    Operating Zone
                  </label>
                  <select
                    value={branchZoneInput}
                    onChange={(e) => setBranchZoneInput(e.target.value)}
                    className="w-full h-11 px-4 bg-background/30 border border-border/80 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/10 rounded-xl text-xs font-bold uppercase outline-none"
                  >
                    <option value="ZONE_B">ZONE B (West Coast - Sat/Sun Off)</option>
                    <option value="ZONE_A">ZONE A (East Coast - Fri/Sat Off)</option>
                  </select>
                </div>"""
    
    new_ui = form_zone + """

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Coordinates</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="Lat, Lng"
                        value={branchLat && branchLng ? `${branchLat}, ${branchLng}` : ""}
                        className="w-full h-11 px-4 bg-background/30 border border-border/80 rounded-xl text-xs font-bold outline-none cursor-not-allowed text-muted-foreground"
                      />
                      <Button type="button" onClick={() => setIsMapModalOpen(true)} className="h-11 bg-[#7B0099] text-white hover:bg-[#7B0099]/90 rounded-xl px-4 shrink-0 text-xs font-bold">
                        <MapPin className="w-4 h-4 mr-2" /> Select
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Radius (m): {branchRadius}</label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={branchRadius}
                      onChange={(e) => setBranchRadius(e.target.value)}
                      className="w-full h-11"
                    />
                  </div>
                </div>

                <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Select Branch Location</DialogTitle>
                    </DialogHeader>
                    <div className="h-[400px] rounded-md overflow-hidden relative">
                      <MapContainer 
                        center={[4.2105, 101.9758]} 
                        zoom={6} 
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationPicker setLocation={(lat, lng) => {
                          setBranchLat(lat.toString());
                          setBranchLng(lng.toString());
                        }} />
                        {branchLat && branchLng && (
                          <Marker position={[parseFloat(branchLat), parseFloat(branchLng)]} />
                        )}
                      </MapContainer>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="button" onClick={() => setIsMapModalOpen(false)} className="bg-[#7B0099] text-white hover:bg-[#7B0099]/90">Done</Button>
                    </div>
                  </DialogContent>
                </Dialog>
"""
    content = content.replace(form_zone, new_ui)

    with open("c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/Settings.tsx", "w", encoding="utf-8") as f:
        f.write(content)

patch_settings()
