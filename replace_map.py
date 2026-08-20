import os
import re

filepath = 'src/pages/GPSLocationTracker.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = re.sub(
    r'import \{ MapContainer, TileLayer, Circle, CircleMarker, Popup, Marker, Polyline \} from "react-leaflet";\s*import L from "leaflet";\s*import "leaflet/dist/leaflet.css";',
    "import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';\nimport 'maplibre-gl/dist/maplibre-gl.css';",
    code
)

# 2. Icon definition
custom_icon_regex = r'const createCustomIcon = \(loc: EmpLocation, isSelected: boolean\) => \{[\s\S]*?return L\.divIcon\(\{[\s\S]*?\}\);\n\};'
new_icon_func = """const getMarkerHTML = (loc: EmpLocation, isSelected: boolean) => {
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
};"""
code = re.sub(custom_icon_regex, new_icon_func, code)

# 3. flyTo
code = re.sub(
    r'mapRef\.current\.flyTo\(\[loc\.lat, loc\.lng\], 16, \{ duration: 1\.5 \}\);',
    'mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 16, duration: 1500 });',
    code
)

# 4. Main MapContainer
map1_regex = r'<MapContainer\s+whenCreated=\{\(map\) => \(mapRef\.current = map\)\}\s+center=\{\[4\.2248, 103\.4194\]\}\s+zoom=\{7\}\s+style=\{\{ height: "100%", width: "100%" \}\}\s*>\s*<TileLayer url="https://\{s\}\.tile\.openstreetmap\.org/\{z\}/\{x\}/\{y\}\.png" />([\s\S]*?)</MapContainer>'

def replace_map1(m):
    inner = m.group(1)
    
    # Replace the markers mapping
    inner = re.sub(
        r'<Marker\s+position=\{\[l\.lat as number, l\.lng as number\]\}\s+icon=\{createCustomIcon\(l, selected === l\.user_id\)\}\s+eventHandlers=\{\{ click: \(\) => focusOn\(l\.user_id\) \}\}\s+/>',
        r"""<Marker 
                  longitude={l.lng as number} 
                  latitude={l.lat as number} 
                  anchor="bottom"
                  onClick={(e) => { e.originalEvent.stopPropagation(); focusOn(l.user_id); }}
                >
                  {getMarkerHTML(l, selected === l.user_id)}
                </Marker>""",
        inner
    )
    
    # Remove accuracy circle
    inner = re.sub(r'\{/\* accuracy circle[\s\S]*?\}', '', inner)
    
    return f"""<Map
            ref={{mapRef}}
            initialViewState={{{{
              longitude: 103.4194,
              latitude: 4.2248,
              zoom: 7
            }}}}
            style={{{{ width: "100%", height: "100%" }}}}
            mapStyle={{{{
              version: 8,
              sources: {{{{
                osm: {{{{
                  type: 'raster',
                  tiles: ['https://a.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png'],
                  tileSize: 256,
                  attribution: '&copy; OpenStreetMap Contributors'
                }}}}
              }}}},
              layers: [
                {{
                  id: 'osm',
                  type: 'raster',
                  source: 'osm',
                  minzoom: 0,
                  maxzoom: 22
                }}
              ]
            }}}}
          >
            <NavigationControl position="top-left" />{inner}</Map>"""

code = re.sub(map1_regex, replace_map1, code)


# 5. History MapContainer
map2_regex = r'<MapContainer center=\{\[history\[0\]\.lat, history\[0\]\.lng\]\} zoom=\{13\} style=\{\{ height: \'100%\', width: \'100%\' \}\}>\s*<TileLayer url="https://\{s\}\.tile\.openstreetmap\.org/\{z\}/\{x\}/\{y\}\.png" />\s*<Polyline positions=\{history\.map\(h => \[h\.lat, h\.lng\]\)\} pathOptions=\{\{ color: \'#7c3aed\' \}\} />\s*\{history\[replayIndex\] && \(\s*<Marker position=\{\[history\[replayIndex\]\.lat, history\[replayIndex\]\.lng\]\} />\s*\)\}\s*</MapContainer>'

new_map2 = """<Map
                  initialViewState={{
                    longitude: history[0].lng,
                    latitude: history[0].lat,
                    zoom: 13
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle={{
                    version: 8,
                    sources: {
                      osm: {
                        type: 'raster',
                        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                      },
                      route: {
                        type: 'geojson',
                        data: {
                          type: 'Feature',
                          properties: {},
                          geometry: {
                            type: 'LineString',
                            coordinates: history.map(h => [h.lng, h.lat])
                          }
                        }
                      }
                    },
                    layers: [
                      {
                        id: 'osm',
                        type: 'raster',
                        source: 'osm'
                      },
                      {
                        id: 'route',
                        type: 'line',
                        source: 'route',
                        layout: {
                          'line-join': 'round',
                          'line-cap': 'round'
                        },
                        paint: {
                          'line-color': '#7c3aed',
                          'line-width': 4
                        }
                      }
                    ]
                  }}
                >
                  <NavigationControl position="top-left" />
                  {history[replayIndex] && (
                    <Marker longitude={history[replayIndex].lng} latitude={history[replayIndex].lat} color="red" />
                  )}
                </Map>"""

code = re.sub(map2_regex, new_map2, code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement done!")
