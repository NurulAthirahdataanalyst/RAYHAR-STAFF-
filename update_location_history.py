import re

def insert_button_regex(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    button_html = """                <button 
                  onClick={() => {
                    const el = document.getElementById('location-history-scroll');
                    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="absolute bottom-16 right-6 z-50 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
                  title="Scroll to Top"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </button>
"""
    
    if "GPSLocationTracker.tsx" in file_path:
        content = content.replace(
            '<div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden">\n              <div className="flex-1 overflow-auto">',
            '<div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden relative">\n              <div className="flex-1 overflow-auto" id="location-history-scroll">'
        )
        content = re.sub(
            r"(</Table>\s+</div>\s+)({\/\* Footer: showing count \+ Load More \*\/})", 
            r"\1" + button_html + r"\2",
            content
        )
    elif "TeamAttendance.tsx" in file_path:
        content = content.replace(
            '<div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden [&>div]:flex-1 [&>div]:overflow-auto">',
            '<div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden relative"><div className="flex-1 overflow-auto" id="team-location-history-scroll">'
        )
        button_html_team = button_html.replace('location-history-scroll', 'team-location-history-scroll')
        content = re.sub(
            r"(</Table>\s+</div>\s+)({\/\* Footer: showing count \+ Load More \*\/})",
            r"\1" + button_html_team + r"\2",
            content
        )
        # Also need to add the closing div for the extra div we wrapped the table in
        content = re.sub(
            r"(</Table>\s+</div>\s+)({\/\* Footer: showing count \+ Load More \*\/})",
            r"\1</div>\n              \2",
            content
        )
    elif "StaffProfileDialog.tsx" in file_path:
        button_html_staff = """                        <button 
                          onClick={() => {
                            const el = document.getElementById('staff-location-scroll');
                            if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="absolute bottom-4 right-4 z-50 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
                          title="Scroll to Top"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        </button>
                        </div>"""
        
        content = content.replace(
            '<div className="overflow-x-auto max-h-[400px] overflow-y-auto">',
            '<div className="relative"><div className="overflow-x-auto max-h-[400px] overflow-y-auto" id="staff-location-scroll">'
        )
        content = content.replace(
            '                          </table>\n                        </div>\n                      )}',
            '                          </table>\n                        </div>\n' + button_html_staff + '\n                      )}'
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

insert_button_regex("src/pages/GPSLocationTracker.tsx")
insert_button_regex("src/pages/TeamAttendance.tsx")
insert_button_regex("src/components/shared/StaffProfileDialog.tsx")
