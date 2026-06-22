import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Plus, Search, Shield, Edit, Trash2, Calendar, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Role() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // Mock data matching the screenshot
  const [roles] = useState([
    { id: 1, name: "Admin", created: "12 Sep 2024", status: "Active" },
    { id: 2, name: "HR Manager", created: "24 Oct 2024", status: "Active" },
    { id: 3, name: "Recruitment Manager", created: "18 Feb 2024", status: "Active" },
    { id: 4, name: "Payroll Manager", created: "17 Oct 2024", status: "Active" },
    { id: 5, name: "Leave Manager", created: "20 Jul 2024", status: "Active" },
    { id: 6, name: "Performance Manager", created: "10 Apr 2024", status: "Active" },
    { id: 7, name: "Reports Analyst", created: "29 Aug 2024", status: "Active" },
    { id: 8, name: "Employee", created: "22 Feb 2024", status: "Inactive" },
    { id: 9, name: "Client", created: "03 Nov 2024", status: "Active" },
  ]);

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Home</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span>User Management</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900 font-medium">Roles</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2 bg-white text-gray-700 shadow-sm">
            <FileDown className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2 bg-[#7B0099] hover:bg-[#60007A] text-white shadow-sm">
            <Plus className="w-4 h-4" />
            Add Roles
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Table Header Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Roles List</h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 h-10 text-sm text-gray-600 shadow-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>06/16/2026 - 06/22/2026</span>
              </div>
              
              <Select defaultValue="status">
                <SelectTrigger className="w-[130px] bg-white border-gray-200 shadow-sm h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select defaultValue="7days">
                <SelectTrigger className="w-[180px] bg-white border-gray-200 shadow-sm h-10">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Sort By : Last 7 Days</SelectItem>
                  <SelectItem value="30days">Sort By : Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub Filters */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <span>Row Per Page</span>
              <Select defaultValue="10">
                <SelectTrigger className="w-[70px] bg-white border-gray-200 h-9 shadow-sm">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>Entries</span>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search" 
                className="pl-9 bg-white border-gray-200 h-9 w-full sm:w-[250px] shadow-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-gray-700 font-semibold bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-[#7B0099] focus:ring-[#7B0099] w-4 h-4 cursor-pointer" />
                  </th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 w-32 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors bg-white group">
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox" className="rounded border-gray-300 text-[#7B0099] focus:ring-[#7B0099] w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700">{role.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{role.created}</td>
                    <td className="px-6 py-4">
                      {role.status === "Active" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-xl rounded-xl">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-gray-900">Edit Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 p-6">
            <div className="space-y-2.5">
              <Label htmlFor="role-name" className="text-sm font-semibold text-gray-700">Role Name</Label>
              <Input 
                id="role-name" 
                defaultValue={selectedRole?.name}
                className="border-gray-200 focus-visible:ring-[#7B0099] h-11"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="status" className="text-sm font-semibold text-gray-700">Status</Label>
              <Select defaultValue={selectedRole?.status.toLowerCase()}>
                <SelectTrigger className="border-gray-200 focus:ring-[#7B0099] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-gray-100 bg-gray-50/50 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-gray-200 text-gray-700 bg-white">
              Cancel
            </Button>
            <Button className="bg-[#7B0099] hover:bg-[#60007A] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
