# Rayhar Staff Portal HRMS — UI Typography & Layout Design System

> **Document Version:** 1.0.0  
> **Target Platform:** Rayhar Staff Portal (Web HRMS)  
> **Design Language Standard:** Enterprise GLC / MNC Corporate Software  
> **Brand Primary Theme:** Corporate Purple (`#7B0099` / `#942392`) & Corporate Slate (`#0F172A` / `#334155`)  
> **Status:** Official Frontend Architecture & Engineering Specification

---

## 1. Executive Summary & Design Philosophy

The **Rayhar Staff Portal HRMS** UI Typography & Layout Design System establishes an enterprise-grade standard tailored for corporate operations, regulatory compliance, and multi-tier organizational hierarchies (Government-Linked Companies / Multinational Corporation standard). 

### Core Design Tenets
1. **Compact & Information-Dense:** Optimized for high productivity. Screen real estate is maximized with compact padding (`py-2`, `px-3`), dense data grids, and reduced row heights to minimize excessive vertical scrolling.
2. **Clean Corporate Aesthetic:** Departure from overly rounded, cartoonish consumer mobile UI. Corners feature disciplined radii (`rounded-md` 6px to `rounded-xl` 12px), flat surfaces, subtle card elevations, and crisp 1px neutral borders (`#E2E8F0` / `#CBD5E1`).
3. **High Contrast & Readability:** Strict adherence to WCAG 2.1 AA standards. Body and table typography utilize slate dark tones (`#0F172A` and `#334155`) against crisp off-white/light backgrounds (`#F8FAFC`).
4. **Corporate Purple Identity:** The primary identity color is `#7B0099` (with deep accents at `#5A0073` and vibrant highlights at `#942392`). Bright yellow (`#FFFF00`) is reserved strictly for high-visibility active states and badges.
5. **Predictable Typography Hierarchy:** Developers and UI designers must not introduce arbitrary font sizes. Every label, header, and data cell must map directly to the defined scale.

---

## 2. Global Typography System

### 2.1 Font Family Stack

```css
/* Primary Application Font (Default for all UI, data tables, and forms) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Secondary / Display Font (Optional for executive KPI counters and page titles) */
font-family: 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif;

/* Monospace Stack (For GPS coordinates, timestamp logs, employee IDs, audit codes) */
font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

- **Primary:** `Inter` (Variable font supporting weights 400, 500, 600, 700, 800, 900)
- **Fallback:** `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`

---

### 2.2 Global Typography Scale & Specifications

| Scale Role | Font Size (px) | Tailwind Class | Font Weight | Line Height | Tracking | Text Transform | Default Color Token |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Display / Metric Hero** | 28px – 32px | `text-2xl` – `text-3xl` | Bold / Black (700/900) | 1.15 (115%) | `-0.02em` | Normal | `#0F172A` / `#7B0099` |
| **Page Title** | 22px – 24px | `text-xl` – `text-2xl` | Extra Bold / Black (800/900) | 1.25 (125%) | `-0.015em` | Uppercase | `#0F172A` (Dark: `#F8FAFC`) |
| **Section Header** | 16px – 18px | `text-base` – `text-lg` | Bold (700) | 1.3 (130%) | `-0.01em` | Normal / Uppercase | `#1E293B` |
| **Card / Modal Title** | 14px – 15px | `text-sm` – `text-[15px]` | Semi Bold (600/700) | 1.35 (135%) | `normal` | Normal / Uppercase | `#0F172A` |
| **Navigation Menu** | 12px – 13px | `text-xs` – `text-[13px]` | Medium / Semi Bold (500/600)| 1.4 (140%) | `+0.02em` | Normal / Uppercase | `#E2E8F0` / `#94A3B8` |
| **Table Header** | 11px – 12px | `text-[11px]` – `text-xs` | Bold / Black (700/800) | 1.4 (140%) | `+0.05em` | Uppercase | `#475569` |
| **Table Content** | 12px – 13px | `text-xs` – `text-[13px]` | Regular / Medium (400/500) | 1.45 (145%) | `normal` | Normal | `#1E293B` |
| **Form Label** | 11px – 12px | `text-[11px]` – `text-xs` | Bold / Black (700/800) | 1.3 (130%) | `+0.04em` | Uppercase | `#334155` |
| **Input Text** | 12px – 13px | `text-xs` – `text-[13px]` | Medium (500) | 1.4 (140%) | `normal` | Normal | `#0F172A` |
| **Button Text** | 11px – 13px | `text-[11px]` – `text-xs` | Bold / Black (700/800) | 1.2 (120%) | `+0.03em` | Uppercase | `#FFFFFF` |
| **Badge / Status Tag** | 10px – 11px | `text-[10px]` – `text-[11px]` | Extra Bold (800) | 1.2 (120%) | `+0.05em` | Uppercase | Contextual |
| **Helper / Caption** | 10px – 11px | `text-[10px]` – `text-xs` | Regular / Medium (400/500) | 1.35 (135%) | `normal` | Normal / Italic | `#64748B` |
| **Code / Coordinates**| 11px – 12px | `text-[11px]` – `text-xs` | Semi Bold (600) | 1.3 (130%) | `0` | Normal (Mono) | `#7B0099` |

---

### 2.3 Color Palette & Semantic Color Tokens

```
/* Primary Corporate Brand */
--brand-purple-900: #3D0052;  /* Dark purple container gradient end */
--brand-purple-800: #5A0073;  /* Deep header & active card accents */
--brand-purple-700: #7B0099;  /* Core enterprise brand purple */
--brand-purple-600: #942392;  /* Vibrant interactive purple buttons */
--brand-purple-100: #F3E8F5;  /* Subtle purple tint for card icons */
--brand-yellow-400: #FFFF00;  /* Active indicator & high-contrast tab highlight */

/* Neutral Greys & Slates (Enterprise High Readability) */
--slate-900:        #0F172A;  /* Primary headings, titles, dark contrast text */
--slate-800:        #1E293B;  /* Table rows, inputs, strong body text */
--slate-700:        #334155;  /* Form labels, secondary text */
--slate-500:        #64748B;  /* Captions, muted timestamps, table icons */
--slate-400:        #94A3B8;  /* Placeholder text, disabled labels */
--slate-200:        #E2E8F0;  /* Corporate borders, divider rules */
--slate-100:        #F1F5F9;  /* Table alternate striping, button backgrounds */
--slate-50:         #F8FAFC;  /* Application background canvas */

/* Semantic Status Tokens */
--status-success:   #10B981;  /* Present, Approved, Active, Geofence Verified */
--status-warning:   #F59E0B;  /* Pending, In Review, Expiring Soon */
--status-danger:    #EF4444;  /* Absent, Rejected, Out of Bounds, Overdue */
--status-info:      #3B82F6;  /* Outstation, Medical, Adjustment, Info Note */
```

---

## 3. System-Wide Structural UI Components

### 3.1 Header & Topbar
- **Component:** Global Application Topbar (`AppLayout.tsx`)
- **Breadcrumb:**
  - Font: `Inter` | 11px | Bold (700) | Uppercase | Tracking: `+0.05em` | Color: `#FFFFFF`
  - Separator (`>`): Font: `Inter` | 11px | Regular | Color: `rgba(255, 255, 255, 0.4)`
- **User Profile Pill (Right):**
  - Staff Name: `Inter` | 11px | Extra Bold (800) | Uppercase | Color: `#FFFFFF`
  - Designation/Branch: `Inter` | 9px | Semi Bold (600) | Uppercase | Color: `rgba(255, 255, 255, 0.75)`
