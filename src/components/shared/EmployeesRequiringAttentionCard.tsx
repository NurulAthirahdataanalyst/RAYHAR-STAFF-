import React from 'react';
import {
  AlertTriangle,
  Briefcase,
  MapPin,
  ChevronRight,
  Users,
  LineChart
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const EMPLOYEES = [
  {
    initials: 'NA',
    name: 'NURUL ATHIRAH ABDUL RAHMAN',
    role: 'Executive',
    dept: 'IT Department',
    branch: 'HQ',
    taken: 20,
    total: 22,
    percent: 91,
    left: 2,
    avatarColor: 'bg-red-100 text-red-600',
    progressColor: 'bg-red-600',
    badgeColor: 'bg-red-50 text-red-600',
    iconColor: 'text-purple-400'
  },
  {
    initials: 'AF',
    name: 'AHMAD FAIZ BIN HASAN',
    role: 'Senior Executive',
    dept: 'Marketing',
    branch: 'HQ',
    taken: 18,
    total: 22,
    percent: 82,
    left: 4,
    avatarColor: 'bg-amber-100 text-amber-600',
    progressColor: 'bg-amber-500',
    badgeColor: 'bg-orange-50 text-orange-600',
    iconColor: 'text-amber-500'
  },
  {
    initials: 'SA',
    name: 'SITI AISYAH BINTI MOHD',
    role: 'Executive',
    dept: 'Finance',
    branch: 'HQ',
    taken: 17,
    total: 22,
    percent: 77,
    left: 5,
    avatarColor: 'bg-purple-100 text-purple-600',
    progressColor: 'bg-amber-500',
    badgeColor: 'bg-amber-50 text-amber-600',
    iconColor: 'text-purple-400'
  },
  {
    initials: 'IR',
    name: 'IZZAT RAHMAN BIN ISMAIL',
    role: 'Assistant',
    dept: 'Operations',
    branch: 'Kuala Terengganu',
    taken: 15,
    total: 22,
    percent: 68,
    left: 7,
    avatarColor: 'bg-emerald-100 text-emerald-600',
    progressColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-50 text-emerald-600',
    iconColor: 'text-emerald-500'
  },
  {
    initials: 'MF',
    name: 'MUHD FARID BIN ZULKIFLI',
    role: 'Executive',
    dept: 'Sales',
    branch: 'Kuantan',
    taken: 14,
    total: 22,
    percent: 64,
    left: 8,
    avatarColor: 'bg-blue-100 text-blue-600',
    progressColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-50 text-emerald-600',
    iconColor: 'text-blue-400'
  }
];

export const EmployeesRequiringAttentionCard = () => {
  return (
    <Card className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex flex-col w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Employees Requiring Attention</h2>
              <p className="text-sm text-slate-500 font-medium">Low leave balance / High leave utilization</p>
            </div>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-600">5 Employees</span>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
          <div className="col-span-4">Employee</div>
          <div className="col-span-3">Department • Branch</div>
          <div className="col-span-3">Leave Taken / Entitlement</div>
          <div className="col-span-2 text-center">Balance Left</div>
        </div>
        
        <hr className="border-slate-100 mb-2" />

        {/* Rows */}
        <div className="flex flex-col">
          {EMPLOYEES.map((emp, idx) => (
            <React.Fragment key={idx}>
              <div className="grid grid-cols-12 gap-4 items-center py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors group">
                {/* Employee */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${emp.avatarColor}`}>
                    {emp.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{emp.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{emp.role}</p>
                  </div>
                </div>

                {/* Department & Branch */}
                <div className="col-span-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium">
                    <Briefcase className={`w-4 h-4 ${emp.iconColor}`} />
                    <span>{emp.dept}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium pl-[22px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.branch}</span>
                  </div>
                </div>

                {/* Leave Taken */}
                <div className="col-span-3 pr-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <div>
                      <span className={`text-base font-black ${emp.taken >= 20 ? 'text-red-600' : emp.taken >= 17 ? 'text-orange-500' : 'text-emerald-600'}`}>{emp.taken}</span>
                      <span className="text-xs font-semibold text-slate-500"> / {emp.total} days</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{emp.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${emp.progressColor}`} style={{ width: `${emp.percent}%` }}></div>
                  </div>
                </div>

                {/* Balance Left */}
                <div className="col-span-2 flex items-center justify-between pl-4">
                  <div className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl ${emp.badgeColor}`}>
                    <span className="text-lg font-black leading-none">{emp.left}</span>
                    <span className="text-[10px] font-bold">days left</span>
                  </div>
                  <button className="text-blue-600 font-bold text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    View <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {idx < EMPLOYEES.length - 1 && <hr className="border-slate-50 my-1 mx-2" />}
            </React.Fragment>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Monitor leave balance to ensure smooth workforce planning.</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Employees with low balance may need support or reallocation.</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-blue-600 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
            <Users className="w-4 h-4" />
            View All Employees
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};
