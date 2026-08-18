import re

def update_file(file_path, var_name, setter_name):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Ensure Search is imported from lucide-react
    if "Search" not in content.split('from "lucide-react"')[0]:
        content = re.sub(r'import \{([^}]+)\} from "lucide-react";', r'import {\1, Search } from "lucide-react";', content)

    old_input = f"""<Input 
                  value={{{var_name}.location || ""}} 
                  onChange={{(e) => {setter_name}({{...{var_name}, location: e.target.value}})}} 
                  className="h-11 rounded-xl text-xs font-bold uppercase"
                />"""
                
    new_input = f"""<div className="flex gap-2">
                  <Input 
                    value={{{var_name}.location || ""}} 
                    onChange={{(e) => {setter_name}({{...{var_name}, location: e.target.value}})}} 
                    className="h-11 rounded-xl text-xs font-bold uppercase flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    title="Find Coordinates"
                    className="h-11 px-4 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={{() => {{
                      if (!{var_name}.location) return;
                      toast.loading("Searching location...");
                      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${{encodeURIComponent({var_name}.location)}}&limit=1`)
                        .then(r => r.json())
                        .then(data => {{
                          toast.dismiss();
                          if (data && data.length > 0) {{
                            {setter_name}(prev => ({{
                              ...prev,
                              latitude: data[0].lat,
                              longitude: data[0].lon
                            }}));
                            toast.success("Coordinates found!");
                          }} else {{
                            toast.error("Location not found");
                          }}
                        }})
                        .catch(() => {{
                          toast.dismiss();
                          toast.error("Search failed");
                        }});
                    }}}}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>"""
                
    content = content.replace(old_input, new_input)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

update_file("c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Branches.tsx", "editBranchData", "setEditBranchData")
update_file("c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Settings.tsx", "newBranchData", "setNewBranchData")
print("Updated both files")
