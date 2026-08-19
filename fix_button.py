import re

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old absolute button
old_button = """                    {activeSession && (
                      <div className="absolute -bottom-12 w-full flex justify-center">
                        <Button
                          type="button"
                          onClick={handleUpdateLocation}
                          disabled={outstationLocationLoading}
                          className="bg-purple-600 text-white hover:bg-purple-700 rounded-full shadow-lg h-9 px-5 font-bold text-[11px] uppercase tracking-wider"
                        >
                          {outstationLocationLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                          Update My Location
                        </Button>
                      </div>
                    )}"""

if old_button in content:
    content = content.replace(old_button, "")

# 2. Add the new button right after the Shift In Progress box!
# We will also remove the "bg-muted/30 border" from the Shift In Progress box to make it cleaner, as the user said "remove box" and might just want the text. Wait, if I stack them, I don't need to remove the box, but the user explicitly asked to "remove box behind the Update button". If they are stacked, there is no box behind the update button.
# Let's also style the button to be 3D.
new_button = """              {activeSession && (
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
              )}"""

# Find the end of the shift in progress box.
shift_box_end = """                  ) : attendanceStatus && !attendanceStatus.clockInAllowed ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                      <span className="text-purple-600 dark:text-purple-400">Company Leave Active</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Ready to clock in</span>
                  )}
                </div>"""

if shift_box_end in content:
    content = content.replace(shift_box_end, shift_box_end + "\n" + new_button)

# To remove the grey pill box entirely (as requested: "remove box behind the Update button", they might mean the background of the shift in progress container), I will strip its background classes!
old_shift_container = """<div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 bg-muted/30 dark:bg-muted/50 py-1.5 px-4 rounded-md w-full border border-border/50">"""
new_shift_container = """<div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 w-full">"""
content = content.replace(old_shift_container, new_shift_container)

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
