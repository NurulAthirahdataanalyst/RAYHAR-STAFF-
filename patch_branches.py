import sys
import re

def patch_branches():
    with open("c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/Branches.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add imports
    imports_to_add = """import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
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

    # 2. Add Edit Modal State and logic inside Branches component
    states_to_add = """  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
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
  };"""

    # find where to insert
    content = content.replace('const [searchQuery, setSearchQuery] = useState("");', 'const [searchQuery, setSearchQuery] = useState("");\n' + states_to_add)

    # 3. Add Edit Branch button near the title
    title_ui = """              <div className="flex items-center gap-3">
                <h1 className="text-responsive-xl font-black text-foreground tracking-tight truncate">
                  {selectedBranch.name}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] sm:text-xs bg-muted/30 border-border/60 px-3 py-1"
                >
                  {selectedBranch.code}
                </Badge>
              </div>"""
    
    new_title_ui = """              <div className="flex items-center gap-3">
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
              </div>"""
    content = content.replace(title_ui, new_title_ui)

    # 4. Add the modals UI at the end of the return statement (just before the last closing tag)
    # The last tags are usually </div></div> or something similar.
    modals_ui = """
      <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBranch} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">Branch Code (Readonly)</label>
                <Input value={editBranchData.code || ""} readOnly disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Branch Name</label>
                <Input 
                  value={editBranchData.name || ""} 
                  onChange={(e) => setEditBranchData({...editBranchData, name: e.target.value})} 
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Location</label>
              <Input 
                value={editBranchData.location || ""} 
                onChange={(e) => setEditBranchData({...editBranchData, location: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Operating Zone</label>
              <select
                value={editBranchData.operating_zone || "ZONE_B"}
                onChange={(e) => setEditBranchData({...editBranchData, operating_zone: e.target.value})}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ZONE_B">ZONE B (West Coast)</option>
                <option value="ZONE_A">ZONE A (East Coast)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">Coordinates</label>
                <div className="flex gap-2">
                  <Input 
                    value={editBranchData.latitude && editBranchData.longitude ? `${editBranchData.latitude}, ${editBranchData.longitude}` : ""} 
                    readOnly 
                    className="bg-muted"
                  />
                  <Button type="button" onClick={() => setIsMapModalOpen(true)} className="shrink-0 bg-[#7B0099] text-white">
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Radius (m): {editBranchData.radius}</label>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="10" 
                  value={editBranchData.radius || 50} 
                  onChange={(e) => setEditBranchData({...editBranchData, radius: e.target.value})}
                  className="w-full h-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditBranchModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#7B0099] text-white hover:bg-[#7B0099]/90">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] rounded-md overflow-hidden relative">
            <MapContainer 
              center={[4.2105, 101.9758]} 
              zoom={6} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker setLocation={(lat, lng) => {
                setEditBranchData({...editBranchData, latitude: lat.toString(), longitude: lng.toString()});
              }} />
              {editBranchData.latitude && editBranchData.longitude && (
                <Marker position={[parseFloat(editBranchData.latitude), parseFloat(editBranchData.longitude)]} />
              )}
            </MapContainer>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => setIsMapModalOpen(false)} className="bg-[#7B0099] text-white">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""

    content = content.replace('    </div>\n  );\n}', modals_ui)

    with open("c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/Branches.tsx", "w", encoding="utf-8") as f:
        f.write(content)

patch_branches()
