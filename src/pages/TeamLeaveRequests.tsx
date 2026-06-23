import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CalendarClock, CalendarX2, Building2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

export default function TeamLeaveRequests() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          role: role || "",
          branch: userBranch || "",
          department: userDepartment || "",
        });

        const response = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
        const data = await response.json();

        if (data.success) {
          // If HOD, extra safe filter to ensure only same branch & department
          let filtered = data.leaveRequests;
          if (role === 'head_of_department') {
             filtered = filtered.filter((r: any) => r.department === userDepartment && r.branch === userBranch);
          }
          setLeaveRequests(filtered);
        }
      } catch (error) {
        console.error("Error fetching team leave requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [role, userBranch, userDepartment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const pendingCount = leaveRequests.filter(r => r.status?.startsWith("Pending")).length;
  const approvedCount = leaveRequests.filter(r => r.status === "Approved").length;
  const rejectedCount = leaveRequests.filter(r => r.status === "Rejected").length;

  const filteredList = leaveRequests.filter(r => 
    (r.full_name || r.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <CalendarClock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <h3 className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{pendingCount}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CalendarClock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Leaves</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{approvedCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <CalendarX2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected Leaves</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{rejectedCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Team Leave Requests Log</CardTitle>
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No team leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((req) => (
                      <TableRow key={req.leave_id}>
                        <TableCell className="font-medium">
                          <div>{req.full_name || req.user_id}</div>
                          <div className="text-xs text-muted-foreground">{req.user_id}</div>
                        </TableCell>
                        <TableCell>{req.leave_type}</TableCell>
                        <TableCell>{formatDate(req.start_date)}</TableCell>
                        <TableCell>{formatDate(req.end_date)}</TableCell>
                        <TableCell>{req.days}</TableCell>
                        <TableCell>
                          <Badge variant={
                            req.status === "Approved" ? "default" : 
                            req.status === "Rejected" ? "destructive" : 
                            "outline"
                          } 
                          className={req.status === "Approved" ? "bg-green-500 hover:bg-green-600" : ""}>
                            {req.status}
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
