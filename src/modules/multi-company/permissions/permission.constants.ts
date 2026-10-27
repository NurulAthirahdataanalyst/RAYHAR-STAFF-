export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
  description: string;
}

export const PERMISSION_MODULES: Record<string, PermissionDefinition[]> = {
  'Dashboard': [
    { key: 'dashboard.view', label: 'Dashboard View', module: 'Dashboard', description: 'Executive dashboard overview and real-time operations' }
  ],
  'Calendar': [
    { key: 'calendar.work', label: 'Work Calendar', module: 'Calendar', description: 'Official working days, shifts, and rosters' },
    { key: 'calendar.company_leave', label: 'Company Leave Calendar', module: 'Calendar', description: 'Company gazetted and statutory holiday schedule' }
  ],
  'Attendance': [
    { key: 'attendance.my', label: 'My Attendance', module: 'Attendance', description: 'Personal clock-in, timesheets, and attendance logs' },
    { key: 'attendance.team', label: 'Team Attendance', module: 'Attendance', description: 'Department and branch personnel clock-in roster' }
  ],
  'Leave Management': [
    { key: 'leave.apply', label: 'Leave Application', module: 'Leave Management', description: 'Submit employee leave requests' },
    { key: 'leave.my_requests', label: 'My Leave Requests', module: 'Leave Management', description: 'View personal submitted leave history and status' }
  ],
  'Leave Administration': [
    { key: 'leave.approval', label: 'Leave Approval', module: 'Leave Administration', description: 'Endorse and grant final approval for staff leave requests' },
    { key: 'leave.team_requests', label: 'Team Leave Requests', module: 'Leave Administration', description: 'Inspect branch and department leave applications' },
    { key: 'leave.calendar', label: 'Leave Calendar', module: 'Leave Administration', description: 'Organization-wide staff leave schedule' },
    { key: 'leave.entitlement', label: 'Leave Entitlement Management', module: 'Leave Administration', description: 'Configure annual leave balances, quotas, and policies' }
  ],
  'Organization & Entities': [
    { key: 'organization.entities', label: 'Corporate Entities', module: 'Organization & Entities', description: 'Manage corporate entities, subsidiaries, and branding' },
    { key: 'organization.modules', label: 'Company Modules', module: 'Organization & Entities', description: 'Configure module and submodule availability per entity' },
    { key: 'organization.roles', label: 'Company Roles & RBAC', module: 'Organization & Entities', description: 'Manage multi-tenant role definitions and granular access' },
    { key: 'organization.transfer', label: 'Employee Transfer Wizard', module: 'Organization & Entities', description: 'Relocate and assign staff across company entities' },
    { key: 'organization.history', label: 'Transfer Career History', module: 'Organization & Entities', description: 'Audit trail and ledger of inter-company employee transfers' },
    { key: 'organization.branches', label: 'Branches & Geofence', module: 'Organization & Entities', description: 'Configure branch GPS coordinates and geofence radius' },
    { key: 'organization.departments', label: 'Departments', module: 'Organization & Entities', description: 'Manage department structures and organizational units' }
  ],
  'Employee Management': [
    { key: 'employee.directory', label: 'Employee Directory', module: 'Employee Management', description: 'View and manage employee personnel records' },
    { key: 'employee.department', label: 'Department Management', module: 'Employee Management', description: 'Manage company departments and teams' },
    { key: 'employee.role', label: 'Role Management', module: 'Employee Management', description: 'System-wide role definition and permissions' },
    { key: 'employee.branch', label: 'Branch Management', module: 'Employee Management', description: 'Branch location oversight and assignment' },
    { key: 'employee.temporary_assignment', label: 'Temporary Assignment', module: 'Employee Management', description: 'Temporary branch deployments and duties' }
  ],
  'Outstation': [
    { key: 'outstation.my', label: 'My Outstation', module: 'Outstation', description: 'Personal travel requests and assignment logs' },
    { key: 'outstation.my_calendar', label: 'My Outstation Calendar', module: 'Outstation', description: 'Personal outstation schedule' },
    { key: 'outstation.dashboard', label: 'Outstation Dashboard', module: 'Outstation', description: 'Executive operational travel overview' },
    { key: 'outstation.assignment', label: 'Outstation Assignment', module: 'Outstation', description: 'Assign travel tasks and outstation deployments' },
    { key: 'outstation.analytics', label: 'Outstation Analytics', module: 'Outstation', description: 'Travel frequency and cost analytics' },
    { key: 'outstation.calendar', label: 'Outstation Calendar', module: 'Outstation', description: 'Company-wide outstation movement schedule' }
  ],
  'Analytics': [
    { key: 'analytics.attendance', label: 'Attendance Dashboard', module: 'Analytics', description: 'Clock-in trends, punctuality, and tardiness metrics' },
    { key: 'analytics.leave', label: 'Leave Analytics', module: 'Analytics', description: 'Leave utilization and absence trends' },
    { key: 'analytics.workforce', label: 'Workforce Insights', module: 'Analytics', description: 'Staffing metrics, headcount, and turnover overview' },
    { key: 'analytics.workforce_calendar', label: 'Workforce Calendar', module: 'Analytics', description: 'Comprehensive workforce availability timeline' }
  ],
  'Reports': [
    { key: 'report.attendance', label: 'Attendance Reports', module: 'Reports', description: 'Exportable monthly and weekly attendance logs' },
    { key: 'report.leave', label: 'Leave Reports', module: 'Reports', description: 'Exportable staff leave utilization reports' },
    { key: 'report.outstation', label: 'Outstation Reports', module: 'Reports', description: 'Travel expense and deployment reports' },
    { key: 'report.department', label: 'Department & Branch Report', module: 'Reports', description: 'Branch and departmental performance summaries' }
  ],
  'GPS': [
    { key: 'gps.tracker', label: 'GPS Location Tracker', module: 'GPS', description: 'Overview map of personnel GPS locations' },
    { key: 'gps.live_tracker', label: 'Live Tracker', module: 'GPS', description: 'Real-time GPS coordinates and clock-in radius distance' },
    { key: 'gps.location_history', label: 'Location History', module: 'GPS', description: 'Historical breadcrumbs and GPS movement history' }
  ],
  'Settings': [
    { key: 'settings.manage', label: 'Settings', module: 'Settings', description: 'Full system configuration and corporate settings' }
  ]
};
