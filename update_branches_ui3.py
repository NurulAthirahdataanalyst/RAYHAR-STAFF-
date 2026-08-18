import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'<Dialog open=\{isEditBranchModalOpen\}.*?</Dialog>', re.DOTALL)
match = pattern.search(content)

new_modal = """<Dialog open={isEditBranchModalOpen} onOpenChange={setIsEditBranchModalOpen}>
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

if match:
    content = content[:match.start()] + new_modal + content[match.end():]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced Dialog successfully")
else:
    print("Could not find Dialog via regex")
