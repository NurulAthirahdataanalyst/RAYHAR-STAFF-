import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, Building2, Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DepartmentReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
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
      const res = await fetch(`${API_BASE_URL}/api/employees?${params}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Error fetching department report:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group by department
  const deptMap: Record<string, { branch: string, headcount: number, active: number }> = {};
  employees.forEach(e => {
    const key = `${e.department || 'Unassigned'} - ${e.branch || 'HQ'}`;
    if (!deptMap[key]) {
      deptMap[key] = { branch: e.branch || 'HQ', headcount: 0, active: 0 };
    }
    deptMap[key].headcount += 1;
    if (e.status !== 'Inactive') {
      deptMap[key].active += 1;
    }
  });

  const deptArray = Object.entries(deptMap).map(([dept, stats]) => ({
    department: dept.split(' - ')[0],
    branch: stats.branch,
    headcount: stats.headcount,
    active: stats.active
  }));

  const filteredList = deptArray.filter(e => 
    e.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["Department,Branch,Total Headcount,Active Employees"];
    const rows = filteredList.map(a => 
      `"${a.department}","${a.branch}",${a.headcount},${a.active}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `department_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Departments</p>
                <h3 className="text-3xl font-bold mt-1">{new Set(deptArray.map(d => d.department)).size}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {employees.length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Department Statistics</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search department or branch..."
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
                      <TableHead>Department</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Total Headcount</TableHead>
                      <TableHead>Active Employees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No department records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{req.department}</TableCell>
                          <TableCell>{req.branch}</TableCell>
                          <TableCell>{req.headcount}</TableCell>
                          <TableCell>{req.active}</TableCell>
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
