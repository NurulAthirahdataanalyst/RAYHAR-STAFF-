import re

with open("src/pages/outstation/MyOutstation.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("      </div>\n\n      {/* Main Content Card */}", "      {/* Main Content Card */}")

with open("src/pages/outstation/MyOutstation.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
