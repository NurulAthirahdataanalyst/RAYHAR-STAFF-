import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'<Dialog open=\{isMapModalOpen\}.*?</Dialog>', re.DOTALL)
match = pattern.search(content)

new_modal = """<Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                  <DialogContent className="max-w-4xl p-0 border-none shadow-2xl overflow-hidden rounded-[24px]">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle className="text-sm font-black uppercase tracking-wider">Update Branch Location</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
                      <div className="md:col-span-2 relative h-full">
                        <MapContainer 
                          center={branchLat && branchLng ? [parseFloat(branchLat), parseFloat(branchLng)] : [4.2248, 103.4194]} 
                          zoom={10} 
                          style={{ height: "100%", width: "100%", zIndex: 1 }}
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
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manual Coordinates</label>
                            <Input 
                              value={branchLat || ""} 
                              onChange={(e) => setBranchLat(e.target.value)}
                              placeholder="Latitude"
                              className="h-10 rounded-xl text-xs font-bold border-purple-400 focus-visible:ring-purple-400"
                            />
                            <Input 
                              value={branchLng || ""} 
                              onChange={(e) => setBranchLng(e.target.value)}
                              placeholder="Longitude"
                              className="h-10 rounded-xl text-xs font-bold"
                            />
                            <Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                              Apply Location
                            </Button>
                          </div>
                          
                          <div className="space-y-2 pt-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address / Display Name</label>
                            <div className="p-4 bg-white dark:bg-card border rounded-xl shadow-sm text-xs text-muted-foreground leading-relaxed">
                              Select a location on the map
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-auto flex gap-3 pt-6">
                          <Button type="button" variant="outline" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white">Cancel</Button>
                          <Button type="button" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">Save Branch Location</Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>"""

if match:
    content = content[:match.start()] + new_modal + content[match.end():]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced Map Dialog in Settings.tsx successfully")
else:
    print("Could not find Map Dialog via regex")
