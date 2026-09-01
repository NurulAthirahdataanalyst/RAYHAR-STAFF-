import re

file_path = "src/pages/TeamAttendance.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

button_html = """              </div>
              <button 
                onClick={() => {
                  const el = document.getElementById('team-location-history-scroll');
                  if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="absolute bottom-6 right-6 z-50 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
                title="Scroll to Top"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </button>
"""

content = content.replace(
    '</Table>\n            </div>\n          </div>',
    '</Table>\n' + button_html + '            </div>\n          </div>'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed JSX in TeamAttendance.tsx")
