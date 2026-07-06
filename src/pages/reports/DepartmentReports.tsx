import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/config/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Building2, Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/shared/ExportDropdown";

export default function DepartmentReports() {
  const { role, userBranch, userDepartment } = useRole();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("page-header-actions"));
  }, []);

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

  // Get unique branches and departments for dropdown filters
  const branches = ["All", ...new Set(employees.map(e => e.branch || 'HQ').filter(Boolean))];
  const departments = ["All", ...new Set(employees.map(e => e.department || '--').filter(Boolean))];

  // Filter employees based on selected dropdown options
  const filteredEmployees = employees.filter(e => {
    const matchesBranch = selectedBranch === "All" || (e.branch || 'HQ') === selectedBranch;
    const matchesDept = selectedDept === "All" || (e.department || '--') === selectedDept;
    return matchesBranch && matchesDept;
  });

  // Group by department using filtered employees list
  const deptMap: Record<string, { branch: string, headcount: number, active: number }> = {};
  filteredEmployees.forEach(e => {
    const key = `${e.department || '--'} - ${e.branch || 'HQ'}`;
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

  const hqList = deptArray.filter(e => e.branch === 'HQ');
    
  // Aggregate branch list by branch
  const branchMap: Record<string, { headcount: number, active: number }> = {};
  deptArray.filter(e => e.branch !== 'HQ').forEach(e => {
    if (!branchMap[e.branch]) {
      branchMap[e.branch] = { headcount: 0, active: 0 };
    }
    branchMap[e.branch].headcount += e.headcount;
    branchMap[e.branch].active += e.active;
  });
  
  const branchList = Object.entries(branchMap).map(([branch, stats]) => ({
    branch,
    headcount: stats.headcount,
    active: stats.active
  }));

  const handleExportCSV = () => {
    const headers = ["Department", "Branch", "Total Headcount", "Active Employees"];
    const rows = deptArray.map(a => [
      `"${(a.department || '').replace(/"/g, '""')}"`,
      `"${(a.branch || '').replace(/"/g, '""')}"`,
      a.headcount,
      a.active
    ]);

    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `department_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {portalTarget && createPortal(
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch:</span>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b} value={b} className="uppercase text-xs">
                      {b === "All" ? "All Branches" : b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dept:</span>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-slate-950">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d} value={d} className="uppercase text-xs">
                      {d === "All" ? "All Departments" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ExportDropdown onExportCSV={handleExportCSV} />
          </div>,
          portalTarget
        )}

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
                {filteredEmployees.length}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Department Statistics (HQ)</CardTitle>
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
            <CardHeader>
              <CardTitle className="text-lg">Branch Statistics</CardTitle>
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
