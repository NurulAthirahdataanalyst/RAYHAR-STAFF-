import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add useMap to imports and MapController component
content = re.sub(
    r'import \{ MapContainer, TileLayer, Marker, useMapEvents \} from "react-leaflet";',
    'import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";',
    content
)

map_controller = """function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}"""
content = re.sub(
    r'function LocationPicker',
    f'{map_controller}\n\nfunction LocationPicker',
    content
)

# 2. Add mapCenter state and Apply Location logic
# Find MapContainer in Branches.tsx
map_container = """<MapContainer 
                  center={editBranchData.latitude && editBranchData.longitude ? [parseFloat(editBranchData.latitude), parseFloat(editBranchData.longitude)] : [4.2248, 103.4194]} 
                  zoom={16} 
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapController center={editBranchData.latitude && editBranchData.longitude ? [parseFloat(editBranchData.latitude), parseFloat(editBranchData.longitude)] : [4.2248, 103.4194]} />
                  <LocationPicker setLocation={(lat, lng) => {"""

content = re.sub(
    r'<MapContainer \n                  center=\{editBranchData\.latitude && editBranchData\.longitude \? \[parseFloat\(editBranchData\.latitude\), parseFloat\(editBranchData\.longitude\)\] : \[4\.2248, 103\.4194\]\} \n                  zoom=\{16\} \n                  style=\{\{ height: "100%", width: "100%" \}\}\n                >\n                  <TileLayer url="https://\{s\}\.tile\.openstreetmap\.org/\{z\}/\{x\}/\{y\}\.png" />\n                  <LocationPicker setLocation=\{\(lat, lng\) => \{',
    map_container,
    content
)

# 3. Add onClick to Apply Location button
old_button = """<Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                      Apply Location
                    </Button>"""
new_button = """<Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200" onClick={() => {
                      if (editBranchData.latitude && editBranchData.longitude) {
                        const lat = parseFloat(editBranchData.latitude);
                        const lng = parseFloat(editBranchData.longitude);
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                          .then(res => res.json())
                          .then(data => {
                            if(data && data.display_name) {
                              setEditBranchData(prev => ({...prev, location: data.display_name}));
                            }
                          }).catch(console.error);
                      }
                    }}>
                      Apply Location
                    </Button>"""

content = content.replace(old_button, new_button)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Branches.tsx")