- **Header Action Buttons:**
  - Refresh / Dark Mode / Notification Counter: Compact 32px height, Icon 14px, Badge `Inter` 10px Bold.

---

### 3.2 Sidebar Navigation (Main Navigation)
- **Section Headers (`MAIN NAVIGATION`, `HR ADMINISTRATION`):**
  - Font: `Inter` | 10px | Extra Bold (800) | Uppercase | Tracking: `+0.08em` | Color: `#94A3B8`
- **Navigation Links (Inactive):**
  - Font: `Inter` | 12px | Medium (500) | Normal / Title Case | Color: `#CBD5E1` | Icon Size: 16px
- **Navigation Links (Active):**
  - Font: `Inter` | 12px | Bold (700) | Color: `#FFFFFF` | Background: `rgba(123, 0, 153, 0.45)` with 3px solid `#FFFF00` left accent.
- **Sub-Menu Child Links:**
  - Font: `Inter` | 11px | Regular / Medium (400/500) | Color: `#94A3B8` | Indent: `pl-9`

---

### 3.3 Cards & Containers
- **Border:** `1px solid #E2E8F0` (Dark: `1px solid rgba(255, 255, 255, 0.08)`)
- **Radius:** `rounded-xl` (12px) for main content cards; `rounded-lg` (8px) for inner modules.
- **Padding:** Compact `p-4` or `p-5` (never exceeding `p-6` to preserve vertical height).
- **Card Title:**
  - Font: `Inter` | 14px – 15px | Extra Bold (800) | Uppercase | Color: `#0F172A`
- **Card Subtitle / Description:**
  - Font: `Inter` | 10px – 11px | Regular (400) / Italic | Color: `#64748B`

---

### 3.4 Data Tables
- **Header Row (`<th>`):**
  - Height: `h-10` (40px)
  - Font: `Inter` | 11px | Extra Bold (800) | Uppercase | Tracking: `+0.05em` | Color: `#475569`
  - Background: `#F8FAFC`
  - Border: `border-b border-[#E2E8F0]`
- **Body Row (`<td>`):**
  - Height: `h-12` (48px)
  - Font: `Inter` | 12px – 13px | Regular (400) / Medium (500) | Color: `#1E293B`
  - Alternate row striping: Optional `even:bg-slate-50/50`
  - Border: `border-b border-[#E2E8F0]/60`

---

### 3.5 Forms & Form Controls
- **Input Fields & Select Boxes:**
  - Height: `h-10` (40px) standard; `h-9` (36px) compact in filters.
  - Font: `Inter` | 12px | Medium (500) | Color: `#0F172A`
  - Placeholder: `Inter` | 12px | Regular (400) | Color: `#94A3B8` | Normal Case
  - Border: `1px solid #CBD5E1` | Focus: `border-[#7B0099] ring-2 ring-[#7B0099]/15`
- **Form Field Labels:**
  - Font: `Inter` | 10px – 11px | Extra Bold (800) | Uppercase | Tracking: `+0.04em` | Color: `#334155`
- **Helper & Validation Messages:**
  - Font: `Inter` | 10px | Medium (500) | Error: `#EF4444` | Helper: `#64748B`

---

### 3.6 Buttons & Action Controls
- **Primary Action (Brand Purple):**
  - Height: `h-10` (40px) | Padding: `px-5`
  - Font: `Inter` | 11px | Black / Extra Bold (800/900) | Uppercase | Tracking: `+0.04em` | Color: `#FFFFFF`
  - Background: `#7B0099` (Hover: `#5A0073`) | Radius: `rounded-xl`
- **Secondary / Discard Button:**
  - Height: `h-10` (40px) | Padding: `px-4`
  - Font: `Inter` | 11px | Bold (700) | Uppercase | Tracking: `+0.03em` | Color: `#334155`
  - Background: `#FFFFFF` | Border: `1px solid #CBD5E1` (Hover: `#F1F5F9`)
- **Table Row Micro Action Button:**
  - Height: `h-7` (28px) | Padding: `px-2.5`
  - Font: `Inter` | 10px | Bold (700) | Uppercase | Color: `#7B0099` | Background: `rgba(123, 0, 153, 0.08)`

---

### 3.7 Status Badges & Pills
- **Container:** `py-0.5 px-2` | Height: `h-5` (20px) | Radius: `rounded-md` (not overly rounded)
- **Typography:** `Inter` | 9.5px – 10px | Extra Bold (800) | Uppercase | Tracking: `+0.06em`
- **Color Codes:**
  - `ACTIVE` / `PRESENT` / `APPROVED`: Text `#065F46`, Bg `#D1FAE5`, Border `#A7F3D0`
  - `PENDING` / `IN REVIEW`: Text `#92400E`, Bg `#FEF3C7`, Border `#FDE68A`
  - `REJECTED` / `ABSENT` / `LATE`: Text `#991B1B`, Bg `#FEE2E2`, Border `#FECACA`
  - `OUTSTATION` / `MEDICAL`: Text `#1E40AF`, Bg `#DBEAFE`, Border `#BFDBFE`

---

## 4. Page-by-Page Typography & Layout Specifications

```
PAGE INDEX:
1. Login Page (/login)
2. Executive / HR Admin Dashboard (/)
3. Employee Personal Dashboard (/)
4. Attendance Management & Review (/hr-analytics/attendance, /team-attendance)
5. My Attendance & Clock-In Hub (/attendance)
6. Outstation Management (/outstation, /outstation/my)
7. Leave Application Form (/leave/apply)
8. Leave Approval Hub (/leave/admin, /leave/approval)
9. Company Leave Calendar (/calendar/company-leave)
10. Leave Entitlement Management (/leave/entitlement)
11. Employee Profile & Dossier (/profile)
12. Employee Directory & Management (/employees)
13. Branch Management & Geofencing (/branches)
14. Multi-Company & Organization Management (/master, /master/department)
15. Reports & Analytics Center (/reports)
16. Workforce Insights Dashboard (/hr-analytics/workforce)
17. Portal Configurations / Settings (/settings)
```

---

### Page 1: Login Page

- **Route:** `/login`
- **Purpose:** Secure enterprise portal authentication with role credentials and multi-factor session handoff.
- **Layout Structure:** Dual-pane layout. Left pane features corporate branding banner with dark purple gradient; Right pane features clean white centered authentication card (`w-full max-w-md`).
- **Typography Hierarchy:**
  - Brand Tagline: `Inter` | 24px | Black (900) | Uppercase | Color: `#FFFFFF`
  - Card Header: `Inter` | 20px | Extra Bold (800) | Uppercase | Color: `#0F172A`
  - Subtitle: `Inter` | 12px | Regular (400) | Color: `#64748B`
  - Input Labels: `Inter` | 11px | Bold (700) | Uppercase | Color: `#334155`
  - Inputs: `Inter` | 13px | Medium (500) | Color: `#0F172A`
  - Submit Button: `Inter` | 12px | Extra Bold (800) | Uppercase | Color: `#FFFFFF`
  - Footer Copyright: `Inter` | 10px | Regular (400) | Color: `#94A3B8`

