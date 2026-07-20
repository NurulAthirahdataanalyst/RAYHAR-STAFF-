import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ChevronRight, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type MissingPunchEmployee = {
  name: string;
  department: string;
  branch?: string;
  missingPunches: number;
  lastOccurrence: string;
};

interface MissingPunchCardProps {
  employees: MissingPunchEmployee[];
  indicator: string;
}

export function MissingPunchCard({ employees, indicator }: MissingPunchCardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.branch && emp.branch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="p-5 shadow-sm border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:border-red-300 dark:hover:border-red-800 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b border-red-100 dark:border-red-900/20 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="text-[15px] font-black text-red-900 dark:text-red-400">Missing Punches</h3>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Number of Missing Punches</p>
            <div className="flex items-end gap-3 mt-1">
              <h2 className="text-4xl font-black text-red-600 dark:text-red-500">{employees.length.toString().padStart(2, '0')}</h2>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded mb-1">Critical</span>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">
              Employees with repeated missing Clock Out
            </p>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex -space-x-2">
                {employees.slice(0, 4).map((emp, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                    {emp.name.substring(0, 2).toUpperCase()}
                  </div>
                ))}
                {employees.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">
                    +{employees.length - 4}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{indicator.split(' ')[0]} {indicator.split(' ')[1]}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${indicator.includes('↑') ? 'bg-red-500' : indicator.includes('↓') ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <ChevronRight className={`w-3 h-3 text-white ${indicator.includes('↑') ? '-rotate-90' : indicator.includes('↓') ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-none rounded-xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <DialogTitle className="text-lg font-black text-black dark:text-white">
              Missing Punch Details
            </DialogTitle>
          </div>
          <p className="text-sm text-slate-500">
            Employees who have frequently missed their clock out records.
          </p>
        </DialogHeader>

        <div className="p-6">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredEmployees.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No records found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold flex items-center justify-center text-sm">
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black dark:text-white">{emp.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {emp.department} {emp.branch ? `• ${emp.branch}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                        {emp.missingPunches} Times
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Last: {emp.lastOccurrence ? new Date(emp.lastOccurrence).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
