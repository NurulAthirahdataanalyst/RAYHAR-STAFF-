import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Employees() {
  const { role, userBranch } = useRole();
  const [search, setSearch] = useState("");
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, [role, userBranch]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        branch: userBranch || "",
      });

      const response = await fetch(`https://rayhar-staff-portal.onrender.com/api/employees?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch employees");
      }

      const formattedData = data.employees.map((employee: any) => ({
        id: employee.user_id,
        name: employee.full_name || "New User",
        email: employee.email || "Account Active",
        position: employee.role === "hr_admin" ? "HR Admin" : employee.role ? employee.role.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : "Employee",
        branch: employee.branch || "HQ",
        department: "General",
        status: employee.status || "Active",
      }));

      setDbEmployees(formattedData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = dbEmployees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "hr_admin" ? "Manage employees across all branches" : `View employees in ${userBranch}`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                    {role === "hr_admin" && <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</th>}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((emp) => (
                      <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {emp.name.split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground capitalize">{emp.position}</td>
                        {role === "hr_admin" && <td className="py-3 px-4 text-muted-foreground">{emp.branch}</td>}
                        <td className="py-3 px-4">
                          <Badge variant={emp.status === "Active" ? "default" : "secondary"} className="text-[10px]">
                            {emp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