#### Visual Wireframe Layout
```
+-----------------------------------+-----------------------------------+
| BRAND BANNER PANE                 | AUTHENTICATION CARD PANE          |
|                                   |                                   |
| RAYHAR GROUP                      | SIGN IN TO PORTAL                 |
| [Font: Inter | 26px | Black]      | [Font: Inter | 20px | Extra Bold] |
|                                   |                                   |
| Enterprise HRMS Portal            | Enter your credentials to access  |
| [Font: Inter | 14px | Medium]     | [Font: Inter | 12px | Regular]    |
|                                   |                                   |
|                                   | WORK EMAIL ADDRESS                |
|                                   | [Font: Inter | 11px | Bold]       |
|                                   | [ employee@rayhar.com           ] |
|                                   | [Font: Inter | 13px | Medium]     |
|                                   |                                   |
|                                   | PASSWORD                          |
|                                   | [Font: Inter | 11px | Bold]       |
|                                   | [ •••••••••••••••••             ] |
|                                   | [Font: Inter | 13px | Medium]     |
|                                   |                                   |
|                                   | [ LOGIN TO SYSTEM               ] |
|                                   | [Font: Inter | 12px | Black]      |
|                                   |                                   |
|                                   | © 2026 Rayhar Group. All rights.  |
|                                   | [Font: Inter | 10px | Regular]    |
+-----------------------------------+-----------------------------------+
```

---

### Page 2: Executive / HR Admin Dashboard

- **Route:** `/` (Role: `hr_admin`, `managing_director`, `operation_manager`)
- **Purpose:** Executive command center displaying real-time workforce operational stats, late-in ratios, and approval queues.
- **Layout Structure:** 4-column KPI metric summary row on top, followed by 2-column split (Left 65%: Real-time attendance feed & branch presence chart; Right 35%: Pending approvals dock & urgent alerts).
- **Typography Hierarchy:**
  - Page Title: `Inter` | 22px | Black (900) | Uppercase | Color: `#0F172A`
  - Breadcrumb: `Inter` | 10px | Bold (700) | Uppercase | Color: `#64748B`
  - KPI Hero Value: `Inter` | 28px | Black (900) | Color: `#0F172A`
  - KPI Label: `Inter` | 10px | Extra Bold (800) | Uppercase | Tracking: `+0.05em` | Color: `#64748B`
  - Card Title: `Inter` | 14px | Extra Bold (800) | Uppercase | Color: `#0F172A`
  - Feed Employee Name: `Inter` | 12px | Semi Bold (600) | Color: `#1E293B`
  - Timestamp Log: `Inter` | 11px | Medium (500) | Monospace / Slate `#64748B`

#### Visual Wireframe Layout
```
PAGE TITLE: HR EXECUTIVE DASHBOARD
[Font: Inter | 22px | Black | Uppercase]
HOME > HR MANAGEMENT > DASHBOARD
[Font: Inter | 10px | Bold | Uppercase]

+--------------------+--------------------+--------------------+--------------------+
| TOTAL STAFF        | CLOCKED IN TODAY   | LATE ARRIVALS      | ON LEAVE TODAY     |
| [Font: Inter|10px] | [Font: Inter|10px] | [Font: Inter|10px] | [Font: Inter|10px] |
| 142                | 128                | 6                  | 8                  |
| [Font: Inter|28px] | [Font: Inter|28px] | [Font: Inter|28px] | [Font: Inter|28px] |
| +2 from yesterday  | 90.1% Present      | Grace threshold    | Approved leaves    |
| [Font: Inter|10px] | [Font: Inter|10px] | [Font: Inter|10px] | [Font: Inter|10px] |
+--------------------+--------------------+--------------------+--------------------+

+---------------------------------------------+-------------------------------------+
| TODAY'S ATTENDANCE BREAKDOWN BY BRANCH      | PENDING APPROVAL QUEUE              |
| [Font: Inter | 14px | Extra Bold]           | [Font: Inter | 14px | Extra Bold]   |
|                                             |                                     |
| HQ KUALA LUMPUR                             | NURUL ATHIRAH — ANNUAL LEAVE        |
| Present: 48 | Late: 2 | Absent: 1           | 2 Days (28 Oct - 29 Oct 2026)       |
| [Font: Inter | 12px | Regular]              | [Font: Inter | 12px | Medium]       |
|                                             | [ APPROVE ]        [ REJECT ]       |
| KEMAMAN BRANCH                              | [Font: Inter|10px] [Font: Inter|10px] |
| Present: 22 | Late: 1 | Absent: 0           |                                     |
+---------------------------------------------+-------------------------------------+
```

---

### Page 3: Employee Personal Dashboard

- **Route:** `/` (Role: `employee`, `branch_officer`)
- **Purpose:** Personal portal for daily attendance status, quick clock-in shortcut, leave balance quotas, and work notifications.
- **Layout Structure:** Top personal welcome greeting with current time & branch assignment. Followed by 3-column KPI cards (Working hours, Leave days remaining, Outstation schedule) and recent punch records.
- **Typography Hierarchy:**
  - Welcome Header: `Inter` | 20px | Extra Bold (800) | Color: `#0F172A`
  - Current Date/Branch: `Inter` | 12px | Medium (500) | Color: `#64748B`
  - Quick Clock Button: `Inter` | 13px | Black (900) | Uppercase | Color: `#FFFFFF`
  - Metric Numbers: `Inter` | 24px | Bold (700) | Color: `#7B0099`

#### Visual Wireframe Layout
```
WELCOME BACK, AHMAD FAIZAL
[Font: Inter | 20px | Extra Bold]
Monday, 26 October 2026 | HQ Umrah (BHU) — Normal Shift (09:00 AM - 06:00 PM)
[Font: Inter | 12px | Medium]

+-----------------------------+-----------------------------+-----------------------------+
| MONTHLY ATTENDANCE RATE     | ANNUAL LEAVE BALANCE        | NEXT OUTSTATION ASSIGNMENT  |
| [Font: Inter | 10px | Bold] | [Font: Inter | 10px | Bold] | [Font: Inter | 10px | Bold] |
| 98.4%                       | 11.5 Days                   | 02 Nov 2026 (Alor Setar)    |
| [Font: Inter | 24px | Bold] | [Font: Inter | 24px | Bold] | [Font: Inter | 14px | Bold] |
| 0 Days Late in October      | 2.5 Days Taken This Year    | Approved by Branch Manager  |
| [Font: Inter | 11px | Reg]  | [Font: Inter | 11px | Reg]  | [Font: Inter | 11px | Reg]  |
+-----------------------------+-----------------------------+-----------------------------+

[ CLOCK IN NOW (VERIFY GPS) ]                     [ APPLY FOR LEAVE ]
[Font: Inter | 13px | Black | Uppercase]          [Font: Inter | 13px | Bold | Uppercase]
```

---

### Page 4: Attendance Management & Review

- **Route:** `/hr-analytics/attendance`, `/team-attendance`
- **Purpose:** Administrative overview and supervisor review of daily staff punch records, branch punctuality, and geofence verification.
- **Layout Structure:** Top filter bar (Date picker, Branch selector, Department dropdown, Status pill filter). Followed by dense enterprise data table with sortable columns and action drawers.
- **Typography Hierarchy:**
  - Page Title: `Inter` | 22px | Black (900) | Uppercase
  - Filter Label: `Inter` | 10px | Bold (700) | Uppercase | Color: `#475569`
  - Filter Input: `Inter` | 12px | Medium (500) | Color: `#0F172A`
  - Table Header: `Inter` | 11px | Extra Bold (800) | Uppercase | Color: `#475569`
  - Employee Cell Name: `Inter` | 12px | Bold (700) | Color: `#0F172A`
  - Employee Cell ID: `Inter` | 10px | Medium (500) | Color: `#64748B`
  - Punch In/Out Time: `Inter` | 12px | Medium (500) | Monospace `#1E293B`
  - Variance (Late mins): `Inter` | 11px | Bold (700) | Color: `#EF4444`

