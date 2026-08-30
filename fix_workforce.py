import codecs

with codecs.open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Add getCleanReason import
import_str = 'import { format, subDays, addDays, startOfWeek, endOfWeek } from "date-fns";'
if 'getCleanReason' not in content:
    content = content.replace(import_str, 'import { getCleanReason } from "@/lib/leaveStorage";\n' + import_str)

# 2. Fix scopeLabel reference error
# Let's see where scopeLabel is used:
# {scopeLabel && <span ...>{scopeLabel}</span>}
# It's likely undefined because it was removed or never declared.
# I'll declare it: const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");
# Wait, let's find a good place to declare it. Inside unction WorkforceInsights() { ...
content = content.replace('const cardHoverEffect = cardHoverEffects.purple;', 'const cardHoverEffect = cardHoverEffects.purple;\n  const scopeLabel = role === "head_of_department" || role === "hod" ? userDepartment : (role === "branch_leader" ? userBranch : "");')

# 3. Use getCleanReason for Pending Approvals reason
reasonOld = '''                              Reason: {
                                (() => {
                                  if (!item.reason) return "-";
                                  if (item.reason.startsWith("[CUTI_GANTI_DATA:") && item.reason.endsWith("]")) {
                                    try {
                                      const jsonStr = item.reason.substring(17, item.reason.length - 1);
                                      const data = JSON.parse(jsonStr);
                                      if (Array.isArray(data) && data.length > 0) {
                                        return "Replacement Leave (" + data.map(d => d.keterangan || "-").join(", ") + ")";
                                      }
                                    } catch (e) {}
                                  }
                                  return item.reason;
                                })()
                              }'''
reasonNew = '''                              Reason: { getCleanReason(item.reason) || "-" }'''
content = content.replace(reasonOld, reasonNew)
content = content.replace(reasonOld.replace('\n', '\r\n'), reasonNew)

with codecs.open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated WorkforceInsights.tsx")
