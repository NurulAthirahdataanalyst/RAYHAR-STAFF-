import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

export default function Department() {
  const { role, userBranch } = useRole();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-responsive-xl font-bold font-heading text-foreground">Department Management</h1>
          <p className="text-responsive-sm text-muted-foreground mt-1">
            View all departments and their staff allocation.
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="border-none shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
          <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Loading Departments...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {departments.map((dept) => {
            const stats = getDepartmentStats(dept);
            return (
              <Card 
                key={dept} 
                className="border-border/50 shadow-sm overflow-hidden bg-card/60 backdrop-blur-md hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 duration-300 group cursor-pointer"
                onClick={() => navigate(`/master/department/${encodeURIComponent(dept)}`)}
              >
                <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        {dept}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-center">
                      <p className="text-2xl font-black text-primary">{stats.count}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Total Staff
                      </p>
                    </div>
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-500/20 text-center">
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</p>
                      <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mt-1">
                        Active
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Head of Department</p>
                    {stats.hods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {stats.hods.map((hod) => (
                          <Badge key={hod.user_id} variant="outline" className="bg-primary/5 border-primary/20 text-primary dark:text-primary">
                            {hod.full_name || "Unknown HOD"}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Not assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