#### Visual Wireframe Layout
```
PAGE TITLE: ATTENDANCE MONITORING & TEAM RECORDS
[Font: Inter | 22px | Black | Uppercase]

FILTERS:
[ BRANCH: ALL BRANCHES v ]  [ DEPT: OPERATIONS v ]  [ DATE: 26/10/2026 ]  [ STATUS: ALL v ]
[Font: Inter | 11px | Bold] [Font: Inter | 11px]    [Font: Inter | 11px]  [Font: Inter | 11px]

+-----------------------------------------------------------------------------------------+
| EMP NAME & ID        | BRANCH     | IN TIME  | OUT TIME | LATE (MIN) | STATUS  | ACTION   |
| [Font: Inter | 11px] | [Inter|11] | [Inter]  | [Inter]  | [Inter|11] | [Inter] | [Inter]  |
+----------------------+------------+----------+----------+------------+---------+----------+
| ZULKIFLI BIN HASSAN  | HQ Umrah   | 08:52 AM | --:-- -- | 0 mins     | PRESENT | [VIEW]   |
| EMP-00142            |            |          |          |            | (Green) |          |
| [Inter | 12px Bold]  | [Inter|12] | [Inter]  | [Inter]  | [Inter|11] | [Badge] | [Button] |
+----------------------+------------+----------+----------+------------+---------+----------+
| FATIMAH AZ-ZAHRA     | Kemaman    | 09:14 AM | --:-- -- | +14 mins   | LATE    | [VIEW]   |
| EMP-00208            |            |          |          |            | (Amber) |          |
+-----------------------------------------------------------------------------------------+
Showing 1 to 25 of 142 records | [PREVIOUS] 1 2 3 4 5 [NEXT]
[Font: Inter | 11px | Regular]   [Font: Inter | 11px | Bold]
```

---

### Page 5: My Attendance & Clock-In Hub

- **Route:** `/attendance`
- **Purpose:** Personal daily attendance portal for GPS location geofencing, clocking in/out, and viewing personal timesheets.
- **Layout Structure:** 2-column layout. Left column (40%): Live GPS map with radial geofence boundary (50m radius) and Clock In/Out action panel. Right column (60%): Monthly attendance log and cumulative hour metrics.
- **Typography Hierarchy:**
  - Live Digital Clock: `Inter` | 32px | Black (900) | Color: `#7B0099`
  - GPS Status Pill: `Inter` | 10px | Extra Bold (800) | Uppercase | Green / Red
  - Distance Metric: `Inter` | 12px | Bold (700) | Color: `#1E293B`
  - Clock In Button: `Inter` | 14px | Black (900) | Uppercase | `#FFFFFF` on `#7B0099`

#### Visual Wireframe Layout
```
MY ATTENDANCE & PUNCH HUB
[Font: Inter | 22px | Black | Uppercase]

+-------------------------------------------+---------------------------------------------+
| GEOLOCATION PUNCH TERMINAL                | OCTOBER 2026 PUNCH SUMMARY                  |
| [Font: Inter | 14px | Extra Bold]         | [Font: Inter | 14px | Extra Bold]           |
|                                           |                                             |
| 10:14:32 AM                               | TOTAL HOURS: 168.5 Hrs | ON TIME: 21 Days   |
| [Font: Inter | 32px | Black | #7B0099]    | [Font: Inter | 12px | Bold | Slate]         |
|                                           |                                             |
| MAP GEOFENCE: HQ UMRAH (BHU)              | DATE       | IN       | OUT      | STATUS   |
| GPS Accuracy: +/- 4 meters (Verified)     | [Inter|11] | [Inter]  | [Inter]  | [Inter]  |
| [Font: Inter | 11px | Semi Bold]          | 26/10/2026 | 08:52 AM | --:-- -- | PRESENT  |
| Distance to Branch Center: 12 meters      | 25/10/2026 | 08:59 AM | 06:05 PM | PRESENT  |
| [Font: Inter | 12px | Bold | Green]       | 24/10/2026 | 09:12 AM | 06:02 PM | LATE     |
|                                           |                                             |
| [ CLOCK OUT (END SHIFT) ]                 | [ DOWNLOAD TIMESHEET REPORT (PDF) ]         |
| [Font: Inter | 14px | Black | Uppercase]  | [Font: Inter | 11px | Bold | Uppercase]     |
+-------------------------------------------+---------------------------------------------+
```

---

### Page 6: Outstation Management

- **Route:** `/outstation`, `/outstation/my`
- **Purpose:** Manage outstation duty assignments, client trips, cross-branch assignments, and temporary geofence overrides.
- **Layout Structure:** Top action bar with "Request Outstation Duty" button. Tabbed navigation (Active Outstation, Upcoming, Past History). Grid of outstation assignment cards with travel details and approval tracking.
- **Typography Hierarchy:**
  - Destination City: `Inter` | 15px | Extra Bold (800) | Uppercase | Color: `#0F172A`
  - Travel Dates: `Inter` | 12px | Semi Bold (600) | Color: `#7B0099`
  - Purpose Tag: `Inter` | 10px | Bold (700) | Uppercase | Badge
  - Approver Note: `Inter` | 11px | Regular (400) | Italic | Color: `#64748B`

#### Visual Wireframe Layout
```
OUTSTATION DUTY MANAGEMENT
[Font: Inter | 22px | Black | Uppercase]

[ + NEW OUTSTATION REQUEST ]               [ EXPORT OUTSTATION CALENDAR ]
[Font: Inter | 11px | Black | Uppercase]   [Font: Inter | 11px | Bold]

+-----------------------------------------------------------------------------------------+
| DESTINATION: ALOR SETAR BRANCH & NORTHERN CLIENTS                                       |
| [Font: Inter | 15px | Extra Bold | Uppercase]                                           |
| Period: 02 Nov 2026 - 06 Nov 2026 (5 Days) | Client: Tabung Haji Pilgrimage Briefing     |
| [Font: Inter | 12px | Semi Bold | #7B0099] | [Font: Inter | 12px | Regular]            |
| Status: APPROVED BY HEAD OF DEPARTMENT                                                  |
| [Font: Inter | 10px | Extra Bold | Green Badge]                                         |
| Temporary Geofence: Alor Setar Branch Coordinates Activated for Clock In               |
| [Font: Inter | 11px | Medium | Italic | Slate]                                          |
+-----------------------------------------------------------------------------------------+
```

---

### Page 7: Leave Application Form

- **Route:** `/leave/apply`
- **Purpose:** Employee self-service form to apply for Annual, Medical, Emergency, Maternity, or Unpaid Leave with attachment upload.
- **Layout Structure:** Centered single-column enterprise form card (`max-w-3xl`) with 2-column grid fields and document attachment dropzone.
- **Typography Hierarchy:**
  - Form Header: `Inter` | 16px | Extra Bold (800) | Uppercase | Color: `#0F172A`
  - Input Labels: `Inter` | 11px | Bold (700) | Uppercase | Tracking: `+0.04em` | Color: `#334155`
  - Quota Indicator: `Inter` | 11px | Bold (700) | Color: `#7B0099`
  - Discard Button: `Inter` | 11px | Bold (700) | Uppercase | `#334155`
  - Submit Button: `Inter` | 11px | Black (900) | Uppercase | `#FFFFFF`

