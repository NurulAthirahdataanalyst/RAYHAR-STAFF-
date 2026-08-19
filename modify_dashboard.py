import re

with open("src/pages/outstation/OutstationDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. KPI Grid layout
# grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6
content = content.replace("grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-6", "grid-cols-2 md:grid-cols-3 lg:grid-cols-6")

# 2. Date format function
# function formatShortDate(dStr: string) {
#   if (!dStr) return "-";
#   return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
# }
new_date_func = r'''function formatShortDate(dStr: string) {
  if (!dStr) return "-";
  return new Date(dStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}'''
content = re.sub(r'function formatShortDate.*?\}', new_date_func, content, flags=re.DOTALL)

# 3. Include `project` in grouped items
content = content.replace("destination: string; department: string;", "destination: string; department: string; project: string;")
content = content.replace("destination: a.destination,", "destination: a.destination,\n          project: a.project || '',")

# 4. Total days logic
# const totalDays = Math.max(1, Math.ceil((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)));
content = content.replace(
    'const totalDays = Math.max(1, Math.ceil((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)));',
    'const totalDays = Math.round((new Date(g.end_date).getTime() - new Date(g.start_date).getTime()) / (1000 * 3600 * 24)) + 1;'
)

# 5. Table header: Destination -> Event Name
content = content.replace('<th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Destination</th>', '<th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">Event Name</th>')

# 6. Table cell: destination -> project \n destination
# Old:
#                                 <div>
#                                   <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{g.destination}</p>
#                                   <p className="text-[10px] text-gray-500 dark:text-gray-400">{g.department || "Domestic Branch"}</p>
#                                 </div>
cell_pattern = r'<div>\s*<p className="text-\[12px\] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">\{g\.destination\}</p>\s*<p className="text-\[10px\] text-gray-500 dark:text-gray-400">\{g\.department \|\| "Domestic Branch"\}</p>\s*</div>'
new_cell = r'''<div>
                                  <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{g.project || g.destination}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 whitespace-nowrap"><MapPin className="w-3 h-3 text-gray-400" /> {g.destination}</p>
                                </div>'''
content = re.sub(cell_pattern, new_cell, content)

with open("src/pages/outstation/OutstationDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard Updated")
