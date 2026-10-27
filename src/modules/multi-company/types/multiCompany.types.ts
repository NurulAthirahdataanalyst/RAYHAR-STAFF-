export type CompanyType = 'main' | 'subsidiary';

export interface Company {
  id: number;
  parent_company_id?: number | null;
  parent_company_name?: string | null;
  company_name: string;
  company_type: CompanyType;
  company_address: string;
  email: string;
  logo_url?: string | null;
  status: 'active' | 'inactive';
  active_employees_count?: number;
  branches_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GeofenceSetting {
  id: number;
  mode: 'normal' | 'night_shift' | 'temporary' | 'emergency';
  radius_meter: number;
  active_from?: string | null;
  active_until?: string | null;
  is_active: boolean;
}

export interface CompanyBranch {
  code: string;
  name: string;
  branch?: string;
  location?: string;
  operating_zone: string;
  latitude: number;
  longitude: number;
  radius: number;
  company_id: number;
  status?: string;
  geofence_settings?: GeofenceSetting[];
}

export interface CompanyDepartment {
  id: number;
  name: string;
  code?: string | null;
  company_id?: number | null;
  employee_count?: number;
}

export type RoleType = 'Management Role' | 'Department Role' | 'Operational Role' | 'Employee Role';
export type ScopeType = 
  | 'Own Data Only' 
  | 'Branch Data Only' 
  | 'Company Staff Data' 
  | 'Parent Group Data' 
  | 'Current Company Only' 
  | 'Parent Group Access';

export interface CompanyRole {
  id: string; // uuid
  company_id: number;
  name: string;
  description?: string;
  role_type?: RoleType;
  scope_type?: ScopeType;
  status: 'Active' | 'Inactive';
  is_system_role?: boolean;
  total_users?: number;
  permission_keys?: string[];
  permission_levels?: Record<string, 'view' | 'edit'>;
  permissions_detail?: ModulePermission[];
  created_at?: string;
}

export interface ModulePermission {
  id: number;
  permission_key: string;
  display_name: string;
  module: string;
  access_level?: 'view' | 'edit';
}

export interface ModuleDefinition {
  id: number;
  module_key: string;
  module_name: string;
  description: string;
  icon_name: string;
  sort_order: number;
  status: string;
  features_count?: number;
  permissions?: ModulePermission[];
  enabled_permissions?: string[];
  permission_levels?: Record<string, 'view' | 'edit'>;
}

export interface CompanyModuleSetting {
  module_id?: number;
  module_key: string;
  module_name: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_enabled: boolean;
  updated_at?: string;
  updated_by?: string;
  features_count?: number;
  permissions?: ModulePermission[];
  enabled_permissions?: string[];
  permission_levels?: Record<string, 'view' | 'edit'>;
}

export interface RoleTemplate {
  id: number;
  template_name: string;
  display_name: string;
  description?: string;
  role_type: RoleType;
  default_permissions: string[];
}

export interface UserCompanyRole {
  id: number;
  user_id: string;
  company_id: number;
  company_name: string;
  company_type: CompanyType;
  logo_url?: string | null;
  role_id: string;
  role_name: string;
  role_type?: RoleType;
  scope_type?: ScopeType;
  branch_id?: string;
  branch_name?: string;
  department_id?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
}

export interface WorkScheduleDay {
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
}

export interface BreakSchedule {
  id?: number;
  break_name: string;
  break_type: 'lunch' | 'prayer' | 'custom';
  start_time: string;
  end_time: string;
}

export interface WorkSchedule {
  id: number;
  company_id: number;
  schedule_name: string;
  operating_zone?: string | null;
  department_id?: string | null;
  branch_id?: string | null;
  branch_ids?: string[];
  special_rules?: string[];
  effective_date: string;
  status: 'active' | 'inactive';
  days?: WorkScheduleDay[];
  breaks?: BreakSchedule[];
}

export interface AttendanceSettings {
  id?: number;
  company_id: number;
  late_threshold_minutes: number;
  early_checkout_minutes: number;
  min_working_hours: number;
  overtime_enabled: boolean;
  gps_required: boolean;
  geofence_enforcement: 'strict' | 'relaxed' | 'disabled';
  face_verification_required: boolean;
  calculation_rule_version?: number;
}

export interface LeaveTypeSetting {
  id?: number;
  company_id: number;
  leave_type: string;
  default_entitlement_days: number;
  escalate_to_parent: boolean;
  mc_required: boolean;
}

export type WorkflowBranchScope = 'HQ' | 'OTHER_BRANCHES' | 'ALL';

export interface ApprovalWorkflowStep {
  id?: number;
  company_id: number;
  module: 'leave' | 'attendance_correction' | 'outstation' | 'overtime';
  branch_scope?: WorkflowBranchScope;
  step_order: number;
  approver_role_id: string;
  approver_role_name?: string;
  step_label: string;
  routing_rule?: string;
  auto_escalate_hours?: number;
}

export interface EmployeeTransferRecord {
  id: number;
  employee_id: string;
  previous_company: string;
  new_company: string;
  previous_role?: string;
  new_role?: string;
  previous_branch?: string;
  new_branch?: string;
  previous_department?: string;
  new_department?: string;
  effective_date: string;
  reason: string;
  approved_by?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  operator_id?: string;
  operator_name: string;
  operator_role?: string;
  company_id?: number | null;
  company_name?: string | null;
  action_category: string;
  action_description: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
