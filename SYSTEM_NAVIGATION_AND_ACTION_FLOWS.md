# Rayhar Group Attendance & Workforce System
## Comprehensive System Navigation & Action Flows Guide (Master Manual)

This document is the definitive master manual explaining **where, how, and with which role permissions** all core actions are performed in the Rayhar Group Multi-Company Workforce Management & Attendance System.

---

## 📑 Table of Contents
1. [Role-Based Access Hierarchy & Navigation Architecture](#1-role-based-access-hierarchy--navigation-architecture)
2. [Master Staff Onboarding & Creation Flows (3 Entry Points)](#2-master-staff-onboarding--creation-flows-where-to-add-new-staff)
   - [Entry Point A: Settings Hub → Tab 2: Personnel Management](#entry-point-a-settings-page--tab-2-personnel-management-tab)
   - [Entry Point B: Employee Directory → Add Staff Modal](#entry-point-b-employee-directory-page--add-staff-modal)
   - [Entry Point C: Organization & Entities → Personnel Entity](#entry-point-c-organization--entities--personnel-entity-page)
   - [Comparative Summary & Decision Matrix](#comparative-summary--decision-matrix-for-adding-staff)
   - [Smart Malaysian MyKad (NRIC) Auto-Parsing Feature](#smart-malaysian-mykad-nric-auto-parsing-feature)
3. [Outstation Management & Assignment Flows](#3-outstation-management--assignment-flows)
   - [Assigning Staff to Outstations (Admin / Supervisor)](#assigning-staff-to-outstations-admin--supervisor)
   - [Employee Outstation Self-Service Application](#employee-outstation-self-service-application)
   - [Outstation Tracking, Analytics & Global Calendar](#outstation-tracking-analytics--global-calendar)
4. [Leave Management & Multi-Tier Approval Flows](#4-leave-management--multi-tier-approval-flows)
   - [Employee Leave Application & Quotas](#employee-leave-application--quotas)
   - [Tier 1 & Tier 2: Supervisor Approval (Team Leave Requests)](#tier-1--tier-2-supervisor-approval-team-leave-requests)
   - [Tier 3: Executive & Central HR Approval (Leave Approval Hub)](#tier-3-executive--central-hr-approval-leave-approval-hub)
   - [Configuring Multi-Tier Approval Sequences & Policies](#configuring-multi-tier-approval-sequences--leave-policies)
   - [Manual Leave Entitlement & Balance Adjustments](#manual-leave-entitlement--balance-adjustments)
5. [Attendance Policies & Late Window Grace Time Configuration](#5-attendance-policies--late-window-grace-time-configuration)
   - [Late Threshold & Grace Window Setup](#late-threshold--grace-window-setup)
   - [Geofence Enforcement & Clock-In Policies](#geofence-enforcement--clock-in-policies)
   - [Real-Time Policy Calculation Simulator](#real-time-policy-calculation-simulator)
6. [Work Schedules Configuration (By Company & Branch)](#6-work-schedules-configuration-by-company--branch)
   - [Setting Work Schedules Based on Company Entity & Branch Location](#setting-work-schedules-based-on-company-entity--branch-location)
   - [Zone Modes (Zone A vs Zone B Weekend Rules)](#zone-modes-zone-a-vs-zone-b-weekend-rules)
   - [7-Day Working Hours, Core Shifts & Break Hours](#7-day-working-hours-core-shifts--break-hours)
7. [Branch Deployments & Temporary Assignments](#7-branch-deployments--temporary-assignments)
   - [Assigning Temporary Branch Duties](#assigning-temporary-branch-duties)
   - [Automatic Geofence Switching Mechanism](#automatic-geofence-switching-mechanism)
8. [Multi-Company Structure, Branches & Transfer Wizard](#8-multi-company-structure-branches--transfer-wizard)
   - [8.1 New Subsidiary Setup Lifecycle (From Entity Creation to Fully Operational Data)](#81-new-subsidiary-setup-lifecycle-from-entity-creation-to-fully-operational-data)
   - [8.2 Branch Management & Map-Based Geofencing](#82-branch-management--map-based-geofencing)
   - [8.3 Department Structure Management](#83-department-structure-management)
   - [8.4 Company Transfer Wizard & Career History Ledger](#84-company-transfer-wizard--career-history-ledger)
9. [Role-Based Access Control (RBAC) & Master Permission Matrix](#9-role-based-access-control-rbac--master-permission-matrix)
10. [Detailed Page Functionality Breakdown by Role (View vs. Create / Edit / Delete / Approve)](#10-detailed-page-functionality-breakdown-by-role-view-vs-create--edit--delete--approve)
    - [10.1 Company Leave Calendar (/calendar/company-leave)](#101-company-leave-calendar-calendarcompany-leave)
    - [10.2 Work Calendar (/calendar)](#102-work-calendar-calendar)
    - [10.3 Attendance & Team Attendance (/attendance, /team-attendance)](#103-attendance--team-attendance-attendance-team-attendance)
    - [10.4 Leave Management & Approvals (/leave/apply, /leave/team, /leave/admin, /leave/entitlement)](#104-leave-management--approvals-leaveapply-leaveteam-leaveadmin-leaveentitlement)
    - [10.5 Outstation Management (/outstation/my, /outstation/assignment, /outstation/calendar)](#105-outstation-management-outstationmy-outstationassignment-outstationcalendar)
    - [10.6 Employee Directory (/employees)](#106-employee-directory-employees)
    - [10.7 Branch Management & Temporary Assignments (/branches, /branches/temporary-assignments)](#107-branch-management--temporary-assignments-branches-branchestemporary-assignments)
    - [10.8 Settings Hub & Multi-Company Configuration (/settings, /organization/...)](#108-settings-hub--multi-company-configuration-settings-organization)
    - [10.9 Workforce Analytics & Reports (/hr-analytics/..., /reports/...)](#109-workforce-analytics--reports-hr-analytics-reports)
    - [10.10 GPS Location Tracker (/gps-location-tracker)](#1010-gps-location-tracker-gps-location-tracker)
    - [10.11 Master Capability Matrix by Role (Summary Table)](#1011-master-capability-matrix-by-role-summary-table)

---

## 1. Role-Based Access Hierarchy & Navigation Architecture

The system enforces dynamic Role-Based Access Control (RBAC) across multi-tenant corporate entities:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ROLE ACCESS TIERS                                 │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ Tier 1: Employees     │ • employee                                           │
│                       │ • branch_officer                                     │
├───────────────────────┼──────────────────────────────────────────────────────┤
│ Tier 2: Supervisors   │ • branch_leader (Branch-level authority)             │
│                       │ • head_of_department / hod (Dept-level authority)   │
├───────────────────────┼──────────────────────────────────────────────────────┤
│ Tier 3: Management    │ • operation_manager                                  │
│                       │ • finance_manager                                    │
│                       │ • managing_director (Executive authority)            │
├───────────────────────┼──────────────────────────────────────────────────────┤
│ System Administrator  │ • hr_admin (Global Administration & Master Config)   │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Master Staff Onboarding & Creation Flows (Where to Add New Staff)

In this system, adding a staff member can be done from **three distinct locations**, each tailored to a specific operational workflow:

```
                        ┌──────────────────────────────────────────────┐
                        │       3 WAYS TO ADD A NEW STAFF MEMBER       │
                        └──────────────────────┬───────────────────────┘
                                               │
         ┌─────────────────────────────────────┼─────────────────────────────────────┐
         ▼                                     ▼                                     ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
│       ENTRY POINT A          │ │       ENTRY POINT B          │ │       ENTRY POINT C          │
│ Settings Hub → Tab 2:        │ │ Employee Directory           │ │ Organization & Entities      │
│ "Personnel Management"       │ │ "Add Staff" Modal Dialog     │ │ "Personnel Entity" Page      │
│ (/settings?tab=employee)     │ │ (/employees)                 │ │ (/organization/personnel)    │
├──────────────────────────────┤ ├──────────────────────────────┤ ├──────────────────────────────┤
│ Best for: Full HR Onboarding │ │ Best for: Fast Directory     │ │ Best for: Multi-Company      │
│ with IC auto-calc, transfer  │ │ registration directly within │ │ Corporate Entity management  │
│ wizards, and career ledger.  │ │ the master staff table view. │ │ & cross-entity assignments.  │
└──────────────────────────────┘ └──────────────────────────────┘ └──────────────────────────────┘
```

---

### Entry Point A: Settings Page → Tab 2: Personnel Management Tab

* **Page Route:** `/settings?tab=employee`
* **Navigation Path:** Sidebar Menu → **Settings** → Left Tab Panel: **2. PERSONNEL MANAGEMENT**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab2_EmployeeConfig.tsx`

#### Layout & Capabilities:
This is the most comprehensive HR Onboarding workspace in the system. It features **three internal sub-tabs**:
1. **Staff Onboarding (`onboard`):** Comprehensive registration form for new hires.
2. **Transfer Wizard (`transfer`):** Inter-company entity transfer engine (`CompanyTransferWizard`).
3. **Transfer History (`history`):** Complete corporate movement audit ledger (`EmployeeCompanyHistory`).

#### Step-by-Step Staff Creation Guide:
1. Navigate to `/settings?tab=employee`.
2. Ensure the **Staff Onboarding** sub-tab is active.
3. Fill in the **Personal & Identity Information**:
   * **Full Name (as per MyKad):** e.g., `AHMAD BIN ABDULLAH`
   * **MyKad / IC Number:** 12-digit Malaysian IC (e.g., `900512-11-5433` or raw digits).  
     *⚡ Real-time Smart Auto-Calculation:* As you type, the system instantly computes and displays:
       - **Date of Birth (DOB):** e.g., `12 May 1990`
       - **Calculated Age:** e.g., `34 years old`
       - **Biological Gender:** `Male` (odd last digit) or `Female` (even last digit)
   * **Contact Number:** Malaysian phone format (e.g., `012-3456789`).
   * **Joining Date:** Interactive date picker calendar.
4. Fill in **Login Credentials**:
   * **Company Email:** Serves as the primary login username (e.g., `ahmad@rayhar.com`).
   * **Account Password:** Secured input with visibility toggle (minimum 6 characters).
5. Configure **Corporate Placement & Organization**:
   * **Target Company Entity:** Select which entity the employee belongs to (e.g., *Rayhar Travels Sdn Bhd*, *RayRent Car Rental*).
   * **Branch Location:** Dynamically fetched based on the selected company (e.g., *HQ*, *Kemaman*, *Kuala Terengganu*, *Shah Alam*).
   * **Department:** Dynamically populated based on the selected company (e.g., *Human Resources*, *Operations*, *Ticketing & Visa*).
   * **Position / Designation:** Official designation title (e.g., *Senior Operations Officer*).
   * **System Access Role:** Select the RBAC role (`employee`, `branch_leader`, `head_of_department`, `branch_officer`, `operation_manager`, `hr_admin`).
   * **Employment Status:** Toggle between `Active`, `Probation`, or `Contract`.
6. Click **"Complete Onboarding"**:
   * The backend registers the user in Supabase Auth and creates the database personnel record.
   * On success, a toast confirmation appears, and the form resets ready for the next entry.

---

### Entry Point B: Employee Directory Page → Add Staff Modal

* **Page Route:** `/employees`
* **Navigation Path:** Sidebar Menu → **Employee Management** → **Employee Directory**
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager` (Branch Leaders have view-only access to their branch).
* **Source Component:** `src/pages/Employees.tsx` (Lines 304–430, 841–870)

#### Layout & Capabilities:
Integrated directly into the primary Employee Directory table. It allows administrators to quickly create a staff member without leaving their daily employee monitoring workflow.

#### Step-by-Step Staff Creation Guide:
1. Navigate to `/employees`.
2. In the top-right header action bar, click the **"+ Add Staff"** button.
3. The **"Add New Staff Member"** modal dialog appears.
4. Fill in the modal fields:
   * **Company Entity:** Select corporate entity from the dropdown.
   * **Full Name:** Full legal employee name.
   * **IC Number / MyKad:** With real-time Malaysian IC validation and badge previews (Age, Gender, DOB).
   * **Phone Number:** Contact number.
   * **Company Email:** Active login address.
   * **Password:** Login password (min 6 characters) with show/hide toggle.
   * **Branch Placement:** Automatically syncs with the chosen company's branches.
   * **Department:** Automatically syncs with the chosen company's departments.
   * **Role:** Select the system access role.
   * **Joining Date:** Selected via calendar popover.
5. Click **"Register Staff"** (or press Enter).
6. The modal closes, a success notification appears, and the table automatically refreshes, displaying the new staff member.

---

### Entry Point C: Organization & Entities → Personnel Entity Page

* **Page Route:** `/organization/personnel` (or `/organization/entities?tab=personnel`)
* **Navigation Path:** Sidebar Menu → **Organization & Entities** → **Personnel Entity**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/TabPersonnelEntity.tsx`

#### Layout & Capabilities:
Designed specifically for **Multi-Entity Governance**. It allows corporate executives and HR administrators to view and assign staff across multiple subsidiaries and group companies.

#### Step-by-Step Staff Creation Guide:
1. Navigate to `/organization/personnel`.
2. Use the top **Company Entity Selector** to switch between subsidiaries (e.g., *Rayhar Travels*, *Rayrent*, *Rayhar Holidays*).
3. The table lists all staff assigned to that specific entity.
4. Click the purple **"+ Add Staff"** button above the table.
5. The **"Add Staff to Entity"** dialog opens.
6. The Target Company is pre-locked to the currently selected company (can be changed if needed).
7. Enter Staff Name, IC Number, Email, Password, Branch, Department, Phone, Role, and Join Date.
8. Click **"Save Staff Member"**.
9. The personnel table updates immediately, and the staff member is linked to that company's organizational tree.

---

### Comparative Summary & Decision Matrix for Adding Staff

| Feature / Aspect | Entry Point A: Settings (Tab 2) | Entry Point B: Employee Directory | Entry Point C: Personnel Entity |
| :--- | :--- | :--- | :--- |
| **URL Route** | `/settings?tab=employee` | `/employees` | `/organization/personnel` |
| **Best Used For** | Formal HR onboarding, new hire batch processing, viewing transfer logs | Daily operational HR workflow, fast single employee setup | Multi-company entity allocation, group subsidiary governance |
| **Form Type** | Full-page comprehensive form | Pop-up modal dialog | Pop-up modal dialog with entity context |
| **Includes Transfer Wizard?** | ✅ Yes (Sub-tab 2) | ❌ No | ❌ Separate tab (`/organization/transfer`) |
| **Includes Career History?** | ✅ Yes (Sub-tab 3) | ❌ No | ❌ Separate tab (`/organization/history`) |
| **Smart MyKad Auto-Calc** | ✅ Yes (Live DOB, Age, Gender) | ✅ Yes (Live DOB, Age, Gender) | ✅ Yes (Live DOB, Age, Gender) |
| **Required Role** | `hr_admin`, `managing_director` | `hr_admin`, `managing_director`, `operation_manager` | `hr_admin`, `managing_director` |

---

### Smart Malaysian MyKad (NRIC) Auto-Parsing Feature

Across all three entry points, the system uses the internal `parseMyKad()` utility to automatically calculate:
1. **Date of Birth:** Extracted from the first 6 digits (`YYMMDD`). Correctly handles 20th and 21st century boundaries.
2. **Age:** Dynamically calculated against the current date.
3. **Gender:** Extracted from the 12th digit (`Odd = Male`, `Even = Female`).
4. **State of Birth:** Extracted from digits 7–8 (e.g., `11` = Terengganu, `03` = Kelantan, `10` = Selangor).

---

## 3. Outstation Management & Assignment Flows

Outstation deployments allow employees to perform work outside their home branch while automatically **overriding standard branch geofencing rules** for attendance clock-ins.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OUTSTATION WORKFLOW PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ADMIN / SUPERVISOR]                   [ASSIGNED EMPLOYEE]                 │
│  Navigate: /outstation/assignment       Navigate: /outstation/my            │
│          │                                      │                           │
│          ▼                                      ▼                           │
│  Fill Details:                          Notification Received               │
│  • Staff Member                         (Dashboard & Push Bell)             │
│  • Destination & Client                         │                           │
│  • Start / End Dates & Times                    ▼                           │
│  • Geofence Override status             Outstation Duty Starts:             │
│          │                              Can Clock-In via My Attendance      │
│          ▼                              without branch geofence boundary    │
│  Submit Assignment                              │                           │
│          │                                      ▼                           │
│          └─────────────────────────────► Live GPS Tracking & Reports        │
│                                          (/gps-location-tracker &           │
│                                           /outstation/reports)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Assigning Staff to Outstations (Admin / Supervisor)

* **Page Route:** `/outstation/assignment`
* **Navigation Path:** Sidebar Menu → **Outstation Management** → **Outstation Assignment**
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager`, `finance_manager`, `branch_leader`, `head_of_department`
* **Source Component:** `src/pages/outstation/OutstationAssignment.tsx`

#### Step-by-Step Assignment Guide:
1. Navigate to `/outstation/assignment`.
2. Click the **"+ New Assignment"** button in the header bar.
3. Complete the assignment form:
   * **Target Employee:** Search and select the employee. Their current branch and department are automatically displayed.
   * **Destination / City:** Address or destination city (e.g., *Makkah / Madinah*, *Kuala Lumpur Convention Centre*, *Singapore Expo*).
   * **Client / Host Company:** e.g., *Tabung Haji*, *MATTA Fair*, *Ministry of Tourism*.
   * **Assignment Purpose & Project:** e.g., *Umrah Group Leader Duty*, *Branch Audit Inspection*, *Sales Fair*.
   * **Travel Duration:**
     - **Start Date & Start Time** (interactive date and time picker).
     - **End Date & End Time**.
     - *Total Days:* Automatically calculated by the system.
   * **Geofence Exemption / Remote Clock-In:** Enabled by default, allowing the staff member to clock in from the outstation coordinates without triggering geofence violation alerts.
   * **Transport & Expense Claims Category:** Specify claimable meal or transport allowances.
4. Click **"Confirm & Dispatch Assignment"**.
5. The employee immediately receives an in-app notification and an active entry in their personal Outstation Calendar.

---

### Employee Outstation Self-Service Application

* **Page Route:** `/outstation/my`
* **Navigation Path:** Sidebar Menu → **Outstation Management** → **My Outstation**
* **Authorized Roles:** All Staff (`employee`, `branch_officer`, `branch_leader`, etc.)
* **Source Component:** `src/pages/outstation/MyOutstation.tsx`

#### Capabilities:
* **Apply for Outstation:** Staff can initiate their own outstation request if required by company policy.
* **Filter by Status:** Tabs for `Active`, `Upcoming`, and `Past` assignments.
* **Download Duty Letter:** Export official Outstation Travel Orders in PDF.

---

### Outstation Tracking, Analytics & Global Calendar

| Page | Route | Authorized Roles | Functionality |
| :--- | :--- | :--- | :--- |
| **Outstation Dashboard** | `/outstation` | Supervisors, Admins, Management | High-level metrics: total staff outstationed today, active missions by department. |
| **Outstation Calendar** | `/outstation/calendar` | Supervisors, Admins, Management | Company-wide Gantt timeline showing all concurrent travel schedules. |
| **My Outstation Calendar** | `/outstation/my-calendar` | All Staff | Personal visual schedule of upcoming outstation dates. |
| **Outstation Analytics** | `/outstation/analytics` | Management, HR Admin | Frequency of travel by branch, top destinations, monthly travel trends. |
| **Outstation Reports** | `/outstation/reports` | HR Admin, Management | CSV and PDF export for travel allowance and payroll claim verification. |

---

## 4. Leave Management & Multi-Tier Approval Flows

The leave system supports **5 distinct leave categories** with an automated **3-tier approval hierarchy** and mandatory document verification.

---

### Employee Leave Application & Quotas

* **Page Route:** `/leave/apply` (also accessible via Dashboard **"Apply Leave"** Quick Action)
* **Authorized Roles:** All Staff
* **Source Component:** `src/pages/LeaveManagement.tsx`

#### Supported Leave Categories:
1. **Annual Leave (AL):** Standard paid annual leave deducted from yearly entitlement.
2. **Medical / Sick Leave (MC):** Paid medical leave.  
   *⚠️ Rule Enforcement:* Requires mandatory upload of an official Medical Certificate (PDF, PNG, or JPG).
3. **Emergency Leave (EL):** Urgent unplanned leave; alerts supervisors immediately.
4. **Replacement Leave (Cuti Ganti):** Compensatory time off earned by working on rest days, public holidays, or approved overtime.
5. **Unpaid Leave (Cuti Tanpa Gaji):** Approved unpaid leave resulting in automatic payroll deduction.

#### Submission Steps:
1. Go to `/leave/apply`.
2. Choose **Leave Category**.
3. Select **Start Date** and **End Date** (or Half-Day AM/PM toggle).
4. Enter **Reason for Absence**.
5. If Medical Leave: Upload the clinic / hospital MC slip.
6. Click **"Submit Application"**. The system validates available quota before dispatching to the approval pipeline.

---

### Tier 1 & Tier 2: Supervisor Approval (Team Leave Requests)

* **Page Route:** `/leave/team`
* **Navigation Path:** Sidebar Menu → **Approval Center** (or **HR Administration**) → **Team Leave Requests**
* **Authorized Roles:** `branch_leader` (approves for their branch), `head_of_department` (approves for their department)
* **Source Component:** `src/pages/TeamLeaveRequests.tsx`

#### Supervisor Workflow:
1. Open `/leave/team`.
2. View pending requests submitted by direct subordinates.
3. Click a request to open the **Leave Inspection Modal**:
   * Inspect reason, dates, and remaining balance.
   * **MC Document Viewer:** Click to zoom, preview, or print the uploaded medical certificate.
   * **Approval History Timeline:** Inspect who has endorsed or reviewed the request previously.
4. Action:
   * Click **"Approve"**: Endorses the request. If the company workflow requires Tier 3 (Management/HR), status advances to `Pending Operation` or `Pending HR`. If Tier 1 is final, status becomes `Approved`.
   * Click **"Reject"**: Prompts for a mandatory rejection justification note and notifies the employee.

---

### Tier 3: Executive & Central HR Approval (Leave Approval Hub)

* **Page Route:** `/leave/admin`
* **Navigation Path:** Sidebar Menu → **HR Administration** → **Leave Approval**
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager`, `finance_manager`
* **Source Component:** `src/pages/LeaveAdmin.tsx`

#### Features & Batch Actions:
* **Company-Wide Queue:** Displays all pending leaves across all branches.
* **Stage Progression Tags:** Shows real-time stage badges:
  - `Pending Branch Leader`
  - `Pending Head of Department`
  - `Pending Operation Manager`
  - `Pending Managing Director`
  - `Approved` / `Rejected`
* **Batch Endorsement:** Select multiple records via checkboxes and click **"Approve Selected"**.
* **Exporting:** Export leave rosters to Excel/CSV or print formatted summaries for payroll.

---

### Configuring Multi-Tier Approval Sequences & Leave Policies

* **Page Route:** `/settings?tab=leave`
* **Navigation Path:** Sidebar Menu → **Settings** → **7. LEAVE & APPROVALS**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab8_LeaveWorkflowConfig.tsx`

#### Configuration Controls:
1. **Default Quotas per Company:**
   * Annual Leave Quota (e.g., `14` days).
   * Emergency Leave Quota (e.g., `5` days).
   * Replacement Leave Base Quota (e.g., `0` days, earned dynamically).
   * Medical / Sick Leave Quota (e.g., `14` days).
   * Unpaid Leave Maximum Cap (e.g., `30` days).
2. **Policy Switches:**
   * **Enforce Medical Certificate (MC) Slip Upload:** Toggles mandatory file attachment.
   * **Escalate to Main Company if Local Approver Unassigned:** Automatically bypasses empty branch leadership to HQ.
3. **Approval Sequence Builder (`ApprovalBuilder`):**
   * Drag-and-drop or configure the order of approvers per company (e.g., `Branch Leader → HOD → HR Admin`).

---

### Manual Leave Entitlement & Balance Adjustments

* **Page Route:** `/leave/entitlement` (or `/master/leave-entitlement`)
* **Navigation Path:** Sidebar Menu → **Leave Administration** → **Leave Entitlement Management**
* **Authorized Roles:** `hr_admin`
* **Source Component:** `src/pages/master/LeaveEntitlementManagement.tsx`

#### What HR Can Do:
* Search for any employee.
* View breakdown of Total, Taken, and Remaining days for each leave category.
* **Adjust Balance (+/-):** Add bonus days or deduct days manually with a compulsory audit remark (e.g., *"Cuti Ganti earned for working on Terengganu State Holiday"*).

---

## 5. Attendance Policies & Late Window Grace Time Configuration

* **Page Route:** `/settings?tab=attendance`
* **Navigation Path:** Sidebar Menu → **Settings** → **1. ATTENDANCE CONFIG**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab7_AttendanceConfig.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ATTENDANCE POLICY ENGINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Official Work Start: 08:30 AM]                                            │
│  ├── 08:00 AM - 08:30 AM ──► ON TIME (Early / Punctual)                     │
│  ├── 08:31 AM - 09:00 AM ──► GRACE PERIOD WINDOW (Late Threshold = 30 min)  │
│  │                            Flagged as Late, Warning Issued               │
│  └── After 09:00 AM ───────► SEVERE TARDINESS / HALF-DAY ABSENCE            │
│                                                                             │
│  [Geofence Enforcement Mode]                                                │
│  ├── STRICT   ──► Blocks clock-in completely if outside branch radius       │
│  ├── RELAXED  ──► Allows clock-in but flags geofence violation on report   │
│  └── DISABLED ──► Free clock-in from any coordinate                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Late Threshold & Grace Window Setup

1. Navigate to `/settings?tab=attendance`.
2. Select target **Company Entity**.
3. Configure the **Policy Parameters**:
   * **Late Threshold (Grace Period in Minutes):**  
     *Default: 30 minutes.* Defines how many minutes after the official schedule start time a clock-in is marked as **Late** before triggering disciplinary or half-day deductions.
   * **Early Checkout Tolerance (Minutes):**  
     Defines allowable minutes before the scheduled shift ends (e.g., 0 to 15 minutes).
   * **Minimum Working Hours (Hours):**  
     *Default: 8.0 hours.* Minimum daily productive hours required for full daily wage credit.
   * **Overtime (OT) Policy Toggle:**  
     Enables or disables automatic overtime credit for punch-outs after official hours.

---

### Geofence Enforcement & Clock-In Policies

* **Geofence Enforcement Mode:**
  - **Strict:** Mobile / web app blocks the clock-in button if the user is outside the branch radius.
  - **Relaxed:** Allows clock-in but logs a `GEOFENCE_VIOLATION` tag on HR reports.
  - **Disabled:** Disables distance checks (used for remote entities).
* **GPS Required Switch:** Enforces device GPS hardware check.
* **Face Verification Switch:** Enforces selfie photo capture upon clocking in.

---

### Real-Time Policy Calculation Simulator

At the bottom of `/settings?tab=attendance`, an interactive **Calculation Simulator** lets HR test hypothetical punch times:
1. Select a Work Schedule (e.g., `HQ Standard Shift 08:30 - 17:30`).
2. Input a test clock-in time (e.g., `08:45`).
3. Click **"Run Simulation"**:
   * System instantly outputs: `Status: LATE (+15 min)`, `Overtime: None`, `Compliance: PASS (Within Grace Window)`.

---

## 6. Work Schedules Configuration (By Company & Branch)

* **Page Route:** `/settings?tab=schedule`
* **Navigation Path:** Sidebar Menu → **Settings** → **6. WORK SCHEDULES**
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab6_WorkScheduleMgmt.tsx`

---

### Setting Work Schedules Based on Company Entity & Branch Location

Work hours vary between corporate subsidiaries and geographic branches (e.g., East Coast branches follow Friday-Saturday weekends, whereas West Coast branches follow Saturday-Sunday weekends).

#### Step-by-Step Schedule Creation:
1. Navigate to `/settings?tab=schedule`.
2. Select the **Company Entity**. Existing schedules for this entity are displayed.
3. Click the purple **"+ Create Work Schedule"** button.
4. In the Schedule Modal:
   * **Schedule Name:** e.g., `Terengganu Retail Roster (Zone A)`, `HQ Corporate Office`.
   * **Operating Zone Mode:** Select the weekend pattern:
     - **Zone A:** Kelantan, Terengganu, Kedah, Johor (Rest Days: *Friday & Saturday*).
     - **Zone B:** Kuala Lumpur, Selangor, Perak, Penang, Pahang, Melaka, Negeri Sembilan, Sabah, Sarawak (Rest Days: *Saturday & Sunday*).
     - **Custom Zone:** Custom operating days.
   * **Department Scope:** Assign to `ALL` departments or limit to specific teams (e.g., *Customer Support*, *Warehouse*).
   * **Branch Scoping (Multi-Select):**  
     Select exactly which branches this schedule governs (e.g., apply `Zone A` schedule to *Kemaman*, *Kuala Terengganu*, *Jertih*, *Dungun*).

---

### 7-Day Working Hours, Core Shifts & Break Hours

Configure timings for each day of the week:
* **Monday to Sunday Toggles:** Check **Working Day** or uncheck for **Rest Day**.
* **Start Time & End Time:** e.g., `08:30:00` to `17:30:00` using the time picker.
* **Lunch Break Timings:**
  * **Lunch Start:** e.g., `13:00`
  * **Lunch End:** e.g., `14:00` (system deducts 1 hour unpaid break automatically).
* **Special Rules:**
  * Extended Friday Prayer Break (e.g., `12:30 - 14:30` on Fridays).
  * Half-day working hours on Thursdays or Saturdays.
5. Click **"Save Schedule"**. The system instantly recalculates daily late thresholds for all employees assigned to those branches.

---

## 7. Branch Deployments & Temporary Assignments

* **Page Route:** `/branches/temporary-assignments`
* **Navigation Path:** Sidebar Menu → **Branch Management** → **Temporary Assignment**
* **Authorized Roles:** `hr_admin`, `branch_leader`, `operation_manager`, `managing_director`
* **Source Component:** `src/pages/TemporaryAssignments.tsx`

---

### Assigning Temporary Branch Duties

When staff are sent on short-term deployment to support another branch (e.g., sending an HQ ticketing officer to Kemaman branch for 2 weeks):
1. Navigate to `/branches/temporary-assignments`.
2. Click **"+ New Temporary Assignment"**.
3. Modal Dialog fields:
   * **Employee:** Search and select staff member.
   * **Temporary Branch Location:** Destination branch (e.g., `Kemaman Branch`).
   * **Assigned Department:** Home department or destination department.
   * **Effective Duration:** `Start Date` and `End Date`.
   * **Purpose & Remarks:** e.g., *"Hajj Peak Season Counter Assistance"*.
4. Click **"Assign Employee"**.

---

### Automatic Geofence Switching Mechanism

* During the active date range of the temporary assignment, the employee's clock-in geofence **dynamically switches** from their home branch to the destination branch.
* If the employee clocks in at Kemaman, the system checks coordinates against Kemaman branch coordinates instead of HQ.
* Once the `End Date` passes, their profile automatically reverts to their home branch coordinates.

---

## 8. Multi-Company Structure, Branches & Transfer Wizard

### 8.1 New Subsidiary Setup Lifecycle (From Entity Creation to Fully Operational Data)

When expanding the corporate group by introducing a new subsidiary company (e.g. *RayRent Car Rental Sdn Bhd*, *Rayhar Holidays*, or *Rayhar Logistics*), HR must complete an interconnected **sequential setup chain**. 

A newly registered subsidiary starts with **zero branches, zero schedules, unconfigured leave policies, and zero staff**. If users attempt to clock in or apply for leave before these requirements match, operations will fail. Once all requirements are configured in sequence, HR and Management can **fully view and operate all data** for that company.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             NEW SUBSIDIARY ONBOARDING: SEQUENTIAL REQUIREMENT CHAIN          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STEP 1: Create Corporate Entity & Subsidiary (/settings?tab=company)      │
│             │                                                               │
│             ▼                                                               │
│   STEP 2: Create Branches with GPS & Geofence Pins (/settings?tab=branch)   │
│             │                                                               │
│             ▼                                                               │
│   STEP 3: Configure Work Schedules & Shifts (/settings?tab=schedule)        │
│             │                                                               │
│             ▼                                                               │
│   STEP 4: Configure Leave Types & Quotas (e.g. AL = 4 Days) (/settings?tab) │
│             │                                                               │
│             ▼                                                               │
│   STEP 5: Establish Multi-Tier Approval Chain (/settings?tab=leave builder) │
│             │                                                               │
│             ▼                                                               │
│   STEP 6: Provision / Transfer Staff Members (/settings?tab=employee)      │
│             │                                                               │
│             ▼                                                               │
│   STEP 7: FULLY ACTIVATED: Switch Company & View All Operational Data       │
│           (Dashboard, Live Attendance, Approvals, Analytics, Payroll)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Step 1: Create the Subsidiary Entity
* **Page Route:** `/settings?tab=company` (or `/organization/entities`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Action Steps:**
  1. Navigate to Settings Hub → **3. COMPANY MANAGEMENT** (or Sidebar → Organization & Entities → Corporate Entities).
  2. Click the purple **"+ Add Company"** button.
  3. Form Fields:
     * **Company Name:** e.g., `RayRent Sdn Bhd`
     * **Company Type:** Select `Subsidiary` (or `Main` if parent group)
     * **Parent Company:** Choose parent entity (e.g., `Rayhar Travels Sdn Bhd`)
     * **Registration / SSM Number & Address:** Headquarters physical address
     * **Email & Phone:** Official contact channels
     * **Company Logo:** Upload brand emblem via `CompanyLogoUploader` (displays in top sidebar)
     * **Status:** Toggle to `Active`
  4. Click **"Save Company"**. The entity is registered in the multi-tenant database.

---

#### Step 2: Create Branches for that Subsidiary
* **Page Route:** `/settings?tab=branch` (or `/organization/branches`, `/branches`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Why this is required:** Employees cannot clock in without an assigned branch that has verified physical GPS coordinates and an allowable geofence radius.
* **Action Steps:**
  1. Open **4. BRANCH & LOCATION**.
  2. Ensure the new subsidiary (e.g. *RayRent*) is selected in the company selector.
  3. Click **"+ Add Branch"**.
  4. Form Fields:
     * **Branch Code:** Unique identifier (e.g., `RR-HQ`, `RR-SEPANG`, `RR-KMM`).
     * **Branch Name:** Official location (e.g., `RayRent Sepang Airport Hub`).
     * **Interactive Map Pin:** Search address in Malaysia; the map auto-centers with an interactive marker. Drag or click to pin the exact entrance coordinates (Latitude / Longitude).
     * **Geofence Radius Slider:** Set allowable radius (standard: `100 meters`; options: `20m` to `500m`).
  5. Click **"Save Branch"**. Repeat for every branch operated by that subsidiary.

---

#### Step 3: Set Working Hours & Shift Schedules for that Branch
* **Page Route:** `/settings?tab=schedule`
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager`
* **Why this is required:** Without an active work schedule, attendance calculation engines cannot determine on-time arrival, late tardiness, overtime, or rest days.
* **Action Steps:**
  1. Open **6. WORK SCHEDULES**.
  2. Select the new subsidiary entity.
  3. Click **"+ Create Work Schedule"**.
  4. Form Fields:
     * **Schedule Name:** e.g., `RayRent Hub Standard Shift`, `Fleet Operational Roster`.
     * **Operating Zone Mode:** Select weekend policy:
       - **Zone A:** Kelantan, Terengganu, Kedah, Johor (Rest Days: *Friday & Saturday*).
       - **Zone B:** KL, Selangor, Perak, Penang, Melaka, Pahang, etc. (Rest Days: *Saturday & Sunday*).
       - **Custom Zone:** Custom operating and off days.
     * **Branch Scoping (Multi-Select):** Check the branches created in Step 2.
     * **7-Day Roster:** Configure working days and shift hours:
       - Shift Start Time: e.g. `08:30:00`
       - Shift End Time: e.g. `17:30:00`
       - Break Times: Lunch start `13:00`, Lunch end `14:00`
       - Special Rules: Extended Friday prayer break (12:30 - 14:30) if applicable.
  5. Click **"Save Schedule"**.

---

#### Step 4: Configure Leave Types & Specific Quotas (e.g. AL = 4 Days)
* **Page Route:** `/settings?tab=leave`
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Why this is required:** Each subsidiary may have distinct contractual leave entitlements (for example, contract drivers or new subsidiary staff may only be allocated **4 Days of Annual Leave** instead of the standard 14 days).
* **Action Steps:**
  1. Open **7. LEAVE & APPROVALS**.
  2. Select the new subsidiary from the company dropdown.
  3. In the **4 Leave Types & Quota Cards**, configure the default annual allowance for this subsidiary:
     * **Annual Leave (AL):** Adjust the number input directly.  
       *Example:* Set to **`4` days** (or whatever specific quota this subsidiary provides).
     * **Emergency Leave (EL):** Set default days (e.g., `5` days).
     * **Medical / Sick Leave (MC):** Set medical quota (e.g., `14` days).
     * **Replacement Leave (Cuti Ganti):** Set base starting quota (default: `0` days, earned dynamically).
     * **Unpaid Leave (Cuti Tanpa Gaji):** Set maximum allowed cap (e.g., `30` days).
  4. **Policy Toggles:**
     * Enforce Medical Certificate (MC) Slip Upload: **ON**
     * Escalate to Parent Company if Approver is Unassigned: **ON**
  5. Click **"Save Leave Policies"**.

---

#### Step 5: Establish Multi-Tier Leave Approval Routing Rules
* **Page Route:** `/settings?tab=leave` (Bottom Section: `ApprovalBuilder`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Why this is required:** Subordinates submitting leave in this subsidiary must know which supervisor hierarchy reviews and endorses their applications.
* **Action Steps:**
  1. Scroll down to the **Multi-Tier Leave Approval Sequence Builder**.
  2. Click **"+ Add Workflow"** to configure a routing pipeline for this company's branches.
  3. Configure Approval Steps:
     * **Step 1 (Tier 1):** Branch Leader / Supervisor (Local endorsement).
     * **Step 2 (Tier 2):** Head of Department (HOD) (Operational staffing review).
     * **Step 3 (Tier 3):** HR Admin / Operation Manager / Managing Director (Final payroll clearance).
  4. Click **"Save Workflow"**.

---

#### Step 6: Provision / Transfer Staff Members to the Subsidiary
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Action Steps:**
  * **Option A: New Hire Onboarding (`/settings?tab=employee`)**  
    Select the new Company Entity, select its branch, department, role, fill in MyKad IC, contact details, email, and password. Click "Complete Onboarding".
  * **Option B: Transfer Existing Staff from Main Company (`/organization/transfer`)**  
    Use the Company Transfer Wizard. Pick an employee from Rayhar Travels, choose the new subsidiary (*RayRent*), select their new branch and designation, specify the effective transfer date, and submit.

---

#### Step 7: FULLY ACTIVATED — How HR & Executives View All Data for that Company
Once all 6 steps above are fulfilled, the subsidiary transitions to **Full Operational Status**:

1. **Top Company Switcher (`CompanySwitcher`):**  
   Click the company dropdown located in the top navigation bar. Select the newly created subsidiary (e.g. *RayRent Car Rental Sdn Bhd*).
2. **Instant Global Context Synchronization:**
   * **Dashboard (`/`):** KPI cards (Present Today, On Leave, Late, Absent) dynamically recalculate exclusively for the subsidiary's workforce.
   * **My & Team Attendance (`/attendance`, `/team-attendance`):** Validates staff clock-ins against the subsidiary's branch geofences and shift hours configured in Step 3.
   * **Leave Approval Hub (`/leave/admin`):** Shows leave applications submitted under the subsidiary's approval chain, deducting from the configured quota (e.g. 4 days AL).
   * **Employee Directory (`/employees`):** Automatically displays only the staff assigned to this subsidiary.
   * **Workforce Analytics & Reports (`/reports/...`, `/hr-analytics/...`):** Generates payroll export files (CSV/PDF) filtered strictly by this company entity.
3. **Consolidated Group Overview:**  
   Managing Directors and Parent Group HR Admins can view group-wide reports consolidating data across all subsidiaries simultaneously.

---

### 8.2 Branch Management & Map-Based Geofencing

* **Page Route:** `/settings?tab=branch` (or `/organization/branches`, `/branches`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab4_BranchLocationMgmt.tsx`

#### Capabilities:
1. **Interactive Map (MapLibre):** Search any address in Malaysia; the map flies to the coordinates with a draggable pin.
2. **Branch Code & Proper Name:** e.g., Code `KMM`, Name `Kemaman`.
3. **Geofence Radius Slider:** Set allowed punch radius between `20 meters` to `500 meters` (standard: `100m`).
4. **Link Schedule Zone:** Associate the branch with Zone A or Zone B work schedule rules.

---

### Department Structure Management

* **Page Route:** `/settings?tab=department` (or `/organization/departments`, `/master/department`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab5_DepartmentMgmt.tsx`

#### Capabilities:
* Create corporate departments (e.g., *Operations*, *Finance*, *Haji & Umrah*, *IT & Software*).
* Designate Department Heads (HODs) who receive Tier 2 leave approval authority.

---

### Company Transfer Wizard & Career History Ledger

* **Page Route:** `/organization/transfer` (or `/settings?tab=employee` → Sub-tab 2)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/employee-assignment/CompanyTransferWizard.tsx`

#### How to Transfer Staff Between Subsidiaries:
1. Select Employee.
2. View current company, branch, and role.
3. Select **Destination Company Entity** (e.g., transfer from *Rayhar Travels* to *RayRent Car Rental*).
4. Select new Branch and Role in the target company.
5. Set **Effective Date of Transfer**.
6. Submit Transfer: The system updates the employee's active tenant and appends an immutable entry to the **Employee Company History Ledger** (`/organization/history`).

---

## 9. Role-Based Access Control (RBAC) & Master Permission Matrix

The table below lists every primary action in the system and the exact pages and roles authorized to perform it:

| System Action | Primary Page & Route | Authorized Roles | Key Notes |
| :--- | :--- | :--- | :--- |
| **Add New Staff (HR Onboarding)** | `/settings?tab=employee` | `hr_admin`, `managing_director` | Complete form with smart MyKad auto-calculation & transfer tools |
| **Add New Staff (Directory)** | `/employees` | `hr_admin`, `managing_director`, `operation_manager` | Quick pop-up modal inside master staff table |
| **Add New Staff (Entity-based)** | `/organization/personnel` | `hr_admin`, `managing_director` | Direct corporate entity assignment & status control |
| **Transfer Staff Between Companies** | `/organization/transfer` | `hr_admin`, `managing_director` | Inter-company transfer wizard with career ledger |
| **Clock In / Clock Out** | `/attendance` | **All Staff** | Geolocation verified against branch GPS coordinates |
| **View Team Attendance** | `/team-attendance` | `branch_leader`, `head_of_department`, `hr_admin` | Roster of subordinates' presence today |
| **Apply for Leave** | `/leave/apply` | **All Staff** | Supports 5 leave types; mandatory MC attachment for sick leave |
| **Approve Team Leave (Tier 1/2)** | `/leave/team` | `branch_leader`, `head_of_department` | Approves or rejects leave for direct team members |
| **Approve Central Leave (Tier 3)** | `/leave/admin` | `hr_admin`, `operation_manager`, `managing_director` | Company-wide multi-tier approval and batch actions |
| **Adjust Leave Balances** | `/leave/entitlement` | `hr_admin` | Manual addition/deduction of leave days with audit note |
| **Assign Outstation Duty** | `/outstation/assignment` | `hr_admin`, `managing_director`, `operation_manager`, `branch_leader`, `head_of_department` | Deploys staff with destination, dates, and geofence override |
| **Self-Request Outstation** | `/outstation/my` | **All Staff** | Submit personal outstation travel request |
| **Configure Late Grace Window** | `/settings?tab=attendance` | `hr_admin`, `managing_director` | Sets late threshold minutes (e.g. 30 min) and clock-in policies |
| **Configure Work Schedules** | `/settings?tab=schedule` | `hr_admin`, `managing_director`, `operation_manager` | Sets 7-day shifts, Zone A/B weekend rules, and branch scoping |
| **Assign Temporary Branch** | `/branches/temporary-assignments` | `hr_admin`, `operation_manager`, `branch_leader` | Temporarily relocates staff; auto-switches geofence |
| **Create & Edit Branches** | `/settings?tab=branch` | `hr_admin`, `managing_director` | MapLibre map search, pin drop, and radius slider |
| **Create & Edit Roles (IAM)** | `/settings?tab=iam` | `hr_admin`, `managing_director` | Custom role builder with module-level View/Edit permissions |
| **Export Payroll Reports** | `/reports/attendance`, `/reports/leave` | `hr_admin`, `finance_manager`, `managing_director` | Export attendance, leave, and outstation data to CSV/PDF |

---

## 10. Detailed Page Functionality Breakdown by Role (View vs. Create / Edit / Delete / Approve)

This section provides an exact, screen-by-screen breakdown of how each page behaves depending on the logged-in user's role. It specifies **which roles have read-only visibility**, **which roles can create or modify data**, and **which interactive elements are dynamically hidden or locked**.

---

### 10.1 Company Leave Calendar (`/calendar/company-leave`)

* **Primary Purpose:** Official ledger of public holidays, state-specific holidays, and company gazetted non-working days.
* **Component:** `src/pages/CompanyLeaveCalendar.tsx` (Logic: `const isHR = role === 'hr_admin';`)

#### Role Capabilities:
| Role | View Ability | Create Ability | Edit / Delete Ability | Visible Controls |
| :--- | :---: | :---: | :---: | :--- |
| **`hr_admin`** | ✅ Full | ✅ Yes (`+ Add Company Leave`) | ✅ Full (Active leaves) | • "+ Add Company Leave" button displayed<br>• Create / Edit Modal dialog accessible<br>• "Actions" column visible with Edit (pencil) & Delete (trash) icons<br>• Can configure applicability (All Staff, Branch, Department), Paid status, and Attendance requirement |
| **`employee`** | ✅ View Only | ❌ No | ❌ No | • Can view calendar dates, holiday names, and status<br>• "+ Add Company Leave" button is **completely hidden**<br>• "Actions" column is **completely hidden** |
| **`branch_officer`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |
| **`branch_leader`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |
| **`head_of_department`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |
| **`operation_manager`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |
| **`finance_manager`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |
| **`managing_director`** | ✅ View Only | ❌ No | ❌ No | • Same as Employee (View only, no action controls) |

> [!IMPORTANT]
> **Completed Company Leaves:** Even for `hr_admin`, once a holiday's end date has passed and its status switches to `Completed`, the Edit and Delete buttons are permanently disabled (opacity reduced to 30% with tooltip: *"Completed company leave cannot be edited/deleted"*) to preserve historical audit integrity.

---

### 10.2 Work Calendar (`/calendar`)

* **Primary Purpose:** Operational work schedules, personal shifts, approved leave overlays, and outstation assignments plotted on a monthly calendar grid.
* **Component:** `src/pages/Calendar.tsx`

#### Role Capabilities:
* **`employee` / `branch_officer`:**
  - **Function:** View personal work shifts, approved leaves, and assigned outstation duties.
  - **Scope:** Restricted strictly to self. Cannot view shifts or leaves of other colleagues.
* **`branch_leader`:**
  - **Function:** View personal calendar + team roster overlay.
  - **Scope:** Can see scheduled shifts and approved leaves for all employees belonging to their assigned branch.
* **`head_of_department` (HOD):**
  - **Function:** View personal calendar + departmental roster overlay.
  - **Scope:** Can see scheduled shifts and approved leaves for all personnel within their department.
* **`hr_admin` / `managing_director` / `operation_manager`:**
  - **Function:** High-level corporate view. Can toggle branch and department filters to inspect staffing coverage nationwide.

---

### 10.3 Attendance & Team Attendance (`/attendance`, `/team-attendance`)

#### My Attendance (`/attendance`):
* **All Staff (Every Role):**
  - **Clock In / Clock Out:** Interactive punch button verifying device GPS coordinates against branch geofence radius.
  - **Personal Timesheets:** View daily arrival time, departure time, total productive hours, and late duration.
  - **Export History:** Download personal monthly attendance statement in PDF or CSV format.
  - *Constraint:* Users can only clock in for their own account; proxy punching is prevented.

#### Team Attendance (`/team-attendance`):
* **`employee` / `branch_officer`:**
  - **Function:** **No Access** (route blocked; hidden from sidebar navigation).
* **`branch_leader`:**
  - **Function:** Real-time branch presence board.
  - **Scope:** View today's clock-in status (Present, Late, On Leave, Absent, Inactive) strictly for staff assigned to their physical branch.
* **`head_of_department`:**
  - **Function:** Real-time departmental presence board.
  - **Scope:** View today's clock-in status strictly for personnel assigned to their department across any branch.
* **`hr_admin` / `managing_director` / `operation_manager`:**
  - **Function:** Global presence oversight with dropdown filters to monitor all branches and departments in real time.

---

### 10.4 Leave Management & Approvals (`/leave/apply`, `/leave/team`, `/leave/admin`, `/leave/entitlement`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LEAVE PERMISSIONS BY ROLE                             │
├──────────────────────┬─────────────┬─────────────┬─────────────┬────────────┤
│ Role                 │ Apply Leave │ Team Review │ Central HR  │ Adjust     │
│                      │ (/leave)    │ (Tier 1/2)  │ (Tier 3)    │ Quotas     │
├──────────────────────┼─────────────┼─────────────┼─────────────┼────────────┤
│ employee             │     ✅      │     ❌      │     ❌      │     ❌     │
│ branch_officer       │     ✅      │     ❌      │     ❌      │     ❌     │
│ branch_leader        │     ✅      │ ✅ (Branch) │     ❌      │     ❌     │
│ head_of_department   │     ✅      │ ✅ (Dept)   │     ❌      │     ❌     │
│ operation_manager    │     ✅      │     ✅      │ ✅ (Endorse)│     ❌     │
│ managing_director    │     ✅      │     ✅      │ ✅ (Final)  │     ❌     │
│ hr_admin             │     ✅      │     ✅      │ ✅ (Global) │ ✅ (Admin) │
└──────────────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

#### Detailed Breakdown:
* **Leave Application (`/leave/apply`):**
  - Accessible to **All Staff**. Any user can submit Annual, Medical, Emergency, Replacement, or Unpaid Leave applications.
* **Team Leave Requests (`/leave/team`):**
  - **`branch_leader`:** Endorse or Reject leave requests submitted by branch subordinates. Can view MC attachments and write endorsement remarks.
  - **`head_of_department`:** Endorse or Reject leave requests submitted by departmental staff.
  - **Standard Staff:** Hidden / No access.
* **Leave Approval Hub (`/leave/admin`):**
  - **`hr_admin` / `managing_director` / `operation_manager`:** Central administrative hub. Can grant final approvals, execute batch approvals via checkboxes, reject with mandatory reasons, and export leave rosters to Excel/PDF.
  - **Branch Leaders / HODs:** View-only access or restricted to pending items assigned to their tier.
  - **Standard Staff:** Hidden / No access.
* **Leave Entitlement Management (`/leave/entitlement`):**
  - **`hr_admin`:** **Exclusive authority**. The only role allowed to manually add/deduct leave balances (+/- days) for any employee with required audit logs.
  - **All other roles:** Hidden / No access.

---

### 10.5 Outstation Management (`/outstation/my`, `/outstation/assignment`, `/outstation/calendar`)

* **My Outstation (`/outstation/my`):**
  - **All Staff:** View personal active, upcoming, and past travel deployments. Submit self-initiated travel requests. Download official outstation travel orders.
* **Outstation Assignment (`/outstation/assignment`):**
  - **`branch_leader` / `head_of_department`:** Can create outstation assignments for subordinates within their branch/department.
  - **`hr_admin` / `operation_manager` / `managing_director`:** Full company-wide assignment authority. Can assign any employee, set travel allowances, enable geofence bypass, edit existing missions, and cancel deployments.
  - **Standard Staff:** Hidden / No access.
* **Outstation Dashboard & Calendar (`/outstation`, `/outstation/calendar`):**
  - **Supervisors & Admins:** Company-wide Gantt timeline and headcount tracker of personnel out of office.
  - **Standard Staff:** Only personal calendar visible (`/outstation/my-calendar`).

---

### 10.6 Employee Directory (`/employees`)

* **Component:** `src/pages/Employees.tsx`

#### Role Capabilities:
* **`employee` / `branch_officer`:**
  - **View-Only:** Search company staff, view colleague names, official email, and branch location for internal communication.
  - **Hidden Controls:** "+ Add Staff" button, "Edit Profile" actions, and "Deactivate" buttons are completely hidden.
* **`branch_leader`:**
  - **Scope:** Filtered to staff in their assigned branch.
  - **View:** View branch staff profiles, phone numbers, and attendance records. Cannot register new staff or edit employment contracts.
* **`head_of_department`:**
  - **Scope:** Filtered to staff in their department.
  - **View:** View department staff profiles. Cannot register new staff or modify roles.
* **`hr_admin` / `managing_director` / `operation_manager`:**
  - **Full Control:**
    - "+ Add Staff" button enabled (opens modal to register new personnel).
    - Can edit employee details (phone, branch, department, role, join date).
    - Can deactivate resigned employees or reactivate returning staff.
    - Can export master employee records to CSV / Excel.

---

### 10.7 Branch Management & Temporary Assignments (`/branches`, `/branches/temporary-assignments`)

#### Branch Overview (`/branches`):
* **`hr_admin` / `managing_director`:** Full control. Can create new branches, set exact GPS coordinates via map search, and adjust geofence radius sliders.
* **Supervisors & Staff:** View-only list of company branches and addresses.

#### Temporary Assignments (`/branches/temporary-assignments`):
* **`hr_admin` / `operation_manager`:** Full creation and management. Can temporarily deploy any employee to another branch with custom date ranges, which automatically shifts their clock-in geofence.
* **`branch_leader`:** Can submit temporary transfer requests for their branch staff.
* **Standard Staff:** Hidden / No access.

---

### 10.8 Settings Hub & Multi-Company Configuration (`/settings`, `/organization/...`)

* **Component:** `src/modules/multi-company/modules/SettingsHub/SettingsLayout.tsx`

> [!IMPORTANT]
> The **Settings Hub (`/settings`)** and **Organization & Entities (`/organization/...`)** are restricted exclusively to **Tier 3 Administrators (`hr_admin`, `managing_director`)**. Standard employees, branch officers, branch leaders, and HODs cannot access these pages.

#### Tab-by-Tab Configuration Matrix:
| Settings Tab | Sub-Module | Authorized Roles | What Can Be Configured |
| :--- | :--- | :--- | :--- |
| **Tab 1: Attendance Config** | `/settings?tab=attendance` | `hr_admin`, `managing_director` | • Late threshold grace window (minutes)<br>• Early checkout tolerance<br>• Minimum daily working hours<br>• Geofence enforcement mode (`strict`/`relaxed`/`disabled`)<br>• Facial verification & GPS requirement switches<br>• Interactive Policy Calculation Simulator |
| **Tab 2: Personnel Management** | `/settings?tab=employee` | `hr_admin`, `managing_director` | • Full new hire onboarding form with MyKad auto-calculation<br>• Inter-company transfer wizard (`CompanyTransferWizard`)<br>• Historical transfer audit ledger (`EmployeeCompanyHistory`) |
| **Tab 3: Company Management** | `/settings?tab=company` | `hr_admin`, `managing_director` | • Create new corporate entities / subsidiaries<br>• Upload corporate logos and branding assets<br>• Set parent-subsidiary hierarchies |
| **Tab 4: Branch & Location** | `/settings?tab=branch` | `hr_admin`, `managing_director` | • Add new branch locations<br>• Interactive MapLibre pin placement<br>• Set geofence radius slider (20m - 500m)<br>• Link branch to Zone A / Zone B work schedules |
| **Tab 5: Department Management** | `/settings?tab=department` | `hr_admin`, `managing_director` | • Create corporate departments<br>• Assign Department Heads (HODs) |
| **Tab 6: Work Schedules** | `/settings?tab=schedule` | `hr_admin`, `managing_director`, `operation_manager` | • Create multi-tenant work schedules<br>• Set Zone A (Fri-Sat weekend) vs Zone B (Sat-Sun weekend)<br>• Multi-branch scoping<br>• 7-day shift start/end times & lunch break timings<br>• Extended Friday prayer break rules |
| **Tab 7: Leave & Approvals** | `/settings?tab=leave` | `hr_admin`, `managing_director` | • Set default quotas per leave type (Annual, Sick, Emergency, Unpaid)<br>• Mandatory Medical Certificate (MC) policy switch<br>• Drag-and-drop Multi-Tier Approval Chain Builder (`ApprovalBuilder`) |
| **Tab 8: Roles & Permissions** | `/settings?tab=iam` | `hr_admin`, `managing_director` | • Create custom roles per company entity<br>• Set role scope (Global, Branch, Department, Self)<br>• Configure granular module permissions (`None`, `View`, `Edit`) |

---

### 10.9 Workforce Analytics & Reports (`/hr-analytics/...`, `/reports/...`)

#### Workforce Analytics:
* **`employee`:** Access denied to `/hr-analytics`. Can only view personal punctuality & attendance trends at `/analytics`.
* **`branch_leader` / `head_of_department`:** Can view attendance trends, punctuality ratings, and late arrival charts filtered strictly to their branch or department.
* **`hr_admin` / `managing_director` / `operation_manager`:** Full executive visibility: company-wide headcount trends, absenteeism rates, branch-by-branch punctuality comparisons, and missing punch alerts.

#### Reports Center:
* **`employee`:** Can download personal monthly attendance report.
* **`branch_leader` / `head_of_department`:** Can generate and export attendance and leave reports for their specific team.
* **`hr_admin` / `finance_manager`:** Full export center across all modules (Attendance, Leave, Outstations, Departments) in Microsoft Excel (CSV) or printable PDF for end-of-month payroll processing.

---

### 10.10 GPS Location Tracker (`/gps-location-tracker`)

* **`employee` / `branch_officer`:**
  - Restricted strictly to **Location History (`/gps-location-tracker/history`)**.
  - Can view a personal breadcrumb log of their own captured GPS coordinates for transparency.
  - Cannot access the live map tracking other colleagues.
* **`branch_leader` / `head_of_department`:**
  - Can view live location pins of clocked-in branch or department members.
* **`hr_admin` / `managing_director` / `operation_manager`:**
  - Full access to **Live Tracker (`/gps-location-tracker`)**.
  - Real-time interactive map plotting all clocked-in staff across Malaysia. Helps verify remote outstation staff and temporary branch assignees.

---

### 10.11 Master Capability Matrix by Role (Summary Table)

| Page / Feature | `employee` / `branch_officer` | `branch_leader` | `head_of_department` | `hr_admin` | `operation_manager` | `managing_director` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Company Leave Calendar** | **View Only** | **View Only** | **View Only** | **Full CRUD** (Add, Edit, Delete) | **View Only** | **View Only** |
| **Work Calendar** | View (Self) | View (Branch) | View (Dept) | View (Global) | View (Global) | View (Global) |
| **My Attendance** | Punch + View | Punch + View | Punch + View | Punch + View | Punch + View | Punch + View |
| **Team Attendance** | ❌ No Access | View (Branch) | View (Dept) | View (Global) | View (Global) | View (Global) |
| **Apply Leave** | Create (Self) | Create (Self) | Create (Self) | Create (Self) | Create (Self) | Create (Self) |
| **Team Leave Approval** | ❌ No Access | Approve (Branch) | Approve (Dept) | Global Override | Global Override | Global Override |
| **Central Leave Approval** | ❌ No Access | View Queue | View Queue | **Full Approval** & Batch | **Full Approval** & Batch | **Executive Approval** |
| **Leave Entitlement Adjust** | ❌ No Access | ❌ No Access | ❌ No Access | **Exclusive Authority** (+/- Quota) | ❌ No Access | ❌ No Access |
| **Employee Directory** | View (Directory) | View (Branch) | View (Dept) | **Full Management** (Add Staff, Edit) | **Full Management** (Add Staff, Edit) | **Full Management** (Add Staff, Edit) |
| **Personnel Entity Setup** | ❌ No Access | ❌ No Access | ❌ No Access | **Full Access** (Add Staff to Entity) | ❌ No Access | **Full Access** |
| **Outstation Self-Request** | Create (Self) | Create (Self) | Create (Self) | Create (Self) | Create (Self) | Create (Self) |
| **Outstation Assignment** | ❌ No Access | Assign (Branch) | Assign (Dept) | **Global Assignment** & Override | **Global Assignment** & Override | **Global Assignment** & Override |
| **Temporary Branch Assign** | ❌ No Access | Request (Branch)| Request (Dept)| **Full Assignment** (Auto Geofence) | **Full Assignment** (Auto Geofence) | **Full Assignment** |
| **Settings: Attendance Grace**| ❌ No Access | ❌ No Access | ❌ No Access | **Configure** (Threshold & Rules) | ❌ No Access | **Configure** |
| **Settings: Work Schedules** | ❌ No Access | ❌ No Access | ❌ No Access | **Configure** (Shifts & Zones) | **Configure** (Shifts & Zones) | **Configure** |
| **Settings: Branches & Map** | ❌ No Access | ❌ No Access | ❌ No Access | **Configure** (Map & Radius) | ❌ No Access | **Configure** |
| **Settings: IAM Roles** | ❌ No Access | ❌ No Access | ❌ No Access | **Configure** (Roles & Permissions) | ❌ No Access | **Configure** |
| **Payroll Reports Export** | ❌ No Access | Export (Branch) | Export (Dept) | **Full Export** (CSV/PDF) | Export (Operations) | **Full Export** |
| **Live GPS Map Tracker** | ❌ No Access | Track (Branch) | Track (Dept) | **Global Live Map** | **Global Live Map** | **Global Live Map** |

---

*Document compiled and verified against the Rayhar Group Workforce Management System codebase.*
