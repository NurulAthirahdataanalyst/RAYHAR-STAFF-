import os

file_path = "src/pages/Dashboard.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_stmt = "import { TablePagination } from \"@/components/common/TablePagination\";"
if import_stmt not in content:
    content = content.replace(
        "import { LeaveDetailsModal } from \"@/components/leave/LeaveDetailsModal\";",
        "import { LeaveDetailsModal } from \"@/components/leave/LeaveDetailsModal\";\n" + import_stmt
    )

# Add state variables
state_vars = """
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
"""
if "const [activityPage," not in content:
    content = content.replace(
        "const [activeTab, setActiveTab] = useState<\"my\" | \"team\" | \"system\" | \"all\">(\"my\");",
        "const [activeTab, setActiveTab] = useState<\"my\" | \"team\" | \"system\" | \"all\">(\"my\");" + state_vars
    )

# Add tab reset logic if they switch tabs
# When setting active tab, reset page to 1
content = content.replace(
    "onClick={() => setActiveTab(tab.key)}",
    "onClick={() => { setActiveTab(tab.key); setActivityPage(1); }}"
)
content = content.replace(
    "onClick={() => setActivityFilter(chip.key)}",
    "onClick={() => { setActivityFilter(chip.key); setActivityPage(1); }}"
)

# Replace the Last 10 Events string
content = content.replace(
    "Last 10 Events",
    "Recent Activities"
)

# Apply pagination to feedItems slice and render TablePagination
old_render = """                    {feedItems.map((item, i) => {"""
new_render = """                    {feedItems.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize).map((item, i) => {"""

content = content.replace(old_render, new_render)

old_end_render = """                  </div>
                );
              })()}

              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button
                  onClick={() => navigate("/attendance")}
                  className="text-[11px] font-bold text-[#a01497] hover:underline"
                >
                  Load More History
                </button>
              </div>"""

new_end_render = """                  </div>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-card">
                    <TablePagination
                      currentPage={activityPage}
                      totalItems={feedItems.length}
                      pageSize={activityPageSize}
                      onPageChange={setActivityPage}
                      onPageSizeChange={(size) => {
                        setActivityPageSize(size);
                        setActivityPage(1);
                      }}
                    />
                  </div>
                );
              })()}"""

content = content.replace(old_end_render, new_end_render)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Dashboard.tsx")
