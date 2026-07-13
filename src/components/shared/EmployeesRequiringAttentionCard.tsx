import React from 'react';
import {
  AlertTriangle,
  Briefcase,
  MapPin,
  Calendar,
  Wallet,
  ChevronRight,
  User,
  AlertCircle,
  Users
} from 'lucide-react';
import { Card } from '@/components/ui/card';

export const EmployeesRequiringAttentionCard = () => {
  return (
    <Card className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Employees Requiring Attention</h2>
              <p className="text-sm text-slate-500 font-medium">Low leave balance</p>
            </div>
          </div>
          <div className="bg-red-50 px-4 py-1.5 rounded-xl">
            <span className="text-sm font-bold text-red-600">1 Employee</span>
          </div>
        </div>

        <hr className="border-slate-100 mb-6" />

        {/* Profile Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-red-500/80" fill="currentColor" strokeWidth={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-black text-slate-800 uppercase tracking-wide">
                Nurul Athirah Abdul Rahman
              </h3>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span>IT Department</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>HQ</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-red-600 font-semibold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Low leave balance</span>
              </div>
            </div>
          </div>
          <button className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1 pt-2 transition-colors">
            View <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50/50 rounded-2xl p-5 border border-red-50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-red-600" strokeWidth={2} />
              <span className="text-sm font-semibold text-slate-600">Leave Taken</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-red-600">20</span>
              <span className="text-base font-semibold text-slate-500">days</span>
            </div>
            <p className="text-sm font-medium text-slate-500">of 22 days entitlement</p>
          </div>

          <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-50">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-emerald-600" strokeWidth={2} />
              <span className="text-sm font-semibold text-slate-600">Balance Left</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-emerald-600">2</span>
              <span className="text-base font-semibold text-slate-500">days</span>
            </div>
            <p className="text-sm font-medium text-slate-500">of 22 days entitlement</p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[15px] font-bold text-slate-800">Utilization</span>
            <span className="text-[15px] font-bold text-red-600">91% used</span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-red-600 rounded-full" style={{ width: '91%' }}></div>
          </div>
          <p className="text-sm font-medium text-slate-500">
            You have used 91% of your annual leave entitlement.
          </p>
        </div>
      </div>

      {/* Footer */}
      <button className="w-full border-t border-slate-100 p-5 flex items-center justify-between text-indigo-700 hover:bg-slate-50 transition-colors group">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5" />
          <span className="font-bold text-[15px]">View All Employees Requiring Attention</span>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-700 transition-colors" />
      </button>
    </Card>
  );
};
