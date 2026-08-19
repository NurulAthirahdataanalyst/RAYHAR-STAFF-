import re

with open("src/pages/outstation/OutstationAssignment.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '<Label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1 block">Project</Label>',
    '<Label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1 block">Event Name</Label>'
)

content = content.replace(
    'placeholder="Project name"',
    'placeholder="Event name"'
)

with open("src/pages/outstation/OutstationAssignment.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Assignment updated")
