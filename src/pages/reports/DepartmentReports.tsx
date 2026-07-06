import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Search, Building2, Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

export default function DepartmentReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchDeptQuery, setSearchDeptQuery] = useState("");
  const [searchBranchQuery, setSearchBranchQuery] = useState("");

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

  const hqList = deptArray
    .filter(e => e.branch === 'HQ')
    .filter(e => e.department.toLowerCase().includes(searchDeptQuery.toLowerCase()));
    
  const branchList = deptArray
    .filter(e => e.branch !== 'HQ')
    .filter(e => e.branch.toLowerCase().includes(searchBranchQuery.toLowerCase()));

  const handleExportCSV = () => {
    const headers = ["Department,Branch,Total Headcount,Active Employees"];
    const rows = deptArray.map(a => 
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

  const handleExportDeptCSV = () => {
    const headers = ["Department,Total Headcount,Active Employees"];
    const rows = hqList.map(a => 
      `"${a.department}",${a.headcount},${a.active}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hq_department_statistics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBranchCSV = () => {
    const headers = ["Branch,Total Headcount,Active Employees"];
    const rows = branchList.map(a => 
      `"${a.branch}",${a.headcount},${a.active}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `branch_statistics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-2">
            <ExportDropdown onExportCSV={handleExportCSV} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Department</p>
              </div>
              <h3 className="text-2xl font-bold">{new Set(deptArray.filter(d => d.branch === 'HQ').map(d => d.department)).size}</h3>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Branch</p>
              </div>
              <h3 className="text-2xl font-bold">{new Set(deptArray.filter(d => d.branch !== 'HQ').map(d => d.branch)).size}</h3>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Employees <br/>(Dept & Branch)</p>
              </div>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                {employees.length}
              </h3>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Employees <br/>(Department)</p>
              </div>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {deptArray.filter(d => d.branch === 'HQ').reduce((sum, item) => sum + item.headcount, 0)}
              </h3>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Employees <br/>(All Branch)</p>
              </div>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {deptArray.filter(d => d.branch !== 'HQ').reduce((sum, item) => sum + item.headcount, 0)}
              </h3>
            </CardContent>
          </Card>
        </div>

        <h1 className="text-2xl font-bold mb-6">Department & Branch Report</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg">Department Statistics (HQ)</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search department..."
                    className="pl-8 h-9"
                    value={searchDeptQuery}
                    onChange={(e) => setSearchDeptQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 px-3 flex items-center gap-2" onClick={handleExportDeptCSV}>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
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
                        <TableHead>Total Headcount</TableHead>
                        <TableHead>Active Employees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hqList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No departments found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        hqList.map((req, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-xs font-bold text-slate-800 uppercase">{req.department}</TableCell>
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

          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg">Branch Statistics</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search branch..."
                    className="pl-8 h-9"
                    value={searchBranchQuery}
                    onChange={(e) => setSearchBranchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 px-3 flex items-center gap-2" onClick={handleExportBranchCSV}>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
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
                        <TableHead>Branch</TableHead>
                        <TableHead>Total Headcount</TableHead>
                        <TableHead>Active Employees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No branches found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        branchList.map((req, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-xs font-bold text-slate-800 uppercase">{req.branch}</TableCell>
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
    </div>
  );
}
