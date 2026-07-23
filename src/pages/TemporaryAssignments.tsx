import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, CheckCircle2, XCircle, Search, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";

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
  const { role } = useRole();
  const isHRAdmin = role === "hr_admin";

  const [assignments, setAssignments] = useState<TemporaryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedAssignment, setSelectedAssignment] = useState<TemporaryAssignment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" });
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<TemporaryAssignment | null>(null);

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

  const fetchDependencies = async () => {
    try {
      const [branchRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branches`),
        fetch(`${API_BASE_URL}/api/employees?role=hr_admin&branch=`)
      ]);
      const branchData = await branchRes.json();
      const empData = await empRes.json();
      if (branchData.success) setBranches(branchData.branches);
      if (empData.success) setEmployees(empData.employees);
    } catch (e) {
      console.error("Failed to fetch dependencies", e);
    }
  };

  useEffect(() => {
    if (showAssignModal && employees.length === 0) {
      fetchDependencies();
    }
  }, [showAssignModal]);

  const handleAssignSubmit = async () => {
    if (!assignForm.user_id || !assignForm.location) {
      toast.error("Please select an employee and target branch.");
      return;
    }
    setSubmittingAssign(true);
    try {
      const url = editId 
        ? `${API_BASE_URL}/api/work-assignments/${editId}`
        : `${API_BASE_URL}/api/work-assignments`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "Assignment updated successfully" : "Assignment created successfully");
        setShowAssignModal(false);
        fetchAssignments();
        setAssignForm({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" });
        setEditId(null);
      } else {
        toast.error("Failed to save assignment");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, assignment: TemporaryAssignment) => {
    e.stopPropagation();
    setAssignForm({
      user_id: assignment.user_id.toString(),
      location: assignment.temp_branch,
      start_date: assignment.start_date.split('T')[0],
      end_date: assignment.end_date ? assignment.end_date.split('T')[0] : "",
      status: assignment.status
    });
    setEditId(assignment.id);
    setShowAssignModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, assignment: TemporaryAssignment) => {
    e.stopPropagation();
    setDeletingAssignment(assignment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingAssignment) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-assignments/${deletingAssignment.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Temporary assignment for ${deletingAssignment.name} has been deleted successfully.`);
        fetchAssignments();
      } else {
        toast.error("Failed to delete assignment.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setShowDeleteModal(false);
      setDeletingAssignment(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Temporary Assignments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and track all temporary branch assignments across the organization.
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditId(null);
            setAssignForm({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" });
            setShowAssignModal(true);
          }}
          className="bg-[#a01497] hover:bg-[#850f7c] text-white font-bold whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Temporary Branch
        </Button>
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
                {isHRAdmin && <TableHead className="font-bold text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isHRAdmin ? 5 : 4} className="text-center py-10 text-muted-foreground">
                    Loading assignments...
                  </TableCell>
                </TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isHRAdmin ? 5 : 4} className="text-center py-10 text-muted-foreground">
                    No assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow 
                    key={assignment.id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowDetailsModal(true);
                    }}
                  >
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
                    {isHRAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, assignment)} className="h-8 w-8 text-slate-500 hover:text-[#a01497]">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, assignment)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
    </Card>

      {/* ASSIGNMENT DIALOG */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Temporary Assignment" : "Temporary Branch Assignment"}</DialogTitle>
            <DialogDescription>{editId ? "Update the employee's temporary branch assignment." : "Assign an employee to work at a different branch temporarily."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Employee</Label>
              <Select value={assignForm.user_id} onValueChange={(val) => setAssignForm({...assignForm, user_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {employees.map(e => (
                    <SelectItem key={e.user_id} value={e.user_id}>{e.full_name} ({e.branch})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Branch</Label>
              <Select value={assignForm.location} onValueChange={(val) => setAssignForm({...assignForm, location: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {branches.map(b => (
                    <SelectItem key={b.code} value={b.code}>{b.code} - {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Start Date</Label>
                <Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({...assignForm, start_date: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End Date</Label>
                <Input type="date" value={assignForm.end_date} onChange={(e) => setAssignForm({...assignForm, end_date: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="w-1/3 text-rose-500 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => setAssignForm({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" })}
              >
                Reset
              </Button>
              <Button className="w-full bg-[#a01497] hover:bg-[#850f7c] text-white" disabled={submittingAssign} onClick={handleAssignSubmit}>
                {submittingAssign ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editId ? "Save Changes" : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b pb-4">Temporary Assignment Details</DialogTitle>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-6 pt-4">
              {/* Employee Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Employee Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Employee Name</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAssignment.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Employee ID</p>
                    <p className="text-sm font-semibold text-slate-800">EMP-{selectedAssignment.user_id.toString().padStart(4, '0')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Branch</p>
                    <p className="text-sm font-semibold text-slate-800">{(selectedAssignment as any).primary_branch || 'HQ'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Department</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAssignment.department}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Position</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAssignment.role}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Assignment Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Assignment Title</p>
                    <p className="text-sm font-semibold text-slate-800">Temporary Branch Reassignment</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Assignment Location</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAssignment.temp_branch}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Start Date</p>
                    <p className="text-sm font-semibold text-slate-800">{format(new Date(selectedAssignment.start_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">End Date</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAssignment.end_date ? format(new Date(selectedAssignment.end_date), "dd/MM/yyyy") : "Ongoing"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Duration</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedAssignment.end_date 
                        ? `${Math.ceil((new Date(selectedAssignment.end_date).getTime() - new Date(selectedAssignment.start_date).getTime()) / (1000 * 3600 * 24))} Days`
                        : "Ongoing"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Purpose & Details */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Purpose & Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Reason for Assignment</p>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600">
                      Not provided
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Remarks</p>
                    <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600 min-h-[60px]">
                      Not provided
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Approval Information</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Assigned By</p>
                    <p className="text-sm font-semibold text-slate-800">System Admin</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Date</p>
                    <p className="text-sm font-semibold text-slate-800">{format(new Date(selectedAssignment.start_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 font-medium">Status</p>
                    <div className="mt-1">
                      <Badge
                        variant={selectedAssignment.status === "Active" ? "default" : selectedAssignment.status === "Completed" ? "secondary" : "destructive"}
                        className={`
                          ${selectedAssignment.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                          ${selectedAssignment.status === "Completed" ? "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300" : ""}
                          ${selectedAssignment.status === "Cancelled" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}
                        `}
                      >
                        {selectedAssignment.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4 mt-6">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">Edit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Temporary Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the temporary assignment for <span className="font-bold text-slate-800">{deletingAssignment?.name}</span> to <span className="font-bold text-slate-800">{deletingAssignment?.temp_branch}</span>?
              <br/><br/>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Assignment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemporaryAssignments;
