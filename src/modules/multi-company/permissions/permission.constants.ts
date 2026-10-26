export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
  description: string;
}

export const PERMISSION_MODULES: Record<string, PermissionDefinition[]> = {
  'Employee Management': [
    { key: 'employees.view', label: 'View Employee Profiles', module: 'Employee Management', description: 'Can view employee list and directories' },
    { key: 'employees.create', label: 'Onboard New Employees', module: 'Employee Management', description: 'Can register and onboard staff' },
    { key: 'employees.edit', label: 'Edit Employee Records', module: 'Employee Management', description: 'Can edit employee personal & employment data' },
    { key: 'employees.delete', label: 'Deactivate / Delete Employees', module: 'Employee Management', description: 'Can remove or mark employees as resigned' },
    { key: 'employees.transfer', label: 'Transfer Company', module: 'Employee Management', description: 'Can transfer staff between subsidiaries' }
  ],
  'Attendance & Clocking': [
    { key: 'attendance.view_own', label: 'View Own Attendance', module: 'Attendance & Clocking', description: 'Can view personal check-in logs' },
    { key: 'attendance.view_branch', label: 'View Branch Attendance', module: 'Attendance & Clocking', description: 'Can view branch attendance roster' },
    { key: 'attendance.view_all', label: 'View All Company Attendance', module: 'Attendance & Clocking', description: 'Full access to all attendance logs' },
    { key: 'attendance.manage_issues', label: 'Manage Attendance Issues', module: 'Attendance & Clocking', description: 'Can flag and adjust missing check-ins' },
    { key: 'attendance.approve_corrections', label: 'Approve Attendance Corrections', module: 'Attendance & Clocking', description: 'Can approve employee correction claims' }
  ],
  'Leave Management': [
    { key: 'leave.apply_own', label: 'Apply Own Leave', module: 'Leave Management', description: 'Can submit leave applications' },
    { key: 'leave.view_own', label: 'View Own Balance & Calendar', module: 'Leave Management', description: 'Can view own entitlement balances' },
    { key: 'leave.endorse', label: 'Endorse / Review Team Leave', module: 'Leave Management', description: 'Step 1 team endorsement' },
    { key: 'leave.approve', label: 'Final Leave Approval', module: 'Leave Management', description: 'Can grant final leave approval' },
    { key: 'leave.manage_all', label: 'Manage Leave Entitlements', module: 'Leave Management', description: 'Can adjust leave balances and policies' }
  ],
  'Branch & Geofence': [
    { key: 'branch.view', label: 'View Branch Information', module: 'Branch & Geofence', description: 'Can view branch locations and pins' },
    { key: 'branch.manage', label: 'Manage Branches & Geofence Radius', module: 'Branch & Geofence', description: 'Can create branches and configure radius' }
  ],
  'Reports & Analytics': [
    { key: 'reports.view_branch', label: 'View Branch Reports', module: 'Reports & Analytics', description: 'Can view branch level reports' },
    { key: 'reports.view_all', label: 'View Company Analytics', module: 'Reports & Analytics', description: 'Can access executive analytics dashboards' },
    { key: 'reports.export', label: 'Export PDF & CSV Data', module: 'Reports & Analytics', description: 'Can download formal data exports' }
  ],
  'System Administration': [
    { key: 'settings.view', label: 'View System Settings', module: 'System Administration', description: 'Can view system configurations' },
    { key: 'settings.manage_company', label: 'Manage Companies & Branding', module: 'System Administration', description: 'Can create and configure companies' },
    { key: 'settings.manage_roles', label: 'Manage Roles & IAM', module: 'System Administration', description: 'Can manage role definitions and permissions' }
  ]
};
