import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_button = """
              {activeSession && (
                <div className="flex justify-center w-full mt-4">
                  <Button
                    type="button"
                    onClick={handleUpdateLocation}
                    disabled={outstationLocationLoading}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-full h-10 px-6 font-black text-[11px] uppercase tracking-widest border-b-[4px] border-purple-800 active:border-b-0 active:translate-y-[4px] transition-all"
                  >
                    {outstationLocationLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                    Update My Location
                  </Button>
                </div>
              )}
"""

shift_box_end = """                  ) : attendanceStatus && !attendanceStatus.clockInAllowed ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                      <span className="text-purple-600 dark:text-purple-400">Company Leave Active</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Ready to clock in</span>
                  )}
                </div>"""

if new_button not in content:
    content = content.replace(shift_box_end, shift_box_end + "\n" + new_button)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
