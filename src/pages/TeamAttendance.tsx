import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Clock, AlertCircle, Building2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TeamAttendance() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees for this manager
        const empParams = new URLSearchParams({
          role: role || "",
          branch: userBranch || "",
          department: userDepartment || "",
        });
        const empRes = await fetch(`${API_BASE_URL}/api/employees?${empParams}`);
        const empData = await empRes.json();
        
        let teamEmployees = empData.success ? empData.employees : [];
        if (role === 'head_of_department') {
          teamEmployees = teamEmployees.filter((e: any) => e.department === userDepartment && e.branch === userBranch);
        }
        setEmployees(teamEmployees);

        // Fetch today's global attendance
        const attRes = await fetch(`${API_BASE_URL}/api/reports/daily-attendance`);
        const attData = await attRes.json();
        const globalAttendance = attData.success ? attData.data : [];

        // Map attendance to our team employees
        const teamIds = new Set(teamEmployees.map((e: any) => e.user_id));
        const filteredAttendance = globalAttendance.filter((a: any) => teamIds.has(a.user_id));
        setAttendanceData(filteredAttendance);

      } catch (error) {
        console.error("Error fetching team attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, userBranch, userDepartment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const totalTeam = employees.length;
  const presentIds = new Set(attendanceData.map(a => a.user_id));
  const presentCount = presentIds.size;
  const absentCount = totalTeam - presentCount;

  // Merge employee info with their attendance
  const mergedList = employees.map(emp => {
    const att = attendanceData.find(a => a.user_id === emp.user_id);
    return {
      ...emp,
      time_in: att?.time_in || "--:--",
      time_out: att?.time_out || "--:--",
      status: att ? "Present" : "Absent"
    };
  });

  const filteredList = mergedList.filter(e => 
    e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <PageHeader />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm font-medium border-primary/20 bg-primary/5">
              <Building2 className="w-4 h-4 mr-2 text-primary" />
              {role === 'hr_admin' ? 'All Branches' : userBranch || 'HQ'}
            </Badge>
            {role === 'head_of_department' && (
              <Badge variant="outline" className="text-sm font-medium border-primary/20 bg-primary/5">
                <Users className="w-4 h-4 mr-2 text-primary" />
                {userDepartment || 'All Departments'}
              </Badge>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                <h3 className="text-3xl font-bold mt-1">{totalTeam}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{presentCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Today's Attendance Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((emp) => (
                      <TableRow key={emp.user_id}>
                        <TableCell className="font-medium">{emp.user_id}</TableCell>
                        <TableCell>{emp.full_name}</TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell>{emp.time_in}</TableCell>
                        <TableCell>{emp.time_out}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === "Present" ? "default" : "destructive"} 
                                 className={emp.status === "Present" ? "bg-green-500 hover:bg-green-600" : ""}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
