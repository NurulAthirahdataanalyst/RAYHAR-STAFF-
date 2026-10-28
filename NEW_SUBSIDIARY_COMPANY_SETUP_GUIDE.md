# Rayhar Group Workforce Management System
## New Subsidiary Company Setup & Full Data Activation Guide

This document is the official step-by-step operations manual for HR Administrators and Executives to **register a new subsidiary company, configure its operational infrastructure, set custom leave quotas, onboard staff, and fully activate all real-time dashboards and reports**.

---

## 📑 Table of Contents
1. [Overview & Sequential Dependency Chain](#1-overview--sequential-dependency-chain)
2. [Step 1: Register the Subsidiary Entity](#step-1-register-the-subsidiary-entity)
3. [Step 2: Create Branches with Map GPS Coordinates & Geofencing](#step-2-create-branches-with-map-gps-coordinates--geofencing)
4. [Step 3: Configure Working Hours & Shift Schedules for that Branch](#step-3-configure-working-hours--shift-schedules-for-that-branch)
5. [Step 4: Configure Leave Quotas (e.g. Setting Annual Leave AL = 4 Days)](#step-4-configure-leave-quotas-eg-setting-annual-leave-al--4-days)
6. [Step 5: Establish Multi-Tier Leave Approval Routing Rules](#step-5-establish-multi-tier-leave-approval-routing-rules)
7. [Step 6: Provision New Hires or Transfer Existing Staff](#step-6-provision-new-hires-or-transfer-existing-staff)
8. [Step 7: FULL ACTIVATION — How to Switch Company & View All Operational Data](#step-7-full-activation--how-to-switch-company--view-all-operational-data)
9. [Troubleshooting & Verification Checklist](#9-troubleshooting--verification-checklist)

---

## 1. Overview & Sequential Dependency Chain

### Why a New Subsidiary Starts Blank
When you create a new subsidiary (e.g., *RayRent Car Rental Sdn Bhd*, *Rayhar Holidays*, or *Rayhar Logistics*), the system provisions an isolated tenant with:
* **0 Branches**
* **0 Work Schedules / Working Hours**
* **Default Unconfigured Leave Quotas**
* **0 Employees**

> [!CAUTION]
> If HR adds staff to a new company *before* setting up branches and work schedules:
> 1. Staff will **not be able to clock in** (no physical GPS coordinates exist for geofencing verification).
> 2. Attendance calculation engines **cannot compute tardiness or overtime** (no shift hours exist).
> 3. Staff **cannot apply for leave** (no approval routing rules or quotas exist).

### The Mandatory 7-Step Sequential Pipeline
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
│   STEP 3: Configure Working Hours & Shifts (/settings?tab=schedule)        │
│             │                                                               │
│             ▼                                                               │
│   STEP 4: Configure Leave Quotas (e.g. AL = 4 Days) (/settings?tab=leave)   │
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

## Step 1: Register the Subsidiary Entity

* **Primary Route:** `/settings?tab=company` (or `/organization/entities`)
* **Navigation Path:** Sidebar Menu → **Settings** → Left Tab Panel: **3. COMPANY MANAGEMENT**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab3_CompanyMgmt.tsx`

### Execution Steps:
1. Navigate to `/settings?tab=company`.
2. Click the purple **"+ Add Company"** button.
3. Complete the entity registration form:
   * **Company Name:** Legal corporate name (e.g., `RayRent Sdn Bhd`).
   * **Company Type:** Select **`Subsidiary`** (leave as `Main` only for the parent holding company).
   * **Parent Company:** Select the parent holding company (`Rayhar Travels Sdn Bhd`).
   * **Registration / SSM Number:** Official business registration number.
   * **Company Physical Address:** Headquarters / main operating hub address.
   * **Email & Contact Phone:** Official administrative contact details.
   * **Upload Logo (`CompanyLogoUploader`):** Upload the subsidiary's corporate emblem (PNG/JPG). This logo will dynamically appear in the top-left sidebar whenever this subsidiary is active.
   * **Status:** Set to **`Active`**.
4. Click **"Save Company"**. The subsidiary is now stored in the multi-tenant database.

---

## Step 2: Create Branches with Map GPS Coordinates & Geofencing

* **Primary Route:** `/settings?tab=branch` (or `/organization/branches`)
* **Navigation Path:** Sidebar Menu → **Settings** → Left Tab Panel: **4. BRANCH & LOCATION**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab4_BranchLocationMgmt.tsx`

### Why this is required:
Every employee needs an assigned branch location to validate mobile and web GPS clock-ins against authorized physical coordinates.

### Execution Steps:
1. Open `/settings?tab=branch`.
2. In the top company selector, **select the new subsidiary** (e.g., *RayRent Sdn Bhd*).
3. Click the purple **"+ Add Branch"** button.
4. Fill in the Branch details:
   * **Branch Code:** Unique alphanumeric code (e.g., `RR-HQ`, `RR-SEPANG`, `RR-KMM`).
   * **Branch Name:** Descriptive location title (e.g., `RayRent Sepang Airport Hub`).
   * **Address Search & Smart Geocoding:** Type the branch address into the search input. The interactive **MapLibre** map automatically flies to the location.
   * **Interactive Pin Drop:** Drag or click on the map to anchor the exact main entrance coordinates (Latitude and Longitude).
   * **Geofence Radius Slider:** Drag the slider to set the allowable punch radius (Recommended: **`100 meters`**; available options: `20m` to `500m`).
5. Click **"Save Branch"**. Repeat this step for every physical branch operated by this subsidiary.

---

## Step 3: Configure Working Hours & Shift Schedules for that Branch

* **Primary Route:** `/settings?tab=schedule`
* **Navigation Path:** Sidebar Menu → **Settings** → Left Tab Panel: **6. WORK SCHEDULES**
* **Authorized Roles:** `hr_admin`, `managing_director`, `operation_manager`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab6_WorkScheduleMgmt.tsx`

### Why this is required:
Without defined shift hours, the system cannot evaluate whether an employee clocked in on time, arrived late, left early, or worked on a rest day.

### Execution Steps:
1. Open `/settings?tab=schedule`.
2. Select the new subsidiary from the company dropdown.
3. Click the purple **"+ Create Work Schedule"** button.
4. Fill in Schedule Parameters:
   * **Schedule Name:** e.g., `RayRent Hub Standard Shift`, `Fleet Operations Roster`.
   * **Operating Zone Mode:** Select the weekend policy:
     * **Zone A (East Coast / North):** Rest days are **Friday & Saturday** (Kelantan, Terengganu, Kedah, Johor).
     * **Zone B (West Coast / Federal):** Rest days are **Saturday & Sunday** (Kuala Lumpur, Selangor, Perak, Penang, Melaka, Pahang, Sabah, Sarawak).
     * **Custom Zone:** Custom operating days.
   * **Department Scope:** Set to `ALL` or restrict to specific teams.
   * **Branch Scoping (Multi-Select):** Check the branches created in Step 2 for this subsidiary.
   * **7-Day Shift Timings:**
     * Toggle working days (e.g., Monday through Friday ON; Saturday & Sunday OFF).
     * Set **Shift Start Time:** e.g., `08:30:00`.
     * Set **Shift End Time:** e.g., `17:30:00`.
     * Set **Lunch Break Timings:** Start `13:00`, End `14:00` (1 hour automatic unpaid break).
     * Set **Special Friday Prayer Break:** (e.g. `12:30 - 14:30`) if applicable.
5. Click **"Save Schedule"**.

---

## Step 4: Configure Leave Quotas (e.g. Setting Annual Leave AL = 4 Days)

* **Primary Route:** `/settings?tab=leave`
* **Navigation Path:** Sidebar Menu → **Settings** → Left Tab Panel: **7. LEAVE & APPROVALS**
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/modules/SettingsHub/tabs/Tab8_LeaveWorkflowConfig.tsx`

### Why this is required:
Different subsidiaries often have different employee contracts or leave allowances. For example, contract fleet drivers or probationary personnel in a new subsidiary might only be granted **4 Days of Annual Leave** instead of the standard 14 days.

### Execution Steps:
1. Open `/settings?tab=leave`.
2. Select the new subsidiary from the company dropdown.
3. In the **4 Leave Types & Quota Configuration Cards**, set the annual default entitlement days:
   * **Annual Leave (AL):** Click the numeric input box and enter **`4` days** (or whatever specific quota applies to this entity).
   * **Medical / Sick Leave (MC):** Set medical quota (e.g., `14` days).
   * **Emergency Leave (EL):** Set emergency quota (e.g., `5` days).
   * **Replacement Leave (Cuti Ganti):** Base starting quota (default: `0` days, earned dynamically via approved OT or public holiday work).
   * **Unpaid Leave (Cuti Tanpa Gaji):** Maximum allowed cap (e.g., `30` days).
4. Configure Policy Switches:
   * **Enforce Medical Certificate (MC) Slip Upload:** Toggle to **ON** (mandatory upload for sick leave).
   * **Escalate to Parent Company if Local Approver Unassigned:** Toggle to **ON**.
5. Click **"Save Leave Policies"**.

---

## Step 5: Establish Multi-Tier Leave Approval Routing Rules

* **Primary Route:** `/settings?tab=leave` (Bottom Section: `ApprovalBuilder`)
* **Authorized Roles:** `hr_admin`, `managing_director`
* **Source Component:** `src/modules/multi-company/workflow/ApprovalBuilder.tsx`

### Why this is required:
When staff submit a leave request in this subsidiary, the system needs an active routing pipeline to determine which managers receive approval notifications.

### Execution Steps:
1. On the same page (`/settings?tab=leave`), scroll down to the **Multi-Tier Leave Approval Sequence Builder**.
2. Click the **"+ Add Workflow"** button.
3. Configure the Routing Pipeline:
   * **Workflow Title:** e.g., `RayRent Branch Operational Approvals`.
   * **Branch Trigger Scoping:** Select which branches of this subsidiary route through this workflow.
   * **Approval Steps (Escalation Ladder):**
     * **Step 1 (Tier 1):** `Branch Leader` / `Supervisor` (Reviews local branch staffing).
     * **Step 2 (Tier 2):** `Head of Department` (HOD) (Reviews operational coverage).
     * **Step 3 (Tier 3):** `Operation Manager` / `HR Admin` / `Managing Director` (Final payroll authorization).
4. Click **"Save Workflow"**.

---

## Step 6: Provision New Hires or Transfer Existing Staff

* **Authorized Roles:** `hr_admin`, `managing_director`

Now that the subsidiary entity, its branches, working hours, and leave approval rules exist, staff can be safely assigned without system errors.

### Option A: Registering a New Employee
1. Navigate to Settings Hub → **2. PERSONNEL MANAGEMENT** (`/settings?tab=employee`).
2. In the **Corporate Placement** section:
   * Select **Target Company Entity**: Choose the new subsidiary (*RayRent Sdn Bhd*).
   * Select **Branch**: Choose from the subsidiary's branches created in Step 2.
   * Select **Department & Designation**: e.g. *Fleet Operations / Driver*.
   * Select **Role**: `employee` or `branch_officer`.
3. Fill in Personal & Identity details (Full Name, Malaysian MyKad IC, Phone, Join Date).
4. Fill in Credentials (Email and Password).
5. Click **"Complete Onboarding"**.

### Option B: Transferring Existing Staff from the Parent Company
1. Navigate to Sidebar → **Organization & Entities** → **Employee Transfer Wizard** (`/organization/transfer`).
2. Search and select the existing employee from the parent holding company (*Rayhar Travels*).
3. Select **Destination Company Entity**: Choose the new subsidiary (*RayRent Sdn Bhd*).
4. Select their new Branch and Designation.
5. Set the **Effective Date of Transfer**.
6. Click **"Execute Transfer"**. The employee's record moves to the subsidiary, and an entry is logged in the **Career History Ledger** (`/organization/history`).

---

## Step 7: FULL ACTIVATION — How to Switch Company & View All Operational Data

Once Steps 1 through 6 are completed, the subsidiary is **100% Fully Activated**. Here is how HR Administrators and Executives access and view all operational data for that subsidiary:

```
                          ┌────────────────────────┐
                          │ TOP HEADER BAR         │
                          │ [ RayRent Sdn Bhd ▼ ]  │ ◄── Click Company Switcher
                          └───────────┬────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ Real-Time KPIs    │        │ Attendance Hub    │        │ Leave & Approvals │
│ Dashboard (/)     │        │ (/attendance)     │        │ (/leave/admin)    │
├───────────────────┤        ├───────────────────┤        ├───────────────────┤
│ • Present Today   │        │ • Branch Geofence │        │ • Approvals Queue │
│ • Late Arrivals   │        │ • Shift Rosters   │        │ • 4-Day AL Quota  │
│ • Staff On Leave  │        │ • Late Thresholds │        │ • MC Verification │
└───────────────────┘        └───────────────────┘        └───────────────────┘
```

### 1. The Global Company Switcher (Header Bar)
* Located at the top of every screen in the application.
* Click the dropdown and select the newly created subsidiary (e.g. **RayRent Sdn Bhd**).
* **Instant Event:** The system emits a global context switch event (`rayhar_company_switched`), reloading all dashboard metrics and data stores for that specific subsidiary ID.

### 2. What Data Appears Across Major Screens:
* **Executive Dashboard (`/`):**
  * Real-time KPI widgets (Total Staff, Clocked In Today, Late Arrivals, Staff on Leave) calculate exclusively for the subsidiary's workforce.
* **Attendance Management (`/attendance`, `/team-attendance`):**
  * Verifies employee punches against the subsidiary's branch GPS coordinates.
  * Late tags and early departures are evaluated against the subsidiary's shift hours configured in Step 3.
* **Leave Approval Administration (`/leave/admin`):**
  * Shows leave requests submitted by the subsidiary's staff.
  * Properly tracks and deducts from the subsidiary's configured quotas (e.g. **4 days of Annual Leave**).
* **Employee Directory (`/employees`):**
  * Master staff table automatically filters to display only employees assigned to this subsidiary.
* **Payroll & Attendance Reports (`/reports`):**
  * Export monthly attendance timesheets, overtime hours, and unpaid leave deductions formatted specifically for the subsidiary's payroll entity.
* **Parent Group Consolidated View:**
  * Managing Directors and Group HR Admins can view group-wide reports consolidating statistics across all subsidiaries simultaneously.

---

## 9. Troubleshooting & Verification Checklist

Before releasing the new subsidiary to employees, verify this readiness checklist:

| Checkpoint | Requirement | Verification Method | Status |
| :---: | :--- | :--- | :---: |
| **1** | Subsidiary Entity Status is Active | Check `/settings?tab=company` $\rightarrow$ Status badge is green `Active` | [ ] |
| **2** | At least 1 Branch has GPS Coordinates | Check `/settings?tab=branch` $\rightarrow$ Branch has Latitude, Longitude, and Radius | [ ] |
| **3** | Work Schedule is Assigned to Branch | Check `/settings?tab=schedule` $\rightarrow$ Schedule lists the branch name | [ ] |
| **4** | Leave Quotas Configured | Check `/settings?tab=leave` $\rightarrow$ AL shows `4 days` (or configured value) | [ ] |
| **5** | Leave Approval Pipeline Active | Check `/settings?tab=leave` $\rightarrow$ Workflow shows at least 1 approval tier | [ ] |
| **6** | Staff Assigned to Subsidiary & Branch | Check `/employees` $\rightarrow$ Filter by subsidiary shows assigned staff | [ ] |
| **7** | Switcher Switches Successfully | Click Company Switcher $\rightarrow$ Dashboard displays the subsidiary name and logo | [ ] |

---

*Document compiled and verified against the Rayhar Group Workforce Management System codebase.*