#### Visual Wireframe Layout
```
LEAVE APPLICATION
[Font: Inter | 22px | Black | Uppercase]

+-----------------------------------------------------------------------------------------+
| NEW LEAVE SUBMISSION                                                                    |
| [Font: Inter | 16px | Extra Bold | Uppercase]                                           |
| Fill in all required parameters. Balance will be reserved upon submission.              |
| [Font: Inter | 11px | Regular | Italic | #64748B]                                       |
|                                                                                         |
| LEAVE TYPE                                  | AVAILABLE ENTITLEMENT                     |
| [ ANNUAL LEAVE v ]                          | 11.5 Days Remaining in 2026               |
| [Font: Inter | 12px | Medium]               | [Font: Inter | 11px | Bold | #7B0099]     |
|                                             |                                           |
| START DATE                                  | END DATE                                  |
| [ 28/10/2026 ]                              | [ 29/10/2026 ]                            |
|                                             |                                           |
| TOTAL WORKING DAYS DEDUCTED: 2.0 DAYS                                                   |
| [Font: Inter | 12px | Extra Bold | #0F172A]                                             |
|                                                                                         |
| REASON / JUSTIFICATION                                                                  |
| [ Family matters and personal obligations in Terengganu.                              ] |
| [Font: Inter | 12px | Regular]                                                          |
|                                                                                         |
| [ DISCARD CHANGES ]                         | [ SUBMIT LEAVE APPLICATION ]              |
| [Font: Inter | 11px | Bold | Uppercase]     | [Font: Inter | 11px | Black | Uppercase]  |
+-----------------------------------------------------------------------------------------+
```

---

### Page 8: Leave Approval Hub

- **Route:** `/leave/admin`, `/leave/approval`, `/leave/team`
- **Purpose:** Centralized workflow interface for Branch Leaders, HODs, and HR Admins to approve, reject, or request clarification on staff leaves.
- **Layout Structure:** Top metric pills (Pending count, Approved today, Urgent). Filter strip (Department, Leave Type). Full-width interactive approval queue table with inline document viewer modal.
- **Typography Hierarchy:**
  - Queue Header: `Inter` | 14px | Extra Bold (800) | Uppercase
  - Staff Name: `Inter` | 13px | Bold (700) | Color: `#0F172A`
  - Leave Dates: `Inter` | 12px | Semi Bold (600) | Color: `#7B0099`
  - Balance Check: `Inter` | 10px | Medium (500) | Color: `#64748B`
  - Inline Action: `Inter` | 10px | Extra Bold (800) | Uppercase

#### Visual Wireframe Layout
```
LEAVE APPROVAL ADMINISTRATION
[Font: Inter | 22px | Black | Uppercase]

+--------------------+--------------------+--------------------+
| PENDING APPROVALS  | APPROVED THIS WEEK | REJECTED THIS WEEK |
| 14 Applications    | 32 Applications    | 2 Applications     |
| [Font: Inter|18px] | [Font: Inter|18px] | [Font: Inter|18px] |
+--------------------+--------------------+--------------------+

+-----------------------------------------------------------------------------------------+
| APPLICANT & DEPT   | LEAVE TYPE  | DATES & DURATION    | BALANCE | ATTACHMENT | ACTIONS |
| [Inter | 11px Bold]| [Inter|11]  | [Inter | 11px]      | [Inter] | [Inter]    | [Inter] |
+--------------------+-------------+---------------------+---------+------------+---------+
| SITI NORHALIZA     | Medical     | 27/10/2026 (1 Day)  | 14 Days | [ MC.PDF ] | [APPROVE|
| Customer Service   | (MC)        | Hospital Kemaman    | Left    | [10px Blue]| [REJECT]|
| [Inter | 13px Bold]| [Badge]     | [Inter | 12px]      | [Inter] | [Link]     | [Buttons|
+-----------------------------------------------------------------------------------------+
```

---

### Page 9: Company Leave Calendar

- **Route:** `/calendar/company-leave`
- **Purpose:** Official enterprise holiday calendar detailing Malaysian Federal public holidays, state holidays (Terengganu, Kedah, Selangor, etc.), and corporate shutdowns.
- **Layout Structure:** Full-screen monthly calendar grid with month navigation, state holiday toggle filters, and side drawer listing upcoming holidays.
- **Typography Hierarchy:**
  - Month/Year Heading: `Inter` | 20px | Extra Bold (800) | Color: `#0F172A`
  - Day of Week Header: `Inter` | 11px | Extra Bold (800) | Uppercase | `#64748B`
  - Calendar Day Number: `Inter` | 14px | Semi Bold (600) | Color: `#1E293B`
  - Event Tag Text: `Inter` | 10px | Bold (700) | Truncate | Color: `#FFFFFF`

#### Visual Wireframe Layout
```
COMPANY HOLIDAY & LEAVE CALENDAR
[Font: Inter | 22px | Black | Uppercase]

< OCTOBER 2026 >                                 [ STATE FILTER: TERENGGANU & ALL v ]
[Font: Inter | 20px | Extra Bold]                [Font: Inter | 11px | Bold]

+---------+---------+---------+---------+---------+---------+---------+
| MON     | TUE     | WED     | THU     | FRI     | SAT     | SUN     |
| [Inter] | [Inter] | [Inter] | [Inter] | [Inter] | [Inter] | [Inter] |
+---------+---------+---------+---------+---------+---------+---------+
| 28      | 29      | 30      | 1       | 2       | 3       | 4       |
|         |         |         |         |         | [HOLIDAY]         |
+---------+---------+---------+---------+---------+---------+---------+
| 26      | 27      | 28      | 29      | 30      | 31      | 1       |
| TODAY   |         |         |         |         |         |         |
+---------+---------+---------+---------+---------+---------+---------+
```

---

### Page 10: Leave Entitlement Management

- **Route:** `/leave/entitlement`, `/master/leave-entitlement`
- **Purpose:** HR administration tool for setting annual leave quotas, service tenure increments, carry-forward rollover rules, and manual quota adjustments.
- **Layout Structure:** Top statistical summary cards (Total Staff, Carry-Forward Eligible, Expiring Leaves). Filter bar (Branch, Department, Leave Year). Comprehensive tabular editor with inline quota adjustment modal.
- **Typography Hierarchy:**
  - Page Title: `Inter` | 22px | Black (900) | Uppercase
  - Column Metric: `Inter` | 12px | Bold (700) | Monospace / Slate `#0F172A`
  - Adjustment Button: `Inter` | 10px | Extra Bold (800) | Uppercase

#### Visual Wireframe Layout
```
LEAVE ENTITLEMENT CONFIGURATION
[Font: Inter | 22px | Black | Uppercase]

+--------------------+--------------------+--------------------+--------------------+
| TOTAL EMPLOYEES    | CARRY FORWARD ELIG | PENDING ADJUST     | EXPIRING IN 60 D   |
| 142 Staff          | 38 Staff           | 4 Requests         | 18.5 Days          |
| [Font: Inter|18px] | [Font: Inter|18px] | [Font: Inter|18px] | [Font: Inter|18px] |
+--------------------+--------------------+--------------------+--------------------+

+-----------------------------------------------------------------------------------+
| STAFF NAME & CODE | BASE AL | TENURE BONUS | ADJUSTED | TAKEN | BALANCE | ACTIONS |
| [Inter | 11px]    | [Inter] | [Inter]      | [Inter]  | [Int] | [Inter] | [Inter] |
+-------------------+---------+--------------+----------+-------+---------+---------+
| NURUL ATHIRAH     | 14.0    | +2.0 Days    | 16.0     | 4.5   | 11.5    | [ADJUST]|
| EMP-00088 (HQ)    | Days    | (5 Yrs Svc)  | Days     | Days  | Days    | [EDIT]  |
+-----------------------------------------------------------------------------------+
```

