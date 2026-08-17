import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add "Update Location" button if the user is clocked in as OUTSTATION
# We will place it right below the main clock button in the CardContent.
search_str = """                  </button>
                </div>"""

insert_str = """                  </button>
                  
                  {activeSession && (activeSession.attendance_type === 'OUTSTATION' || activeSession.status === 'OUTSTATION' || true) && (
                    <div className="absolute -bottom-16 w-full flex justify-center">
                      <Button
                        type="button"
                        onClick={handleUpdateLocation}
                        disabled={outstationLocationLoading}
                        className="bg-[#7B0099] text-white hover:bg-[#7B0099]/90 rounded-full shadow-lg h-10 px-6 font-bold"
                      >
                        {outstationLocationLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                        Update My Location
                      </Button>
                    </div>
                  )}

                </div>"""

# Let's see if we can find the exact place to inject. The button wrapper is <div className="relative flex justify-center py-6 sm:py-8 md:py-10">
# Let's just find `<button\n                    onClick={handleAttendanceAction}` and go from there.

# I will just write a regex to inject below the <button> ... </button>
pattern = re.compile(r'(<button[^>]*onClick=\{handleAttendanceAction\}[^>]*>.*?</button>)', re.DOTALL)
match = pattern.search(content)

if match:
    button_html = match.group(1)
    
    new_html = button_html + """
                  {activeSession && (activeSession.attendance_type === 'OUTSTATION' || activeSession.status === 'OUTSTATION' || attendanceStatus?.status === 'OUTSTATION' || (activeSession.location && activeSession.location !== 'HQ')) && (
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
                  )}
    """
    content = content.replace(button_html, new_html)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched Update Location button")
else:
    print("Could not find button")
