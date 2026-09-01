import codecs
import re

with codecs.open('src/pages/hr-analytics/WorkforceInsights.tsx', 'r', 'utf-8') as f:
    content = f.read()

replacement = '''Reason: {
                                (() => {
                                  if (!item.reason) return "-";
                                  const match = item.reason.match(/\[CUTI_GANTI_DATA:([\s\S]*?)\]/);
                                  if (match && match[1]) {
                                    try {
                                      const data = JSON.parse(match[1]);
                                      if (Array.isArray(data) && data.length > 0) {
                                        let text = item.reason.replace(match[0], "").trim();
                                        const details = data.map(d => d.keterangan || "-").filter(Boolean).join(", ");
                                        return "Replacement Leave (" + details + ")" + (text ? " - " + text : "");
                                      }
                                    } catch (e) {}
                                  }
                                  return item.reason;
                                })()
                              }'''

# Find the block and replace it
pattern = r'Reason:\s*\{\s*\(\(\)\s*=>\s*\{.*?\n\s*\}\)\(\)\s*\}'
content = re.sub(pattern, lambda m: replacement, content, flags=re.DOTALL)

with codecs.open('src/pages/hr-analytics/WorkforceInsights.tsx', 'w', 'utf-8') as f:
    f.write(content)
print("Fixed Reason!")
