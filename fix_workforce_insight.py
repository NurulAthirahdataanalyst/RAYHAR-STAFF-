import re

path = "src/pages/hr-analytics/WorkforceInsights.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the h2 tags
content = re.sub(r'\s*<h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Primary</h2>', '', content)
content = re.sub(r'\s*<h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Workforce Analytics</h2>', '', content)
content = re.sub(r'\s*<h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Notices</h2>', '', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
