import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Users,
  Plus,
  Search,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  CheckCircle2,
  UserX,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompany } from '../../../contexts/CompanyContext';
import { API_BASE_URL } from '@/config/api';
import { toProperCase } from '@/utils/branchUtils';
import { formatMyKad, parseMyKad, formatMalaysianPhone } from '@/utils/mykadUtils';

interface PersonnelMember {
  user_id: string;
  id?: string;
  full_name: string;
  name?: string;
  email: string;
  role: string;
  role_name?: string;
  branch: string;
  department?: string | null;
  status: string;
  phone?: string | null;
  ic_number?: string | null;
  join_date?: string | null;
}

export const TabPersonnelEntity: React.FC = () => {
  const { companies, activeCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(activeCompany?.id || 1);
  const [personnel, setPersonnel] = useState<PersonnelMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Status toggle modal
  const [statusConfirmEmp, setStatusConfirmEmp] = useState<PersonnelMember | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [signupCompanyId, setSignupCompanyId] = useState<number>(activeCompany?.id || 1);
  const [signupName, setSignupName] = useState('');
  const [signupUserId, setSignupUserId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupBranch, setSignupBranch] = useState('HQ');
  const [signupDepartment, setSignupDepartment] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupIc, setSignupIc] = useState('');
  const [signupJoinDate, setSignupJoinDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [signupRole, setSignupRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal company-scoped branches, departments, roles
  const [modalBranches, setModalBranches] = useState<any[]>([]);
  const [modalDepartments, setModalDepartments] = useState<any[]>([]);
  const [modalRoles, setModalRoles] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  const parsedSignupIc = useMemo(() => parseMyKad(signupIc), [signupIc]);

  // Sync selected company when workspace switcher changes
  useEffect(() => {
    if (activeCompany?.id) {
      setSelectedCompanyId(activeCompany.id);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.company?.id) {
        setSelectedCompanyId(e.detail.company.id);
      }
    };
    window.addEventListener('rayhar_company_switched', handler);
    return () => window.removeEventListener('rayhar_company_switched', handler);
  }, []);

  // Fetch personnel whenever selectedCompanyId changes
  useEffect(() => {
    void fetchPersonnel(selectedCompanyId);
  }, [selectedCompanyId]);

  const fetchPersonnel = async (companyId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees?company_id=${companyId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        const rawList = data.employees.map((e: any) => ({
          user_id: e.user_id || e.id,
          id: e.id || e.user_id,
          full_name: e.full_name || e.name || 'Unknown',
          name: e.name || e.full_name || 'Unknown',
          email: e.email || '',
          role: e.role_name || e.role || 'Employee',
          branch: e.branch || 'HQ',
          department: e.department || null,
          status: e.status || 'Active',
          phone: e.phone || null,
          ic_number: e.ic_number || null,
          join_date: e.join_date || null,
        }));
        setPersonnel(rawList);
      } else {
        setPersonnel([]);
      }
    } catch (err) {
      console.error('Error fetching personnel for company:', err);
      toast.error('Failed to load personnel list');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalDataForCompany = async (companyId: number) => {
    setLoadingModalData(true);
    try {
      const [bRes, dRes, rRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branches?company_id=${companyId}`),
        fetch(`${API_BASE_URL}/api/departments?company_id=${companyId}`),
        fetch(`${API_BASE_URL}/api/roles?company_id=${companyId}`),
      ]);
      const [bData, dData, rData] = await Promise.all([
        bRes.json(),
        dRes.json(),
        rRes.json(),
      ]);

      const branches = bData.success && Array.isArray(bData.branches) ? bData.branches : [];
      setModalBranches(branches);
      if (branches.length > 0) {
        setSignupBranch(branches[0].code);
      } else {
        setSignupBranch('');
      }

      const depts = dData.success && Array.isArray(dData.departments) ? dData.departments : [];
      setModalDepartments(depts);
      if (depts.length > 0) {
        setSignupDepartment(depts[0].name || depts[0].department_name || '');
      } else {
        setSignupDepartment('');
      }

      const roles = rData.success && Array.isArray(rData.roles) ? rData.roles : [];
      setModalRoles(roles);
      const activeRoles = roles.filter((r: any) => r.status === 'Active');
      if (activeRoles.length > 0) {
        setSignupRole(activeRoles[0].name);
      } else {
        setSignupRole('');
      }
    } catch (err) {
      console.error('Error fetching modal company data:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleOpenAddStaffModal = () => {
    setSignupCompanyId(selectedCompanyId);
    setSignupName('');
    setSignupIc('');
    setSignupUserId('');
    setSignupPhone('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupJoinDate(new Date().toISOString().split('T')[0]);
    void fetchModalDataForCompany(selectedCompanyId);
    setIsAddModalOpen(true);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const matchedRole = modalRoles.find(
        (r) => r.name.toLowerCase() === signupRole.toLowerCase()
      );
      const chosenRoleName = matchedRole ? matchedRole.name : (signupRole || 'Employee');

      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': String(signupCompanyId),
        },
        body: JSON.stringify({
          user_id: signupUserId.trim() || undefined,
          full_name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          branch: signupBranch,
          department: signupDepartment && signupDepartment !== 'NONE' ? signupDepartment : null,
          role: chosenRoleName,
          status: 'Active',
          company_id: signupCompanyId,
          ic_number: signupIc ? formatMyKad(signupIc) : null,
          phone: signupPhone ? formatMalaysianPhone(signupPhone) : null,
          gender: parsedSignupIc.gender || null,
          dob: parsedSignupIc.dob || null,
          join_date: signupJoinDate || null,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Successfully created user ${data.user?.full_name || signupName}`);
        setIsAddModalOpen(false);
        setSignupName('');
        setSignupIc('');
        setSignupUserId('');
        setSignupEmail('');
        setSignupPassword('');
        setSignupPhone('');
        setSignupJoinDate(new Date().toISOString().split('T')[0]);
        await fetchPersonnel(selectedCompanyId);
      } else {
        toast.error(data.error || 'Failed to onboard staff account');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error('Could not connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmEmp) return;
    setIsUpdatingStatus(true);
    try {
      const currentStatus = statusConfirmEmp.status || 'Active';
      const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

      const res = await fetch(`${API_BASE_URL}/api/employees/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: statusConfirmEmp.user_id || statusConfirmEmp.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        toast.success(`Updated ${statusConfirmEmp.full_name} status to ${nextStatus}`);
        setStatusConfirmEmp(null);
        await fetchPersonnel(selectedCompanyId);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update employee status');
      }
    } catch (err: any) {
      toast.error('Network error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Unique branches for current personnel list
  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    personnel.forEach((p) => {
      if (p.branch) set.add(p.branch);
    });
    return Array.from(set).sort();
  }, [personnel]);

  // Filtered list
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBranch = branchFilter === 'ALL' || p.branch === branchFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchSearch && matchBranch && matchStatus;
    });
  }, [personnel, searchTerm, branchFilter, statusFilter]);

  const currentCompanyName = useMemo(() => {
    const found = companies.find((c) => c.id === selectedCompanyId);
    return found ? toProperCase(found.company_name) : 'Rayhar Travels';
  }, [companies, selectedCompanyId]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 dark:bg-neutral-900/40 rounded-xl border border-border dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <Users className="w-4 h-4 text-[#942392]" />
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Company Personnel Scope:
          </span>
          <Select
            value={selectedCompanyId ? selectedCompanyId.toString() : '1'}
            onValueChange={(val) => setSelectedCompanyId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-72 min-w-[260px] text-xs h-9 bg-background dark:bg-neutral-900 border-border dark:border-neutral-800 font-bold text-black dark:text-white shadow-xs">
              <SelectValue placeholder="Select company...">
                {(() => {
                  const found = companies.find((c) => c.id === selectedCompanyId);
                  if (!found) return 'Rayhar Travels (Main Company)';
                  const cName = toProperCase(found.company_name);
                  const cType = found.company_type === 'main' ? 'Main Company' : 'Subsidiary';
                  return `${cName} (${cType})`;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs font-bold">
                    {toProperCase(c.company_name)} ({c.company_type === 'main' ? 'Main Company' : 'Subsidiary'})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1" className="text-xs font-bold">
                  Rayhar Travels (Main Company)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleOpenAddStaffModal}
          className="bg-[#942392] hover:bg-[#800A7A] text-white font-black text-xs uppercase tracking-wider shadow-sm h-9 px-4 rounded-xl self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          ADD STAFF
        </Button>
      </div>

      {/* Secondary Search & Quick Filters Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 bg-card/60 backdrop-blur-md rounded-2xl border border-border/70 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, ID, or email..."
            className="h-9 pl-9 text-xs font-medium rounded-xl bg-background/50 border-border/60"
          />
        </div>

        {availableBranches.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40 h-9 text-xs font-bold rounded-xl bg-background/50 border-border/60">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs font-bold">
                All Branches
              </SelectItem>
              {availableBranches.map((br) => (
                <SelectItem key={br} value={br} className="text-xs font-bold">
                  {br}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-xs font-bold rounded-xl bg-background/50 border-border/60">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL" className="text-xs font-bold">
              All Status
            </SelectItem>
            <SelectItem value="Active" className="text-xs font-bold">
              Active Only
            </SelectItem>
            <SelectItem value="Inactive" className="text-xs font-bold">
              Inactive Only
            </SelectItem>
          </SelectContent>
        </Select>

        {(searchTerm || branchFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setBranchFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="h-9 px-3 text-xs font-bold rounded-xl border-border/60 hover:bg-muted"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        )}

        <Badge
          variant="outline"
          className="ml-auto px-3 py-1.5 text-xs font-bold bg-muted/30 border-border/60 h-9 flex items-center justify-center rounded-xl"
        >
          Total Staff
          <span className="ml-2 flex items-center justify-center bg-[#942392] text-white rounded-md h-5 min-w-[20px] px-1.5 text-[10px] font-black">
            {filteredPersonnel.length}
          </span>
        </Badge>
      </div>

      {/* Personnel Table (Clean Branches & Geofence Card Style, Non-Clickable Rows) */}
      <Card className="border border-border dark:border-neutral-800 shadow-xs bg-white/70 dark:bg-card/70 backdrop-blur-md rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#942392]" />
            <span>Loading personnel for {currentCompanyName}...</span>
          </div>
        ) : filteredPersonnel.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-9 h-9 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground font-semibold">
              No personnel found for {currentCompanyName}.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Click &quot;Add Staff&quot; above to onboard personnel to this entity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 dark:bg-neutral-800/60 border-b border-border dark:border-neutral-800 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                <TableRow className="border-b border-border/70 hover:bg-transparent">
                  <TableHead className="py-3.5 px-5 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    STAFF MEMBER
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    POSITION / ROLE
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    BRANCH
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    DEPARTMENT
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-black uppercase tracking-wider text-black dark:text-white">
                    STATUS
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-xs font-black uppercase tracking-wider text-black dark:text-white text-right">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {filteredPersonnel.map((member) => {
                  const initials = (member.full_name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const isActive = member.status === 'Active';

                  return (
                    <TableRow
                      key={member.user_id}
                      className="cursor-default hover:bg-muted/30 transition-colors"
                    >
                      {/* Staff Member */}
                      <TableCell className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#942392]/10 dark:bg-[#942392]/20 flex items-center justify-center text-xs font-black text-[#942392] shrink-0 border border-[#942392]/15">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground truncate">
                              {member.full_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">
                              {member.user_id} {member.email ? `• ${member.email}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Position / Role */}
                      <TableCell className="py-3.5 px-4">
                        <span className="text-xs font-bold text-foreground capitalize">
                          {member.role.replace(/_/g, ' ')}
                        </span>
                      </TableCell>

                      {/* Branch */}
                      <TableCell className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-border/80 bg-muted/50 text-foreground dark:bg-neutral-800/60 dark:border-neutral-700 shadow-2xs">
                          <Building2 className="w-3 h-3 text-[#942392]" />
                          <span>{member.branch}</span>
                        </span>
                      </TableCell>

                      {/* Department */}
                      <TableCell className="py-3.5 px-4">
                        {member.department ? (
                          <span className="text-xs font-bold text-foreground">
                            {toProperCase(member.department)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
                            ACTIVE STAFF
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shadow-2xs">
                            INACTIVE
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => setStatusConfirmEmp(member)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition-colors cursor-pointer shadow-2xs"
                          >
                            <UserX className="w-3 h-3" />
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatusConfirmEmp(member)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] tracking-wider font-extrabold uppercase rounded-full border-[1.5px] border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer shadow-2xs"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* STATUS CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Dialog open={!!statusConfirmEmp} onOpenChange={(open) => !open && setStatusConfirmEmp(null)}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 border-0 border-none shadow-2xl rounded-2xl">
          <DialogHeader
            className={`p-5 text-white ${
              statusConfirmEmp?.status === 'Active'
                ? 'bg-[#942392]'
                : 'bg-emerald-600'
            }`}
          >
            <DialogTitle className="text-lg font-black text-white m-0">
              {statusConfirmEmp?.status === 'Active' ? 'Deactivate Employee?' : 'Reactivate Employee?'}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-medium m-0 mt-1">
              {statusConfirmEmp?.status === 'Active'
                ? 'This will disable employee portal login temporarily.'
                : 'This will restore access for the employee.'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-3">
            <p className="text-xs font-semibold text-foreground">
              Are you sure you want to change status for{' '}
              <strong>{statusConfirmEmp?.full_name}</strong> ({statusConfirmEmp?.user_id})?
            </p>
          </div>
          <DialogFooter className="p-5 pt-0 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatusConfirmEmp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isUpdatingStatus}
              onClick={handleConfirmToggleStatus}
              className={`text-white font-bold ${
                statusConfirmEmp?.status === 'Active'
                  ? 'bg-[#942392] hover:bg-[#7a1d79]'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isUpdatingStatus ? 'Updating...' : statusConfirmEmp?.status === 'Active' ? 'Mark Inactive' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD NEW STAFF MODAL (Exact Layout from Screenshot 3)                     */}
      {/* ========================================================================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-5xl w-full overflow-hidden p-0 border-0 border-none shadow-2xl rounded-3xl [&>button]:text-white [&>button]:hover:text-white/80 bg-card">
          <DialogHeader className="bg-[#942392] p-6 text-white border-b border-white/20 shrink-0 text-left">
            <DialogTitle className="text-white font-black uppercase tracking-tight text-lg m-0">
              ADD NEW STAFF
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-bold uppercase tracking-wider m-0 mt-1">
              CREATE A NEW USER ACCOUNT FOR AN EMPLOYEE WITH DESIGNATED COMPANY, BRANCH, AND ROLE.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSignup} className="p-6 space-y-4 bg-card">
            {/* Row 1: Company Entity & Full Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#942392]" />
                  COMPANY ENTITY <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={String(signupCompanyId)}
                  onValueChange={(val) => {
                    const cId = Number(val);
                    setSignupCompanyId(cId);
                    void fetchModalDataForCompany(cId);
                  }}
                >
                  <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs text-foreground">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs font-bold">
                        {c.company_name} {c.id === 1 ? '(HQ)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  FULL NAME <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold uppercase placeholder:normal-case"
                  placeholder="e.g. AHMAD ALBAB"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            {/* Row 2: ID Card (IC) Number & Phone Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-ic" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  ID CARD (IC) NUMBER
                </Label>
                <Input
                  id="signup-ic"
                  type="text"
                  maxLength={14}
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-mono font-bold"
                  placeholder="e.g. 900101-14-5678"
                  value={signupIc}
                  onChange={(e) => setSignupIc(formatMyKad(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-phone" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  PHONE NUMBER
                </Label>
                <Input
                  id="signup-phone"
                  type="text"
                  maxLength={13}
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-mono font-bold"
                  placeholder="e.g. 012-3456789"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(formatMalaysianPhone(e.target.value))}
                />
              </div>
            </div>

            {/* Real-time Dynamic Info Bar from IC */}
            {signupIc && (
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl flex items-center justify-between flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">DATE OF BIRTH:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{parsedSignupIc.formattedDob || "Calculating..."}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">AGE:</span>
                  <span className="font-black text-[#942392]">{parsedSignupIc.age !== null ? `${parsedSignupIc.age} years old` : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#942392]">GENDER:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white dark:bg-purple-900 border border-purple-200 text-[#942392] dark:text-purple-200">
                    {parsedSignupIc.gender || "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Row 3: 4 Columns: Date of Join, Branch Assignment, Department, Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  DATE OF JOIN
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold text-foreground text-left shadow-xs hover:bg-muted/50"
                    >
                      <span>
                        {signupJoinDate
                          ? new Date(signupJoinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
                          : 'SELECT DATE'}
                      </span>
                      <CalendarDays className="w-4 h-4 text-foreground/60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden z-[80]" align="start">
                    <Calendar
                      mode="single"
                      selected={signupJoinDate ? new Date(signupJoinDate) : new Date()}
                      onSelect={(d) => {
                        if (d) {
                          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                          setSignupJoinDate(localIso);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-branch" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  BRANCH ASSIGNMENT <span className="text-rose-500">*</span>
                </Label>
                <Select value={signupBranch} onValueChange={setSignupBranch} disabled={loadingModalData}>
                  <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                    <SelectValue placeholder={loadingModalData ? 'Loading...' : 'Select Branch'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {modalBranches.map((b) => (
                      <SelectItem key={b.code} value={b.code} className="text-xs font-bold">
                        {b.code} - {toProperCase(b.name)}
                      </SelectItem>
                    ))}
                    {modalBranches.length === 0 && (
                      <SelectItem value="NO_BRANCH" disabled className="text-xs">
                        No branches found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-department" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  DEPARTMENT {modalDepartments.length > 0 && <span className="text-slate-400 font-normal normal-case">(Optional)</span>}
                </Label>
                {modalDepartments.length > 0 ? (
                  <Select value={signupDepartment} onValueChange={setSignupDepartment} disabled={loadingModalData}>
                    <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="NONE" className="text-xs font-bold text-muted-foreground">
                        No Department / General
                      </SelectItem>
                      {modalDepartments.map((d) => {
                        const dName = d.name || d.department_name || d;
                        return (
                          <SelectItem key={dName} value={dName} className="text-xs font-bold">
                            {toProperCase(dName)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-11 px-4 rounded-xl border border-input/60 bg-muted/40 flex items-center justify-between text-xs font-bold text-muted-foreground cursor-not-allowed select-none">
                    <span>No Department</span>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                      Single Branch Entity
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-role" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  ROLE <span className="text-rose-500">*</span>
                </Label>
                <Select value={signupRole} onValueChange={setSignupRole} disabled={loadingModalData}>
                  <SelectTrigger className="h-11 px-4 rounded-xl border border-input bg-background/50 text-xs font-bold shadow-xs">
                    <SelectValue placeholder={loadingModalData ? 'Loading...' : 'Select Role'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Available Roles
                      </SelectLabel>
                      {modalRoles
                        .filter((r) => r.status === 'Active')
                        .map((r) => (
                          <SelectItem key={r.id} value={r.name} className="text-xs font-bold">
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Official Email Address & Initial Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  OFFICIAL EMAIL ADDRESS <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold"
                  placeholder="ahmad@rayhar.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  INITIAL PASSWORD <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="h-11 px-4 bg-background/50 border border-border/80 focus:border-[#942392] focus:ring-2 focus:ring-[#942392]/10 rounded-xl text-xs font-bold pr-10"
                    placeholder="Min. 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="p-0 pt-4 flex items-center justify-end gap-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 px-6 rounded-xl bg-[#942392] hover:bg-[#800A7A] text-white shadow-md text-xs font-black uppercase tracking-wider flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating User...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>CREATE USER</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
