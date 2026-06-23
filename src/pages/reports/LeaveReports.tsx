import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, FileText, CalendarDays } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formatDate = (value: string) => (value ? value.slice(0, 10) : "");

export default function LeaveReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [role, userBranch, userDepartment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
        department: userDepartment || "",
      });
      const res = await fetch(`${API_BASE_URL}/api/leave-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setLeaveData(data.leaveRequests);
      }
    } catch (error) {
      console.error("Error fetching leave report:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = leaveData.filter(e => 
    (e.full_name || e.user_id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["Employee,Branch,Leave Type,Start Date,End Date,Days,Status"];
    const rows = filteredList.map(a => 
      `"${a.full_name || a.user_id}","${a.branch || 'HQ'}","${a.leave_type}","${formatDate(a.start_date)}","${formatDate(a.end_date)}",${a.days},"${a.status}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leave_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <PageHeader />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <h3 className="text-3xl font-bold mt-1">{leaveData.length}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {leaveData.filter(a => a.status === 'Approved').length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leave Days</p>
                <h3 className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                  {leaveData.filter(a => a.status === 'Approved').reduce((acc, curr) => acc + Number(curr.days || 0), 0)}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Leave Utilisation Log</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or branch..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No leave records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {req.full_name || req.user_id}
                          </TableCell>
                          <TableCell>{req.branch || "HQ"}</TableCell>
                          <TableCell>{req.leave_type}</TableCell>
                          <TableCell>{formatDate(req.start_date)}</TableCell>
                          <TableCell>{formatDate(req.end_date)}</TableCell>
                          <TableCell>{req.days}</TableCell>
                          <TableCell>{req.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