---

### Page 11: Employee Profile & Dossier

- **Route:** `/profile`
- **Purpose:** Comprehensive staff dossier detailing personal contact info, company employment details, reporting manager, emergency contacts, and official documents.
- **Layout Structure:** Left column (30%): Profile avatar, employee code, active status badge, primary email/phone, quick shortcuts. Right column (70%): Tabbed panels (Personal Info, Employment & Job Grade, Leave Entitlements, Security Credentials).
- **Typography Hierarchy:**
  - Staff Full Name: `Inter` | 18px | Black (900) | Uppercase | Color: `#0F172A`
  - Designation: `Inter` | 12px | Semi Bold (600) | Color: `#7B0099`
  - Section Header: `Inter` | 13px | Extra Bold (800) | Uppercase | `#334155`
  - Field Key / Label: `Inter` | 10px | Bold (700) | Uppercase | `#64748B`
  - Field Value: `Inter` | 13px | Medium (500) | Color: `#0F172A`

#### Visual Wireframe Layout
```
EMPLOYEE PROFILE DOSSIER
[Font: Inter | 22px | Black | Uppercase]

+-----------------------------------+-----------------------------------------------------+
| [ AVATAR PHOTO ]                  | PERSONAL & EMPLOYMENT DETAILS                       |
|                                   | [Font: Inter | 14px | Extra Bold | Uppercase]       |
| NURUL ATHIRAH ABDUL RAHMAN        |                                                     |
| [Font: Inter | 18px | Black]      | NATIONAL ID (NRIC)        | DATE OF JOINING         |
| HR ADMIN OFFICER                  | 940512-11-XXXX            | 01 MARCH 2021           |
| [Font: Inter | 12px | Semi Bold]  | [Font: Inter | 13px]      | [Font: Inter | 13px]    |
|                                   |                                                     |
| STATUS: ACTIVE EMPLOYEE           | REPORTING SUPERVISOR      | BRANCH LOCATION         |
| [Font: Inter | 10px | Badge]      | HAJI WAN ZULKIFLI (HOD)   | HQ UMRAH (BHU)          |
| Employee ID: RAY-HQ-0088          | [Font: Inter | 13px]      | [Font: Inter | 13px]    |
| [Font: Inter | 11px | Mono]       |                                                     |
|                                   | EMERGENCY CONTACT PERSON  | RELATIONSHIP & PHONE    |
| [ UPDATE PROFILE PHOTO ]          | EN. ABDUL RAHMAN          | FATHER (+6012-9876543)  |
| [Font: Inter | 10px | Bold]       | [Font: Inter | 13px]      | [Font: Inter | 13px]    |
+-----------------------------------+-----------------------------------------------------+
```

---

### Page 12: Employee Directory & Management

- **Route:** `/employees`
- **Purpose:** Master workforce directory for HR to onboard new staff, edit job grades, transfer branches, and manage account statuses.
- **Layout Structure:** Top control bar (Search by name/ID, Branch filter, Department filter, "+ Onboard New Employee" button). Dense enterprise table with profile avatars, contact links, and dropdown management menus.
- **Typography Hierarchy:**
  - Table Record Count: `Inter` | 12px | Medium (500) | Color: `#64748B`
  - Staff Name: `Inter` | 13px | Bold (700) | Color: `#0F172A`
  - Role / Grade: `Inter` | 11px | Semi Bold (600) | Color: `#7B0099`

#### Visual Wireframe Layout
```
EMPLOYEE DIRECTORY & WORKFORCE MASTER
[Font: Inter | 22px | Black | Uppercase]

[ SEARCH EMPLOYEE NAME OR ID...        ]  [ BRANCH: ALL v ]  [ + ONBOARD NEW STAFF ]
[Font: Inter | 12px | Medium]              [Font: Inter|11px] [Font: Inter|11px|Black]

+-----------------------------------------------------------------------------------------+
| EMP ID   | EMPLOYEE NAME        | BRANCH         | DEPARTMENT   | ROLE       | STATUS   |
| [Inter]  | [Inter | 11px Bold]  | [Inter | 11px] | [Inter|11px] | [Inter|11] | [Inter]  |
+----------+----------------------+----------------+--------------+------------+---------+
| RAY-0088 | NURUL ATHIRAH        | HQ Umrah (BHU) | Human Res    | HR Admin   | ACTIVE   |
| RAY-0104 | MOHD SHAFIQ          | Kemaman Branch | Operations   | Officer    | ACTIVE   |
| RAY-0112 | WAN NOR AISYAH       | Alor Setar     | Marketing    | Exec       | ON LEAVE |
+-----------------------------------------------------------------------------------------+
Showing 1 - 10 of 142 Employees | Page 1 of 15
```

---

### Page 13: Branch Management & Geofencing

- **Route:** `/branches`, `/branches/temporary-assignments`
- **Purpose:** Manage corporate regional branch offices, map coordinate pinpoints, geofence radius boundaries, and temporary staff relocations.
- **Layout Structure:** Split layout. Top half: Interactive Maplibre map with colored branch markers and radius circles. Bottom half: Tabular list of registered branches with edit and GPS recalibrate buttons.
- **Typography Hierarchy:**
  - Branch Name: `Inter` | 14px | Extra Bold (800) | Uppercase | Color: `#0F172A`
  - Coordinates: `Inter` | 11px | Semi Bold (600) | Monospace `#7B0099`
  - Radius Tag: `Inter` | 10px | Extra Bold (800) | Color: `#1E293B`

#### Visual Wireframe Layout
```
BRANCH NETWORK & GEOFENCE MANAGEMENT
[Font: Inter | 22px | Black | Uppercase]

+-----------------------------------------------------------------------------------------+
| MAP CONTAINER: 8 ACTIVE REGIONAL BRANCHES                                               |
| [Interactive Maplibre Satellite / Terrain Layer showing 50m geofence circles]           |
+-----------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------------+
| CODE | BRANCH NAME        | ZONE   | LATITUDE, LONGITUDE    | RADIUS | ACTIVE STAFF     |
| [Int]| [Inter | 11px Bold]| [Inter]| [Inter | 11px Mono]    | [Int]  | [Inter | 11px]   |
+------+--------------------+--------+------------------------+--------+------------------+
| HQ   | HQ UMRAH (BHU)     | ZONE B | 4.224810, 103.419420   | 50 m   | 48 Personnel     |
| KEM  | KEMAMAN BRANCH     | ZONE A | 4.231200, 103.415000   | 50 m   | 24 Personnel     |
| AOR  | ALOR SETAR BRANCH  | ZONE A | 6.121040, 100.360120   | 65 m   | 18 Personnel     |
+-----------------------------------------------------------------------------------------+
```

---

### Page 14: Multi-Company & Organization Management

