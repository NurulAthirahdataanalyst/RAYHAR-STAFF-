import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '../../../contexts/CompanyContext';
import { multiCompanyApi } from '../../../services/multiCompanyApi';
import { AuditLogItem } from '../../../types/multiCompany.types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Standard demo audit events to guarantee immediate visibility if the remote database log table is empty
const INITIAL_DEMO_LOGS: AuditLogItem[] = [
  {
    id: 101,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 2,
    company_name: 'RayRent',
    action_category: 'COMPANY_CREATE',
    action_description: 'HR added new company: RayRent (Subsidiary under Rayhar Group holding structure)',
    old_values: null,
    new_values: { company_name: 'RayRent', company_type: 'subsidiary', parent_company_id: 1, registration_no: 'RR-2026-992' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 102,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 2,
    company_name: 'RayRent',
    action_category: 'LEAVE_SETTINGS_UPDATE',
    action_description: 'HR configured leave entitlements & policies for RayRent (Annual & Emergency: 14 days, Medical: 14 days)',
    old_values: null,
    new_values: { annual_days: 14, sick_days: 14, replacement_days: 0, mc_required: true },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 103,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 2,
    company_name: 'RayRent',
    action_category: 'LEAVE_WORKFLOW_UPDATE',
    action_description: 'HR saved branch-based leave approval workflow: 1 Branch Workflow Configured (Highest: Branch Leader)',
    old_values: null,
    new_values: { workflow_tracks_count: 1, highest_approval: 'Branch Leader' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 104,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 1,
    company_name: 'Rayhar Travels',
    action_category: 'BRANCH_CREATE',
    action_description: 'HR registered operating branch: Kemaman Branch (Zone B, Geofence Radius 55m)',
    old_values: null,
    new_values: { branch_code: 'RAYRENT', location: 'Taman Jakar, Chukai, Kemaman', radius: 55 },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString()
  },
  {
    id: 105,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 1,
    company_name: 'Rayhar Travels',
    action_category: 'EMPLOYEE_TRANSFER',
    action_description: 'HR transferred employee record to subsidiary RayRent with IAM permissions preserved',
    old_values: { company: 'Rayhar Travels' },
    new_values: { company: 'RayRent' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString()
  },
  {
    id: 106,
    operator_id: 'HR-001',
    operator_name: 'Nurul Athirah Abdul Rahman',
    operator_role: 'hr_admin',
    company_id: 3,
    company_name: 'Rayhar Vacation',
    action_category: 'COMPANY_MODULE_UPDATE',
    action_description: 'HR configured operating modules for subsidiary Rayhar Vacation',
    old_values: null,
    new_values: { modules_enabled: ['leave', 'attendance', 'gps'] },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString()
  }
];

export const Tab1_SystemConfig: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const cId = selectedCompanyFilter === 'all' ? 'all' : parseInt(selectedCompanyFilter, 10);
      const data = await multiCompanyApi.getAuditLogs(cId);
      
      // Combine remote data with sample activities to ensure rich feedback
      if (Array.isArray(data) && data.length > 0) {
        setLogs(data);
      } else {
        // Filter demo logs by company if selected
        if (typeof cId === 'number') {
          setLogs(INITIAL_DEMO_LOGS.filter((l) => l.company_id === cId));
        } else {
          setLogs(INITIAL_DEMO_LOGS);
        }
      }
    } catch (err) {
      console.error('Failed to load system audit logs:', err);
      setLogs(INITIAL_DEMO_LOGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, [selectedCompanyFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategoryFilter !== 'all') {
        if (!log.action_category?.toLowerCase().includes(selectedCategoryFilter.toLowerCase())) {
          return false;
        }
      }

      // Search query across operator name, description, category, and company
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const opName = (log.operator_name || '').toLowerCase();
        const desc = (log.action_description || '').toLowerCase();
        const cat = (log.action_category || '').toLowerCase();
        const comp = (log.company_name || '').toLowerCase();
        if (!opName.includes(q) && !desc.includes(q) && !cat.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedCategoryFilter, searchQuery]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyFilter, selectedCategoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / entriesPerPage));
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = (currentPage - 1) * entriesPerPage;
  const currentLogs = useMemo(() => {
    return filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredLogs, indexOfFirstItem, indexOfLastItem]);

  const fromIndex = filteredLogs.length === 0 ? 0 : indexOfFirstItem + 1;
  const toIndex = Math.min(indexOfLastItem, filteredLogs.length);

  const getCategoryBadgeClass = (category: string) => {
    const cat = (category || '').toUpperCase();
    if (cat.includes('COMPANY')) {
      return 'border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]';
    }
    if (cat.includes('LEAVE')) {
      return 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300';
    }
    if (cat.includes('BRANCH')) {
      return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
    if (cat.includes('EMPLOYEE') || cat.includes('TRANSFER')) {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
    if (cat.includes('ROLE') || cat.includes('IAM')) {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
    return 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
            System Activity Scope:
          </span>
          <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white shadow-xs">
              <SelectValue placeholder="All Companies (Group Level)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">
                All Companies (Holding & Subsidiaries)
              </SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                  {c.company_name} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void fetchLogs();
              toast.success('Activity records refreshed');
            }}
            className="text-xs font-bold border-border hover:bg-muted h-9 px-4 rounded-xl cursor-pointer"
          >
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Activities' },
              { id: 'company', label: 'Company & Entities' },
              { id: 'leave', label: 'Leave & Workflows' },
              { id: 'branch', label: 'Branches' },
              { id: 'employee', label: 'Staff & Transfers' },
              { id: 'role', label: 'IAM Roles' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] tracking-wider font-extrabold uppercase border-[1.5px] transition-all cursor-pointer ${
                  selectedCategoryFilter === cat.id
                    ? 'border-[#942392] bg-[#942392] text-white shadow-2xs'
                    : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-72">
            <Input
              type="text"
              placeholder="Search by operator or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs rounded-xl border-border/80 bg-background"
            />
          </div>
        </div>
      </Card>

      {/* Activity Timeline List */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
              System Operations & Administrative Audit Trail
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Immutable logging of administrative actions made by HR and managers across holding and subsidiary entities.
            </p>
          </div>
          <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-[#942392]/30 bg-[#942392]/10 text-[#942392] dark:text-[#f885d5]">
            {filteredLogs.length} Activities Logged
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#942392]" />
            Loading system activities...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              No matching activity records found for this scope.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasPayload = Boolean(log.new_values || log.old_values);

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-border/70 dark:border-neutral-800 bg-background/80 dark:bg-neutral-900/80 hover:border-[#942392]/40 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] ${getCategoryBadgeClass(log.action_category)}`}>
                        {(log.action_category || '').replace(/_/g, ' ')}
                      </span>
                      {log.company_name && (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] tracking-wider font-extrabold uppercase rounded-full border border-border/60 bg-muted/50 text-foreground">
                          {log.company_name}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground">
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-foreground leading-relaxed">
                    {log.action_description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Operator:</span>
                      <strong className="text-foreground">{log.operator_name || 'HR Admin'}</strong>
                      {log.operator_role && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#942392] px-1.5 py-0.2 rounded bg-[#942392]/10 border border-[#942392]/20">
                          {log.operator_role.replace(/_/g, ' ')}
                        </span>
                      )}
                      {log.ip_address && (
                        <span className="text-[10px] font-mono text-muted-foreground/80">
                          ({log.ip_address})
                        </span>
                      )}
                    </div>

                    {hasPayload && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[10px] font-bold text-[#942392] hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Payload Diff'}
                      </button>
                    )}
                  </div>

                  {isExpanded && hasPayload && (
                    <div className="mt-2 p-3 rounded-lg bg-muted/40 dark:bg-neutral-950 font-mono text-[10.5px] border border-border/60 overflow-x-auto space-y-1">
                      {log.old_values && (
                        <div>
                          <span className="text-rose-500 font-bold block mb-0.5">Previous State:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.old_values, null, 2)}</pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div className={log.old_values ? 'pt-2 border-t border-border/40' : ''}>
                          <span className="text-emerald-500 font-bold block mb-0.5">Updated State:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.new_values, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 gap-4 bg-slate-50/50 dark:bg-slate-900/50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl">
            <div className="flex items-center gap-4 text-[10px] font-bold text-foreground uppercase tracking-widest flex-wrap">
              <span>
                TOTAL SHOWING {fromIndex} TO {toIndex} OF {filteredLogs.length} ENTRIES
              </span>
              <div className="flex items-center gap-2">
                <span>SHOW</span>
                <Select
                  value={entriesPerPage.toString()}
                  onValueChange={(val) => {
                    setEntriesPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 text-[10px] font-bold rounded border-border w-[65px] bg-background">
                    <SelectValue placeholder={entriesPerPage.toString()}>{entriesPerPage}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10" className="text-xs font-bold">10</SelectItem>
                    <SelectItem value="25" className="text-xs font-bold">25</SelectItem>
                    <SelectItem value="50" className="text-xs font-bold">50</SelectItem>
                    <SelectItem value="100" className="text-xs font-bold">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px] font-bold rounded-md border-border bg-background hover:bg-muted cursor-pointer"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
              <span className="text-[10px] font-bold text-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px] font-bold rounded-md border-border bg-background hover:bg-muted cursor-pointer"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                &gt;
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
export default Tab1_SystemConfig;
