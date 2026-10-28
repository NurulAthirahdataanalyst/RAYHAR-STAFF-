import React, { useState, useEffect } from 'react';
import { multiCompanyApi } from '../services/multiCompanyApi';
import { EmployeeTransferRecord } from '../types/multiCompany.types';
import { History, ArrowRight, Calendar, User, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EmployeeCompanyHistoryProps {
  employeeId?: string;
}

export const EmployeeCompanyHistory: React.FC<EmployeeCompanyHistoryProps> = ({ employeeId }) => {
  const [records, setRecords] = useState<EmployeeTransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        if (employeeId) {
          const res = await multiCompanyApi.getEmployeeTransferHistory(employeeId);
          setRecords(res);
        } else {
          // Fetch from audit logs or history endpoint
          const res = await multiCompanyApi.getAllTransferHistory();
          setRecords(res);
        }
      } catch (err) {
        console.error('Failed to load transfer history:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchHistory();
  }, [employeeId]);

  const filtered = records.filter(r => 
    r.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    r.previous_company.toLowerCase().includes(search.toLowerCase()) ||
    r.new_company.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#942392]" />
          <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground dark:text-neutral-200">
            Immutable Career & Company Transfer Ledger
          </h4>
        </div>

        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer history..."
            className="text-xs h-8 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-card/90 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading transfer history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No company transfer records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
                <tr>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Date</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Staff</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Transition Route</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Role Change</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Transfer Reason</th>
                  <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-black dark:text-white">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-neutral-800/40">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/40 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {new Date(r.effective_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-black dark:text-white">
                      {r.employee_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-[#942392] dark:text-[#f885d5]">
                        <span>{r.previous_company}</span>
                        <ArrowRight className="w-3 h-3 text-[#942392]" />
                        <span>{r.new_company}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        <span>{r.previous_role || 'Staff'}</span>
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                        <span>{r.new_role || 'Staff'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-black dark:text-white max-w-xs truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.approved_by || 'Admin'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