- **Route:** `/master`, `/master/department`, `/master/role`
- **Purpose:** Enterprise hierarchy configuration: manage parent holding entities, subsidiaries, operational departments, and system authorization roles.
- **Layout Structure:** 2-column layout. Left column (35%): Entity / Department registration card with code inputs and manager select. Right column (65%): Hierarchy tree and department card grid with head counts.
- **Typography Hierarchy:**
  - Card Header: `Inter` | 14px | Extra Bold (800) | Uppercase
  - Department Title: `Inter` | 14px | Bold (700) | Uppercase | `#0F172A`
  - Dept Code: `Inter` | 11px | Semi Bold (600) | Monospace `#7B0099`
  - Manager Name: `Inter` | 12px | Regular (400) | Color: `#334155`

#### Visual Wireframe Layout
```
ENTERPRISE HIERARCHY & DEPARTMENT MASTER
[Font: Inter | 22px | Black | Uppercase]

+-----------------------------------+-----------------------------------------------------+
| REGISTER DEPARTMENT UNIT          | ACTIVE ORGANIZATIONAL UNITS (12 DEPARTMENTS)        |
| [Font: Inter | 14px | Extra Bold] | [Font: Inter | 14px | Extra Bold | Uppercase]       |
|                                   |                                                     |
| DEPARTMENT NAME                   | STRATEGIC PLANNING & PILGRIMAGE (BHU)               |
| [ e.g. Customer Care            ] | Code: RAY-DEPT-001 | Head: Haji Wan Zulkifli        |
|                                   | Staff Assigned: 34 Personnel                        |
| DEPT CODE                         | [Font: Inter | 12px | Regular]                      |
| [ e.g. STR-PLAN-001             ] |                                                     |
|                                   | HUMAN RESOURCES & TALENT MANAGEMENT                 |
| MANAGER / HEAD                    | Code: RAY-DEPT-002 | Head: Nurul Athirah            |
| [ Search employee name...       ] | Staff Assigned: 6 Personnel                         |
|                                   |                                                     |
| [ + CREATE DEPARTMENT ]           | FINANCE, ACCOUNTS & AUDIT                           |
| [Font: Inter | 11px | Black]      | Code: RAY-DEPT-003 | Head: Pn. Rosnah               |
+-----------------------------------+-----------------------------------------------------+
```

---

### Page 15: Reports & Analytics Center

- **Route:** `/reports`, `/reports/attendance`, `/reports/leave`
- **Purpose:** Comprehensive data export hub for generating payroll-compliant CSV, Microsoft Excel, and PDF reports filtered by date range and branch.
- **Layout Structure:** Top report category tabs (Attendance Log, Leave Summary, Late In Report, Outstation Claims). Filter parameters container. Data preview table with instant export action buttons.
- **Typography Hierarchy:**
  - Page Title: `Inter` | 22px | Black (900) | Uppercase
  - Export Button: `Inter` | 11px | Extra Bold (800) | Uppercase | `#FFFFFF` on `#7B0099`
  - Preview Table Cell: `Inter` | 12px | Regular (400) | Monospace `#1E293B`

#### Visual Wireframe Layout
```
REPORTS & PAYROLL EXPORT CENTER
[Font: Inter | 22px | Black | Uppercase]

+-----------------------------------------------------------------------------------------+
| CONFIGURE REPORT PARAMETERS                                                             |
| [Font: Inter | 14px | Extra Bold | Uppercase]                                           |
|                                                                                         |
| REPORT TYPE                                 | DATE RANGE                                |
| [ MONTHLY ATTENDANCE AUDIT v ]              | [ 01/10/2026 ] to [ 31/10/2026 ]          |
|                                                                                         |
| TARGET BRANCH                               | TARGET DEPARTMENT                         |
| [ ALL BRANCHES v ]                          | [ ALL DEPARTMENTS v ]                     |
|                                                                                         |
| [ EXPORT CSV (EXCEL) ]                      | [ GENERATE OFFICIAL AUDIT PDF ]           |
| [Font: Inter | 11px | Black | Uppercase]     | [Font: Inter | 11px | Black | Uppercase]  |
+-----------------------------------------------------------------------------------------+

PREVIEW OF DATA (FIRST 5 ROWS):
[Table preview with 11px headers and 12px data rows]
```

---

### Page 16: Workforce Insights Dashboard

- **Route:** `/hr-analytics/workforce`, `/analytics`
- **Purpose:** Advanced executive analytics presenting workforce distribution, absenteeism trends, average punctuality rates, and department comparisons.
- **Layout Structure:** 4-metric top row. 2-column chart section (Left: 30-day absenteeism line chart; Right: Department punctuality bar chart). Bottom table showing lowest punctuality branches.
- **Typography Hierarchy:**
  - Metric Header: `Inter` | 10px | Extra Bold (800) | Uppercase | `#64748B`
  - Big Trend Number: `Inter` | 26px | Black (900) | Color: `#0F172A`
  - Chart Axis Label: `Inter` | 10px | Medium (500) | Color: `#94A3B8`
  - Chart Legend: `Inter` | 11px | Semi Bold (600) | Color: `#334155`

#### Visual Wireframe Layout
```
WORKFORCE ANALYTICS & INSIGHTS
[Font: Inter | 22px | Black | Uppercase]

+--------------------+--------------------+--------------------+--------------------+
| AVERAGE ATTENDANCE | OVERALL PUNCTUALITY| TOTAL LEAVE TAKEN  | REPEAT LATE COMERS |
| 94.2%              | 89.8%              | 112 Days (Oct)     | 4 Staff            |
| [Font: Inter|26px] | [Font: Inter|26px] | [Font: Inter|26px] | [Font: Inter|26px] |
+--------------------+--------------------+--------------------+--------------------+

+---------------------------------------------+-------------------------------------+
| 30-DAY WORKFORCE PRESENCE TREND             | PUNCTUALITY BY DEPARTMENT           |
| [Interactive Recharts Line Graph: Present]  | [Interactive Recharts Bar Graph]    |
| Axis: [Font: Inter | 10px | Slate]          | Axis: [Font: Inter | 10px | Slate]  |
+---------------------------------------------+-------------------------------------+
```

---

### Page 17: Portal Configurations / Settings

- **Route:** `/settings`
- **Purpose:** Core enterprise portal parameter controls, shift times, grace periods, geofence toggles, and live deployment sync.
- **Layout Structure:** 2-column aside layout. Left column (280px): Vertical aside navigation tabs (`lg:sticky lg:top-4`). Right column (flex-1): Active tab configuration card with toggle switches and input grids.
- **Typography Hierarchy:**
  - Header Title: `Inter` | 22px | Black (900) | Uppercase | `#0F172A`
  - Header Description: `Inter` | 12px | Regular (400) | Italic | `#64748B`
  - Aside Nav Tab (Inactive): `Inter` | 10px | Bold (700) | Uppercase | Tracking: `+0.04em` | `#FFFFFF`
  - Aside Nav Tab (Active): `Inter` | 10px | Black (900) | Uppercase | `#942392` on `#FFFF00`
  - Setting Title: `Inter` | 14px | Extra Bold (800) | Uppercase | `#0F172A`
  - Setting Description: `Inter` | 11px | Regular (400) | Color: `#64748B`
  - Input Value: `Inter` | 12px | Medium (500) | Color: `#0F172A`
  - Action Button: `Inter` | 11px | Black (900) | Uppercase | `#FFFFFF` on `#7B0099`

