import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the Edit Branch button to be an icon on the card, or next to HQ badge, like in mockup
# In Screenshot 2, the user has an HQ badge and a trash icon on the card.
# I will just ensure the Edit Branch modal is triggered properly. Let's make the modal look like Screenshot 3.

old_modal = """      <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">Operating Zone</label>
                <select 
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm"
                  value={editBranchData.operating_zone || "ZONE_B"}
                  onChange={(e) => setEditBranchData({...editBranchData, operating_zone: e.target.value})}
                >
                  <option value="ZONE_A">ZONE A (Fri/Sat Weekend)</option>
                  <option value="ZONE_B">ZONE B (Sat/Sun Weekend)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Coordinates</label>
                <div className="flex gap-2">
                  <Input 
                    value={editBranchData.latitude && editBranchData.longitude ? `${editBranchData.latitude}, ${editBranchData.longitude}` : ""} 
                    readOnly 
                    placeholder="Lat, Lng"
                  />
                  <Button type="button" onClick={() => setIsMapModalOpen(true)} className="bg-[#7B0099] text-white">Map</Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Radius (m)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">{editBranchData.radius || 50}m</span>
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
      </Dialog>"""

new_modal = """      <Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
        <DialogContent className="max-w-2xl p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-[#a855f7] p-6 text-white flex justify-between items-start">
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
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">BRANCH CODE</label>
                <Input value={editBranchData.code || ""} readOnly disabled className="h-11 rounded-xl bg-muted/50 text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">BRANCH NAME</label>
                <Input 
                  value={editBranchData.name || ""} 
                  onChange={(e) => setEditBranchData({...editBranchData, name: e.target.value})} 
                  required
                  className="h-11 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">BRANCH LOCATION / DISTRICT</label>
              <Input 
                value={editBranchData.location || ""} 
                onChange={(e) => setEditBranchData({...editBranchData, location: e.target.value})} 
                className="h-11 rounded-xl text-xs font-bold uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">OPERATING ZONE</label>
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
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">COORDINATES</label>
                <div className="flex items-center gap-2 h-11 px-4 border border-input rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                  <MapPin className="w-4 h-4 text-[#7B0099]" />
                  <span className="text-xs font-bold text-muted-foreground">
                    {editBranchData.latitude && editBranchData.longitude 
                      ? `${editBranchData.latitude}, ${editBranchData.longitude}` 
                      : "Select from map"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">RADIUS (m): {editBranchData.radius || 50}</label>
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
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditBranchModalOpen(false)} className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-wider">Discard</Button>
              <Button type="submit" className="h-11 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 text-[10px] font-black uppercase tracking-wider shadow-md">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>"""

if old_modal in content:
    content = content.replace(old_modal, new_modal)
else:
    print("Could not find old_modal!")

old_map_modal = """      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
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
      </Dialog>"""

new_map_modal = """      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-4xl p-0 border-none shadow-2xl overflow-hidden rounded-[24px]">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-sm font-black uppercase tracking-wider">Update Branch Location</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
            <div className="md:col-span-2 relative h-full">
              <MapContainer 
                center={editBranchData.latitude && editBranchData.longitude ? [parseFloat(editBranchData.latitude), parseFloat(editBranchData.longitude)] : [4.2248, 103.4194]} 
                zoom={10} 
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
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manual Coordinates</label>
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
                  <Button type="button" variant="outline" className="w-full h-10 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                    Apply Location
                  </Button>
                </div>
                
                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address / Display Name</label>
                  <div className="p-4 bg-white dark:bg-card border rounded-xl shadow-sm text-xs text-muted-foreground leading-relaxed">
                    {editBranchData.location || "Select a location on the map"}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto flex gap-3 pt-6">
                <Button type="button" variant="outline" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider">Cancel</Button>
                <Button type="button" onClick={() => setIsMapModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/90 text-[10px] font-black uppercase tracking-wider shadow-md">Save Branch Location</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>"""

if old_map_modal in content:
    content = content.replace(old_map_modal, new_map_modal)
else:
    print("Could not find old_map_modal!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Branches.tsx modals to match mockups!")
