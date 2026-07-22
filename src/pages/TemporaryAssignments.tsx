import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, CheckCircle2, XCircle, Search } from "lucide-react";

interface TemporaryAssignment {
  id: number;
  user_id: number;
  name: string;
  department: string;
  role: string;
  temp_branch: string;
  start_date: string;
  end_date: string | null;
  status: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://attendance-system-gamma-jade.vercel.app";

const TemporaryAssignments = () => {
  const [assignments, setAssignments] = useState<TemporaryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments-all`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (e) {
      console.error("Failed to fetch assignments", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          a.temp_branch.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Temporary Assignments
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View and track all temporary branch assignments across the organization.
        </p>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 dark:bg-slate-900/50 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-xl">Assignment History</CardTitle>
            <CardDescription>A complete log of employee branch reassignments.</CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search employee or branch..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="font-bold">Employee</TableHead>
                <TableHead className="font-bold">Temporary Branch</TableHead>
                <TableHead className="font-bold">Duration</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Loading assignments...
                  </TableCell>
                </TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <TableCell>
                      <div className="font-bold">{assignment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.role} • {assignment.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold">{assignment.temp_branch}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          {format(new Date(assignment.start_date), "MMM d, yyyy")} -{" "}
                          {assignment.end_date ? format(new Date(assignment.end_date), "MMM d, yyyy") : "Ongoing"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={assignment.status === "Active" ? "default" : assignment.status === "Completed" ? "secondary" : "destructive"}
                        className={`
                          ${assignment.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                          ${assignment.status === "Completed" ? "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300" : ""}
                          ${assignment.status === "Cancelled" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                        `}
                      >
                        {assignment.status === "Active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {assignment.status === "Cancelled" && <XCircle className="w-3 h-3 mr-1" />}
                        {assignment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemporaryAssignments;
