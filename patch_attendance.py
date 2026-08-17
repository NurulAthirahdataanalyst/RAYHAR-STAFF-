import re

with open("src/pages/Attendance.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Dialog imports
if "from \"@/components/ui/dialog\"" not in content:
    content = content.replace('import { useToast } from "@/hooks/use-toast";', 'import { useToast } from "@/hooks/use-toast";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";')

# 2. Add state variables for Outstation dialog and branches
state_injection = """
  // Outstation & Geolocation States
  const [branches, setBranches] = useState<any[]>([]);
  const [outstationPromptOpen, setOutstationPromptOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number, acc: number} | null>(null);
  const [outstationLocationLoading, setOutstationLocationLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/branches`)
      .then(res => res.json())
      .then(data => {
        if(data.success && data.branches) setBranches(data.branches);
      }).catch(console.error);
  }, []);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
"""

if "const [outstationPromptOpen, setOutstationPromptOpen] = useState(false);" not in content:
    content = content.replace('const [allowedLocations, setAllowedLocations] = useState<string[]>([]);', state_injection + '\n  const [allowedLocations, setAllowedLocations] = useState<string[]>([]);')

# 3. Replace handleAttendanceAction
old_handle_action = """  // 5. THE CORE ACTION: Clock In / Clock Out
  const handleAttendanceAction = async () => {
    const employeeId = user?.user_id || user?.id;

    if (!employeeId) {
      toast({
        title: "Auth Error",
        description: "User ID is missing. Please log out and back in.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const isClockOut = !!activeSession;
      const endpoint = isClockOut ? "/api/clock-out" : "/api/attendance";
      
      let attendance_type = "Normal";
      if (attendanceMode === 'temporary') attendance_type = "Temporary Assignment";
      else if (attendanceMode === 'multi') attendance_type = "Multi-Location";

      const payload: any = { user_id: String(employeeId).trim() };
      if (!isClockOut) {
        payload.location = selectedLocation;
        payload.attendance_type = attendance_type;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const eventTime = formatAttendanceTime(
          isClockOut ? result.record?.clock_out : result.record?.clock_in
        );
        const dashboardUpdate = {
          userId: String(employeeId).trim(),
          name: user?.full_name || "User",
          todayStatus: isClockOut ? (result.isOnOutstation ? "Clocked Out (Outstation)" : "Clocked Out") : (result.isOnOutstation ? "Clocked In (Outstation)" : "Present"),
          activityStatus: isClockOut ? "Clocked Out" : (result.isOnOutstation ? "Clocked In (Outstation)" : "Clocked In"),
          time: eventTime,
          timestamp: Date.now(),
        };

        sessionStorage.setItem("latestAttendanceUpdate", JSON.stringify(dashboardUpdate));
        sessionStorage.setItem("dashboardRefresh", Date.now().toString());

        window.dispatchEvent(
          new CustomEvent("attendanceUpdated", { detail: dashboardUpdate })
        );

        toast({
          title: isClockOut ? "Successfully Clocked Out" : "Successfully Clocked In",
          description: isClockOut
            ? `Goodbye! Session ended at ${new Date().toLocaleTimeString()}`
            : `Welcome! Session started at ${new Date().toLocaleTimeString()}`,
        });

        await fetchStatus(employeeId);
        await fetchHistoryLogs(employeeId, selectedMonth, selectedYear);
      } else {
        throw new Error(result.error || result.message || "Action failed");
      }
    } catch (err: any) {
      console.error("Attendance Error Detail:", err);
      toast({
        title: err.message.includes("Company Leave") ? "Clock-In Restricted" : "Database Error",
        description: err.message || "Constraint violation. Check if your ID exists in the system.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };"""

new_handle_action = """  // 5. THE CORE ACTION: Clock In / Clock Out
  const performClockInOrOut = async (employeeId: string, attendance_type: string, lat?: number, lng?: number, acc?: number) => {
    setLoading(true);
    try {
      const isClockOut = !!activeSession;
      const endpoint = isClockOut ? "/api/clock-out" : "/api/attendance";

      const payload: any = { user_id: String(employeeId).trim() };
      if (!isClockOut) {
        payload.location = selectedLocation;
        payload.attendance_type = attendance_type;
        if (lat !== undefined) payload.latitude = lat;
        if (lng !== undefined) payload.longitude = lng;
        if (acc !== undefined) payload.accuracy = acc;
      } else {
        if (lat !== undefined) payload.latitude = lat;
        if (lng !== undefined) payload.longitude = lng;
        if (acc !== undefined) payload.accuracy = acc;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const eventTime = formatAttendanceTime(
          isClockOut ? result.record?.clock_out : result.record?.clock_in
        );
        const dashboardUpdate = {
          userId: String(employeeId).trim(),
          name: user?.full_name || "User",
          todayStatus: isClockOut ? (result.isOnOutstation ? "Clocked Out (Outstation)" : "Clocked Out") : (result.isOnOutstation ? "Clocked In (Outstation)" : "Present"),
          activityStatus: isClockOut ? "Clocked Out" : (result.isOnOutstation ? "Clocked In (Outstation)" : "Clocked In"),
          time: eventTime,
          timestamp: Date.now(),
        };

        sessionStorage.setItem("latestAttendanceUpdate", JSON.stringify(dashboardUpdate));
        sessionStorage.setItem("dashboardRefresh", Date.now().toString());
        window.dispatchEvent(new CustomEvent("attendanceUpdated", { detail: dashboardUpdate }));

        toast({
          title: isClockOut ? "Successfully Clocked Out" : "Successfully Clocked In",
          description: isClockOut
            ? `Goodbye! Session ended at ${new Date().toLocaleTimeString()}`
            : `Welcome! Session started at ${new Date().toLocaleTimeString()}`,
        });

        await fetchStatus(employeeId);
        await fetchHistoryLogs(employeeId, selectedMonth, selectedYear);
      } else {
        throw new Error(result.error || result.message || "Action failed");
      }
    } catch (err: any) {
      console.error("Attendance Error Detail:", err);
      toast({
        title: err.message.includes("Company Leave") ? "Clock-In Restricted" : "Database Error",
        description: err.message || "Constraint violation. Check if your ID exists in the system.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceAction = async () => {
    const employeeId = user?.user_id || user?.id;
    if (!employeeId) {
      toast({ title: "Auth Error", description: "User ID is missing. Please log out and back in.", variant: "destructive" });
      return;
    }

    if (!navigator.geolocation) {
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;

        const isClockOut = !!activeSession;
        if (isClockOut) {
          // Send lat, lng, acc on clock-out
          performClockInOrOut(employeeId, "Normal", lat, lng, acc);
          return;
        }

        // It is Clock In
        let attendance_type = "BRANCH";
        if (attendanceMode === 'temporary') attendance_type = "Temporary Assignment";
        else if (attendanceMode === 'multi') attendance_type = "Multi-Location";

        // Find branch coords
        const branchCode = user?.branch || 'HQ';
        const branchInfo = branches.find((b: any) => b.code === branchCode || b.name === branchCode);

        if (branchInfo && branchInfo.latitude && branchInfo.longitude) {
          const radius = branchInfo.radius || 50;
          const dist = haversineDistance(lat, lng, parseFloat(branchInfo.latitude), parseFloat(branchInfo.longitude));
          
          if (dist > radius) {
             setPendingLocation({lat, lng, acc});
             setOutstationPromptOpen(true);
             setLoading(false);
             return;
          }
        }
        
        // Either distance <= radius or no branch info found (fallback to normal clockin)
        performClockInOrOut(employeeId, attendance_type, lat, lng, acc);
      },
      (error) => {
        setLoading(false);
        toast({ title: "Location Error", description: "Unable to retrieve your location.", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const confirmOutstationMode = () => {
    if (!pendingLocation) return;
    const {lat, lng, acc} = pendingLocation;
    const employeeId = user?.user_id || user?.id;
    
    if (acc <= 30) {
      setOutstationPromptOpen(false);
      performClockInOrOut(employeeId, "OUTSTATION", lat, lng, acc);
    } else if (acc <= 50) {
      toast({ title: "Low Accuracy", description: "Location accuracy is currently low. Please move to an open area and try again", variant: "default" });
      // Keep prompt open or let user retry
    } else {
      toast({ title: "Location Error", description: "Accuracy too low (>50m) to clock in. Please try again outside.", variant: "destructive" });
    }
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return;
    setOutstationLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        const employeeId = user?.user_id || user?.id;

        try {
          const response = await fetch(`${API_BASE_URL}/api/outstation/log-location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employee_id: employeeId,
              attendance_id: activeSession?.id || activeSession?.attendance_id,
              latitude: lat,
              longitude: lng,
              accuracy: acc
            })
          });
          const result = await response.json();
          if (result.success) {
            toast({ title: "Location Updated", description: "Your outstation location has been logged." });
          } else {
            throw new Error(result.error);
          }
        } catch (e: any) {
          toast({ title: "Update Failed", description: e.message || "Failed to log location", variant: "destructive" });
        } finally {
          setOutstationLocationLoading(false);
        }
      },
      (err) => {
        setOutstationLocationLoading(false);
        toast({ title: "Location Error", description: "Unable to get location", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };
"""

content = content.replace(old_handle_action, new_handle_action)

# 4. Inject Outstation Modal & "Update My Location" button
dialog_jsx = """
      <Dialog open={outstationPromptOpen} onOpenChange={setOutstationPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Outstation Check-in</DialogTitle>
            <DialogDescription>
              You're outside your assigned branch. Would you like to check in using Outstation Mode?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutstationPromptOpen(false)}>Cancel</Button>
            <Button onClick={confirmOutstationMode}>Outstation Mode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""

if "<Dialog open={outstationPromptOpen}" not in content:
    content = content.replace('<div className="flex flex-col h-full bg-slate-50/50 dark:bg-background/95">', '<div className="flex flex-col h-full bg-slate-50/50 dark:bg-background/95">' + dialog_jsx)

update_location_btn = """
                        {activeSession && (activeSession.attendance_type === "OUTSTATION" || activeSession.is_outstation) && (
                          <Button 
                            variant="secondary" 
                            className="w-full mt-2" 
                            onClick={handleUpdateLocation}
                            disabled={outstationLocationLoading}
                          >
                            {outstationLocationLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                            Update My Location
                          </Button>
                        )}
"""
content = re.sub(r'(<Button\s+onClick=\{handleAttendanceAction\}[^>]*>\s*\{loading \? <Loader2.*?Clock Out.*?<\/Button>)', r'\1' + update_location_btn, content, flags=re.DOTALL)


with open("src/pages/Attendance.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to Attendance.tsx")
