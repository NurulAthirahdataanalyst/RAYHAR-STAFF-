import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Building2, Users, Loader2, Trash2, Search, Plus } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";

export default function Department() {
  const { role, userBranch } = useRole();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchDepartments();
      await fetchEmployees();
      setLoading(false);
    };
    fetchAll();
  }, [role, userBranch]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/departments`);
      const data = await response.json();
      if (data.success) {
        setDepartments([...data.departments.map((d: any) => d.name), "HQ General"]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleDeleteDepartment = async (e: React.MouseEvent, deptName: string) => {
    e.stopPropagation();
    if (deptName === "HQ General") {
      toast.error("Cannot delete default HQ General department");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the ${deptName} department?`)) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/departments/${encodeURIComponent(deptName)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Department deleted successfully");
        fetchDepartments();
      } else {
        toast.error(data.error || "Failed to delete department");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams({
        role: role || "",
        branch: userBranch || "",
      });

      const response = await fetch(`${API_BASE_URL}/api/employees?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const getDepartmentStats = (deptName: string) => {
    let deptEmployees = [];
    if (deptName === "HQ General") {
        deptEmployees = employees.filter(e => e.branch === "HQ" && (!e.department || e.department === ""));
    } else {
        deptEmployees = employees.filter(e => e.department === deptName);
    }
    
    return {
      count: deptEmployees.length,
      active: deptEmployees.filter(e => e.status === "Active").length,
      hods: deptEmployees.filter(e => e.role === "head_of_department")
    };
  };

  const deptArray = departments.map((dept) => {
    const stats = getDepartmentStats(dept);
    return {
      department: dept,
      headcount: stats.count,
      active: stats.active,
      hods: stats.hods,
    };
  });

  const filteredList = deptArray.filter((e) =>
    e.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-responsive-xl font-bold font-heading text-foreground">Department Management</h1>
          <p className="text-responsive-sm text-muted-foreground mt-1">
            View all departments and their staff allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/settings?tab=department")}
            className="h-11 px-8 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Department
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
          <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">
              Loading Departments...
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="border-border shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Departments</p>
                  <h3 className="text-3xl font-bold mt-1">{departments.length}</h3>
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

          <Card className="border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 bg-muted/20 pb-4">
              <CardTitle className="text-lg font-bold">Department Statistics</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search department..."
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="py-4 pl-6">Department</TableHead>
                      <TableHead>Head of Department</TableHead>
                      <TableHead className="text-center">Total Headcount</TableHead>
                      <TableHead className="text-center">Active Employees</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Building2 className="w-8 h-8 text-muted-foreground/50" />
                            <p>No department records found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((req, idx) => (
                        <TableRow 
                          key={idx} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors group"
                          onClick={() => navigate(`/master/department/${encodeURIComponent(req.department)}`)}
                        >
                          <TableCell className="py-4 pl-6 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Building2 className="w-4 h-4" />
                              </div>
                              {req.department}
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.hods.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {req.hods.map((hod: any) => (
                                  <Badge key={hod.user_id} variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                    {hod.full_name || "Unknown HOD"}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm italic text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {req.headcount}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
                              {req.active} Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {req.department !== "HQ General" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 shrink-0 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteDepartment(e, req.department)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

