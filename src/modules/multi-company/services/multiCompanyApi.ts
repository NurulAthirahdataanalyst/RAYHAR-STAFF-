import { API_BASE_URL } from '@/config/api';
import { 
  Company, 
  CompanyBranch, 
  CompanyDepartment, 
  CompanyRole, 
  RoleTemplate, 
  WorkSchedule, 
  AttendanceSettings, 
  LeaveTypeSetting, 
  ApprovalWorkflowStep, 
  UserCompanyRole,
  EmployeeTransferRecord,
  AuditLogItem,
  ModuleDefinition,
  CompanyModuleSetting
} from '../types/multiCompany.types';

export const multiCompanyApi = {
  // Companies
  async getCompanies(): Promise<Company[]> {
    const res = await fetch(`${API_BASE_URL}/api/companies`);
    const data = await res.json();
    return data.success ? data.companies : [];
  },

  async getCompany(id: number): Promise<Company | null> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${id}`);
    const data = await res.json();
    return data.success ? data.company : null;
  },

  async createCompany(payload: Partial<Company>): Promise<Company> {
    const res = await fetch(`${API_BASE_URL}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create company');
    return data.company;
  },

  async updateCompany(id: number, payload: Partial<Company>): Promise<Company> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update company');
    return data.company;
  },

  async uploadLogo(id: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${API_BASE_URL}/api/companies/${id}/logo`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to upload logo');
    return data.logo_url;
  },

  async resetLogo(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${id}/logo`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset logo');
  },

  // Company Module Management
  async getModules(): Promise<ModuleDefinition[]> {
    const res = await fetch(`${API_BASE_URL}/api/modules`);
    const data = await res.json();
    return data.success ? data.modules : [];
  },

  async getCompanyModules(companyId: number): Promise<{ modules: CompanyModuleSetting[]; enabled_module_keys: string[] }> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/modules`);
    const data = await res.json();
    return {
      modules: data.success ? data.modules : [],
      enabled_module_keys: data.success ? data.enabled_module_keys : []
    };
  },

  async saveCompanyModules(
    companyId: number, 
    modules: Array<{ module_key: string; is_enabled: boolean }>,
    operatorName?: string
  ): Promise<{ modules: CompanyModuleSetting[]; enabled_module_keys: string[] }> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules, operator_name: operatorName })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save company module configuration');
    return {
      modules: data.modules || [],
      enabled_module_keys: data.enabled_module_keys || []
    };
  },

  // Branches & Geofence
  async getCompanyBranches(companyId: number): Promise<CompanyBranch[]> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/branches`);
    const data = await res.json();
    return data.success ? data.branches : [];
  },

  async createCompanyBranch(companyId: number, branch: Partial<CompanyBranch>): Promise<CompanyBranch> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register branch');
    return data.branch;
  },

  async updateBranch(code: string, branch: Partial<CompanyBranch>): Promise<CompanyBranch> {
    const res = await fetch(`${API_BASE_URL}/api/branches/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update branch');
    return data.branch;
  },

  async setBranchGeofenceMode(code: string, payload: { mode: string; radius_meter: number; active_from?: string; active_until?: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/branches/${encodeURIComponent(code)}/geofence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to set geofence mode');
    return data.geofence;
  },

  // Departments
  async getCompanyDepartments(companyId: number): Promise<CompanyDepartment[]> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/departments`);
    const data = await res.json();
    return data.success ? data.departments : [];
  },

  async createCompanyDepartment(companyId: number, name: string, code?: string): Promise<CompanyDepartment> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create department');
    return data.department;
  },

  // Roles & IAM
  async getCompanyRoles(companyId: number): Promise<CompanyRole[]> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/roles`);
    const data = await res.json();
    return data.success ? data.roles : [];
  },

  async getRoleTemplates(): Promise<RoleTemplate[]> {
    const res = await fetch(`${API_BASE_URL}/api/role-templates`);
    const data = await res.json();
    return data.success ? data.templates : [];
  },

  async createCompanyRole(companyId: number, roleData: any): Promise<CompanyRole> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create role');
    return data.role;
  },

  async updateRole(id: string, roleData: any): Promise<CompanyRole> {
    const res = await fetch(`${API_BASE_URL}/api/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update role');
    return data.role;
  },

  async deleteRole(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/roles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete role');
  },

  // Work Schedules
  async getCompanyWorkSchedules(companyId: number): Promise<WorkSchedule[]> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/work-schedules`);
    const data = await res.json();
    return data.success ? data.schedules : [];
  },

  async createWorkSchedule(companyId: number, scheduleData: any): Promise<WorkSchedule> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/work-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create schedule');
    return data.schedule;
  },

  async updateWorkSchedule(companyId: number, scheduleId: number, scheduleData: any): Promise<WorkSchedule> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/work-schedules/${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update schedule');
    return data.schedule;
  },

  // Attendance Settings
  async getAttendanceSettings(companyId: number): Promise<AttendanceSettings | null> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/attendance-settings`);
    const data = await res.json();
    return data.success ? data.settings : null;
  },

  async saveAttendanceSettings(companyId: number, settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/attendance-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save attendance settings');
    return data.settings;
  },

  // Leave & Workflow
  async getLeaveSettings(companyId: number): Promise<{ leave_types: LeaveTypeSetting[]; approval_workflow: ApprovalWorkflowStep[] }> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/leave-settings`);
    const data = await res.json();
    return {
      leave_types: data.success ? data.leave_types : [],
      approval_workflow: data.success ? data.approval_workflow : []
    };
  },

  async saveApprovalWorkflow(companyId: number, steps: Partial<ApprovalWorkflowStep>[]): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}/approval-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save workflow');
  },

  // Employee Assignment & Transfer
  async getUserCompanies(userId: string): Promise<UserCompanyRole[]> {
    const res = await fetch(`${API_BASE_URL}/api/employees/${userId}/companies`);
    const data = await res.json();
    return data.success ? data.user_companies : [];
  },

  async transferEmployee(payload: { employee_id: string; new_company_id: number; new_role_id?: string; new_branch_id?: string; new_department_id?: string; reason?: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/employees/transfer-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to transfer employee');
  },

  async getEmployeeTransferHistory(employeeId: string): Promise<EmployeeTransferRecord[]> {
    const res = await fetch(`${API_BASE_URL}/api/employees/${employeeId}/company-history`);
    const data = await res.json();
    return data.success ? data.history : [];
  },

  async getAllTransferHistory(limit = 200): Promise<EmployeeTransferRecord[]> {
    const res = await fetch(`${API_BASE_URL}/api/employee-company-history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.success ? data.history : [];
  },

  // Audit Logs
  async getAuditLogs(companyId?: number, limit = 100): Promise<AuditLogItem[]> {
    const query = new URLSearchParams();
    if (companyId) query.set('company_id', companyId.toString());
    query.set('limit', limit.toString());
    const res = await fetch(`${API_BASE_URL}/api/audit-logs?${query.toString()}`);
    const data = await res.json();
    return data.success ? data.audit_logs : [];
  }
};