#### Visual Wireframe Layout
```
PORTAL CONFIGURATIONS
[Font: Inter | 22px | Black | Uppercase]
Configure global branches, staff roles, and check-in parameters
[Font: Inter | 12px | Regular | Italic | Slate]

+-------------------------------+---------------------------------------------------------+
| ASIDE NAVIGATION TABS         | ACTIVE CONFIGURATION PANEL (SYSTEM CONFIGURATION)       |
| [Sticky 280px Sidebar Panel]  | [Font: Inter | 14px | Extra Bold | Uppercase]           |
|                               |                                                         |
| [=] SYSTEM CONFIGURATION      | CORE OPERATIONS & TIMING BOUNDARIES                     |
| [Active: #FFFF00 on #942392]  | Manage alerts, scheduling triggers, and timing margins  |
| [Font: Inter | 10px | Black]  | [Font: Inter | 10px | Bold | Uppercase | Slate]        |
|                               |                                                         |
| [o] PERSONNEL MANAGEMENT      | WORK START TIME                    | GRACE PERIOD       |
| [Inactive: #FFFFFF on Purple] | [ 09:00 AM                       ] | [ 15 Minutes     ] |
| [Font: Inter | 10px | Bold]   | [Font: Inter | 12px | Medium]      | [Font: Inter|12px] |
|                               |                                                         |
| [o] BRANCH MANAGEMENT         | AUTOMATED SHIFT ROLLOVER           | PUNCH NOTIFICATIONS|
| [Inactive: #FFFFFF on Purple] | [ TOGGLE SWITCH: ON ]              | [ TOGGLE: ON     ] |
| [Font: Inter | 10px | Bold]   |                                                         |
|                               | [ DISCARD CHANGES ]                | [ DEPLOY CONFIG ]  |
| [o] DEPARTMENT MANAGEMENT     | [Font: Inter | 11px | Bold]        | [Font: Inter|Black]|
| [Inactive: #FFFFFF on Purple] |                                                         |
+-------------------------------+---------------------------------------------------------+
```

---

## 5. Developer Typography & Styling Quick Reference

Use this master quick reference table during frontend component implementation to guarantee 100% typographic consistency across all views:

| Component Type | UI Element | Font Size | Font Weight | Line Height | Tracking | Tailwind Classes | Hex / Color Token |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Page Header** | Page Title | 22px – 24px | Black (900) | 1.25 | `-0.015em` | `text-xl sm:text-2xl font-black uppercase tracking-tight` | `#0F172A` |
| **Page Header** | Page Subtitle / Caption | 11px – 12px | Regular (400) | 1.35 | `normal` | `text-xs sm:text-sm italic font-normal text-slate-500` | `#64748B` |
| **Breadcrumbs** | Path Item | 10px – 11px | Extra Bold (800) | 1.2 | `+0.05em` | `text-[10px] sm:text-xs font-black uppercase tracking-wider` | `#FFFFFF` |
| **Navigation** | Aside Tab (Active) | 10px – 11px | Black (900) | 1.2 | `+0.04em` | `text-[10px] font-black uppercase tracking-wider text-[#942392] bg-[#ffff00]` | `#942392` on `#FFFF00` |
| **Navigation** | Aside Tab (Inactive) | 10px – 11px | Bold (700) | 1.2 | `+0.04em` | `text-[10px] font-bold uppercase tracking-wider text-white/90 hover:bg-white/10` | `#FFFFFF` |
| **Card** | Card Section Heading | 14px – 15px | Extra Bold (800) | 1.3 | `-0.01em` | `text-sm sm:text-base font-black uppercase tracking-tight` | `#0F172A` |
| **Card** | Card Subtitle | 10px – 11px | Bold (700) | 1.3 | `+0.04em` | `text-[10px] font-bold uppercase tracking-wider opacity-60` | `#64748B` |
| **Metrics / KPI**| Big KPI Stat Number | 26px – 30px | Black (900) | 1.15 | `-0.02em` | `text-2xl sm:text-3xl font-black tracking-tight` | `#0F172A` / `#7B0099` |
| **Metrics / KPI**| Metric Category Label | 10px – 11px | Extra Bold (800) | 1.2 | `+0.05em` | `text-[9px] sm:text-[10px] font-black uppercase tracking-widest` | `#64748B` |
| **Table** | Table Header (`<th>`) | 11px | Extra Bold (800) | 1.2 | `+0.05em` | `text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-600` | `#475569` |
| **Table** | Primary Cell Data (`<td>`) | 12px – 13px | Semi Bold (600) | 1.4 | `normal` | `text-xs font-bold text-slate-900` | `#0F172A` |
| **Table** | Secondary Cell Data | 11px – 12px | Regular (400) | 1.4 | `normal` | `text-xs font-medium text-slate-500` | `#64748B` |
| **Form** | Field Label | 10px – 11px | Extra Bold (800) | 1.2 | `+0.04em` | `text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-700` | `#334155` |
| **Form** | Input Text | 12px – 13px | Medium (500) | 1.4 | `normal` | `text-xs font-bold text-slate-900 outline-none` | `#0F172A` |
| **Form** | Input Placeholder | 12px | Regular (400) | 1.4 | `normal` | `text-xs font-normal placeholder:normal-case placeholder:text-slate-400` | `#94A3B8` |
| **Button** | Primary Action Button | 11px – 12px | Black (900) | 1.2 | `+0.04em` | `text-[10px] sm:text-xs font-black uppercase tracking-wider text-white bg-[#7B0099]` | `#FFFFFF` |
| **Button** | Secondary Outline Button | 11px – 12px | Bold (700) | 1.2 | `+0.03em` | `text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-300`| `#334155` |
| **Status Badge** | Active / Present Badge | 9.5px – 10px | Extra Bold (800) | 1.0 | `+0.06em` | `text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100` | `#047857` |
| **Status Badge** | Pending / Review Badge | 9.5px – 10px | Extra Bold (800) | 1.0 | `+0.06em` | `text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100` | `#B45309` |
| **Status Badge** | Rejected / Late Badge | 9.5px – 10px | Extra Bold (800) | 1.0 | `+0.06em` | `text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-100` | `#BE123C` |
| **Technical** | GPS Coordinates / Code | 11px – 12px | Semi Bold (600) | 1.3 | `0` | `text-[11px] font-mono font-bold text-[#7B0099]` | `#7B0099` |

---

## 6. Implementation Code Guidelines

When writing or refactoring React components in the Rayhar Staff Portal:

```tsx
// Example: Standard Form Field Implementation
<div className="space-y-1.5">
  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
    Department Name <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    placeholder="e.g. Strategic Planning"
    className="w-full h-10 px-3.5 bg-white border border-slate-300 focus:border-[#7B0099] focus:ring-2 focus:ring-[#7B0099]/15 rounded-lg text-xs font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none transition-all"
  />
  <p className="text-[10px] text-slate-500 italic">
    Official corporate entity name registered in HR master.
  </p>
</div>

// Example: Standard Compact Table Header & Row
<table className="w-full text-left border-collapse">
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50/80">
      <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-600">Employee</th>
      <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-600">Branch</th>
      <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-600">Punch In</th>
      <th className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-slate-600">Status</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-100">
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="py-2.5 px-4">
        <span className="block text-xs font-bold text-slate-900">Nurul Athirah</span>
        <span className="block text-[10px] font-medium text-slate-500 font-mono">RAY-HQ-0088</span>
      </td>
      <td className="py-2.5 px-4 text-xs font-medium text-slate-700">HQ Umrah (BHU)</td>
      <td className="py-2.5 px-4 text-xs font-mono font-medium text-slate-800">08:52 AM</td>
      <td className="py-2.5 px-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
          Present
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

---
*Document maintained by the Rayhar Group HRMS Engineering & Frontend Architecture Team.*
