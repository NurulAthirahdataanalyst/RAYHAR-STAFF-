# Rayhar Group Employee Portal - Comprehensive Pages & Navigation Guide

This document provides a detailed explanation of **all pages, menus, and submenus** in the Rayhar Group Employee Portal. It breaks down the functionality of every screen, what tasks users perform there, and the specific roles required to access them.

---

## 1. Role-Based Access Hierarchy

The system controls access dynamically based on the user's role. The roles fall into three main tiers:
- **Tier 1 (Employees):** `employee`, `branch_officer`
- **Tier 2 (Supervisors):** `branch_leader`, `head_of_department` (HOD)
- **Tier 3 (Administrators):** `hr_admin`, `managing_director`, `operation_manager`, `finance_manager`

---

## 2. MAIN NAVIGATION (Access: All Staff)
This section is visible to everyone, containing personal tools for daily operations.

### 📌 Dashboard (`/`)
- **Purpose:** The main landing page offering a bird's-eye view of daily activities.
- **Functionality:** 
  - **KPI Widgets:** Displays real-time personal or company-wide stats (Present, On Leave, Absent, Late). 
  - **Quick Actions:** Shortcuts to "Clock In/Out", "Apply Leave", and "Outstation".
  - **Recent Activity:** A feed showing the user's latest actions or team activities.
  - **Pending Approvals Dock:** (Managers/Admins only) Quick access to pending leave requests.

### 📅 Calendar
- **Work Calendar (`/calendar`):** 
  - **Functionality:** A visual calendar showing the employee's personal work schedule, scheduled leaves, and outstation assignments.
- **Company Leave Calendar (`/calendar/company-leave`):** 
  - **Functionality:** Displays all public holidays, state-specific holidays, and company-wide off days.

### ⏱️ Attendance
- **My Attendance (`/attendance`):** 
  - **Functionality:** The primary screen to **Clock In** and **Clock Out**. Verifies Geolocation against branch coordinates. Shows live working hours, monthly KPIs (Productive vs Break hours), and a downloadable (PDF/CSV) history log of daily attendance status.
- **Team Attendance (`/team-attendance`):** *(Supervisors Only)*
  - **Functionality:** Allows Branch Leaders and HODs to view the daily attendance status specifically for their subordinates.

### ✈️ Outstation Management
- **My Outstation (`/outstation/my`):**
  - **Functionality:** Employees can submit requests to work out of the office/branch. They can view their upcoming, active, and past outstation assignments.
- **My Outstation Calendar (`/outstation/my-calendar`):**
  - **Functionality:** A calendar view filtering only the employee's personal outstation dates.

### 🏖️ Leave Management
- **Leave Application (`/leave/apply`):**
  - **Functionality:** Staff use this form to apply for various leave types (Annual Leave, Medical Leave, Emergency Leave). Allows uploading of supporting documents (e.g., Medical Certificates).
- **My Leave Requests (`/leave/forms`):**
  - **Functionality:** A tracking page where staff can see the approval status (Pending, Approved, Rejected) of their submitted leaves.
- **Team Leave Requests & Approval (`/leave/team`, `/leave/approval`):** *(Supervisors Only)*
  - **Functionality:** Branch Leaders and HODs can review, approve, or reject leave applications submitted by their specific team members.

### 📊 Analytics
- **Personal Analytics (`/analytics`):**
  - **Functionality:** Provides individual employees with visual charts of their attendance trends, punctuality percentage, and remaining leave balances for the year.

---

## 3. HR ADMINISTRATION / MANAGEMENT (Access: Tier 3 Administrators)
This section provides global control over the company's workforce. It is hidden from standard employees.

### 📋 Leave Administration
- **Leave Approval (`/leave/admin`):**
  - **Functionality:** Centralized hub for HR to review all pending leaves across the entire company.
- **Leave Calendar (`/leave/calendar`):**
  - **Functionality:** A company-wide visual calendar showing exactly who is on leave on any given day, helping HR avoid manpower shortages.
- **Leave Entitlement Management (`/leave/entitlement`):**
  - **Functionality:** HR configures annual leave quotas. Allows HR to add/deduct Annual Leave, Medical Leave, or Unpaid Leave balances for specific employees.

### ✈️ Outstation Administration
- **Outstation Dashboard (`/outstation`):**
  - **Functionality:** High-level overview of how many staff are currently outstationed globally.
- **Outstation Assignment (`/outstation/assignment`):**
  - **Functionality:** HR can unilaterally assign an employee to an outstation task, overriding standard branch geofencing for that employee.
- **Outstation Analytics & Calendar:**
  - **Functionality:** Data charts and schedules mapping out all outstation activities company-wide.

### 👥 Employee Management
- **Employee Directory (`/employees`):**
  - **Functionality:** Master list of all staff. HR can edit profiles, assign branches, update contact details, and deactivate resigned staff.
- **Department & Role (`/master/department`, `/master/role`):**
  - **Functionality:** Configuration pages to create new departments, rename existing ones, and manage organizational roles.

### 🏢 Branch Management
- **Overview (`/branches`):**
  - **Functionality:** Manage the company's physical locations. HR configures the exact GPS coordinates (Latitude/Longitude) and allowed clock-in radius (e.g., 50 meters) for each branch.
- **Temporary Assignments (`/branches/temporary-assignments`):**
  - **Functionality:** Allows HR to temporarily reassign an employee to a different branch (e.g., sending a HQ staff to Kemaman for 2 weeks). The geofencing rules automatically adapt to the temporary branch for that duration.

### 📈 Workforce Analytics
- **Attendance Dashboard (`/hr-analytics/attendance`):**
  - **Functionality:** Live presence dashboard. Shows exactly how many staff are clocked in, who is late, and who is absent today across all branches in real-time.
- **Leave Analytics & Workforce Insights (`/hr-analytics/leave`, `/hr-analytics/workforce`):**
  - **Functionality:** Deep-dive charts showing absenteeism trends, most frequent leave-takers, demographic breakdowns, and department-by-department punctuality comparisons.

### 📑 Reports
- **Attendance, Leave, Outstation & Department Reports (`/reports/...`):**
  - **Functionality:** The data export center. HR can generate custom Microsoft Excel (CSV) or PDF reports based on date ranges, branches, or departments. Crucial for end-of-month payroll processing.

### 📍 GPS Location Tracker
- **Live Tracker (`/gps-location-tracker`):** *(Admins)*
  - **Functionality:** Plots clocked-in employees on a live map. Helps HR verify if outstation staff or temporary assignees are where they claim to be.
- **Location History (`/gps-location-tracker/history`):** *(Employees)*
  - **Functionality:** Employees can review a log of their own captured GPS coordinates for transparency.

### ⚙️ Settings
- **System Settings (`/settings`):** *(HR Admin Only)*
  - **Functionality:** Core application configuration. HR can adjust late thresholds (e.g., setting the official start time to 09:00 AM), customize UI themes, and manage notification preferences.
