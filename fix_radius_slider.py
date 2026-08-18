import re

# ===========================
# BRANCHES.TSX - Radius slider
# ===========================
branches_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx"
with open(branches_path, "r", encoding="utf-8") as f:
    content = f.read()

old_radius_branches = """            <div className="space-y-1.5">
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
            </div>"""

new_radius_branches = """            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Radius</label>
                <span className="text-[10px] font-black text-muted-foreground">0m – 500m</span>
              </div>
              <div className="relative pt-6">
                {/* Floating animated label */}
                <div
                  className="absolute -top-1 flex flex-col items-center pointer-events-none transition-all duration-150"
                  style={{ left: `calc(${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}% - ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100) * 0.28}px)` }}
                >
                  <div className="bg-[#7B0099] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                    {editBranchData.radius || 50}m
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#7B0099]" />
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={editBranchData.radius || 50}
                  onChange={(e) => setEditBranchData({...editBranchData, radius: e.target.value})}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #7B0099 0%, #7B0099 ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb ${(((parseFloat(String(editBranchData.radius || 50)) - 0) / 500) * 100)}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground font-bold">0m</span>
                  <span className="text-[9px] text-muted-foreground font-bold">500m</span>
                </div>
              </div>
            </div>"""

content = content.replace(old_radius_branches, new_radius_branches)
with open(branches_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Branches.tsx")

# ===========================
# SETTINGS.TSX - Radius slider
# ===========================
settings_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx"
with open(settings_path, "r", encoding="utf-8") as f:
    content = f.read()

old_radius_settings = """                  <div className="space-y-1.5">
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
                  </div>"""

new_radius_settings = """                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Radius</label>
                      <span className="text-[9px] font-black text-muted-foreground">0m – 500m</span>
                    </div>
                    <div className="relative pt-6">
                      {/* Floating animated label */}
                      <div
                        className="absolute -top-1 flex flex-col items-center pointer-events-none transition-all duration-150"
                        style={{ left: `calc(${(((parseFloat(branchRadius || "50") - 0) / 500) * 100)}% - ${(((parseFloat(branchRadius || "50") - 0) / 500) * 100) * 0.28}px)` }}
                      >
                        <div className="bg-[#7B0099] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                          {branchRadius || 50}m
                        </div>
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#7B0099]" />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="5"
                        value={branchRadius}
                        onChange={(e) => setBranchRadius(e.target.value)}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #7B0099 0%, #7B0099 ${(((parseFloat(branchRadius || "50") - 0) / 500) * 100)}%, #e5e7eb ${(((parseFloat(branchRadius || "50") - 0) / 500) * 100)}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground font-bold">0m</span>
                        <span className="text-[9px] text-muted-foreground font-bold">500m</span>
                      </div>
                    </div>
                  </div>"""

content = content.replace(old_radius_settings, new_radius_settings)
with open(settings_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Settings.tsx")
