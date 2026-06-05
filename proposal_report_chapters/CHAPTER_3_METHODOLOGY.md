# CHAPTER 3: METHODOLOGY

## 3.1 Overall Flowcharts of the Projects

To ensure a structured, logical implementation of the Web-Based Employee Attendance Management & Leave Tracking System, the software's functional logic is categorized into five distinct transactional flows. These flows govern authentication, clocking transactions, leave requests, multi-level approvals, and administrative monitoring. The following sections describe the logical progression and business rules of each flow.

### 3.1.1 Authentication Flow
The Authentication Flow controls access to the system, protecting sensitive employee data and securing administrative functions. The flow operates through the following steps:
1. **User Interface Input:** The user accesses the web client and enters their email and password into the login form.
2. **Backend Verification:** The client sends an HTTPS POST request containing these credentials to the Node.js Express server.
3. **Database Comparison:** The server queries the Supabase PostgreSQL database to locate the user profile matching the email address.
4. **Credential Hashing Check:** If a matching email is found, the server uses bcrypt to compare the submitted password against the encrypted password stored in the database.
5. **Token Generation:** Upon successful comparison, the server generates a JSON Web Token (JWT) containing the user's identifier, role, and department. The token is signed using a secure `JWT_SECRET` key.
6. **Role-Based Routing:** The frontend receives the JWT, stores it, and decodes the role metadata (Staff, HOD, Finance, MD, or Admin). The system then routes the user to their designated dashboard layout.
7. **Exception Handling:** If the email is missing or the password does not match, the server returns an HTTP status code 401 (Unauthorized), and the client displays an error message without granting access.

### 3.1.2 Attendance Flow (Employee)
The Attendance Flow manages daily clock-in and clock-out logs, enforcing punctuality metrics and recording timestamps. The flow is structured as follows:
1. **Clock-In Trigger:** The employee logs in and clicks the "Clock In" button on their dashboard interface.
2. **Server-Side Timestamp Capture:** The frontend sends an API request to the backend. The backend captures the server-side timestamp to prevent local device time tampering.
3. **Punctuality Validation:** The backend checks the current server time against the corporate threshold (10:00 AM).
   - If the clock-in time is before 10:00 AM, the transaction is marked as "On-Time".
   - If the clock-in time is after 10:00 AM, the transaction is marked as "Late", and the backend calculates the late duration (late minutes = check-in time minus 10:00 AM).
4. **Database Insertion:** The system inserts a record into the `Attendances` table containing the user ID, date, clock-in timestamp, late minutes, and status.
5. **Real-Time Push Notification:** The backend triggers a Server-Sent Events (SSE) update, broadcasting the clock-in transaction to the HR live presence feed.
6. **Clock-Out Trigger:** At the end of the shift, the employee clicks "Clock Out". The backend records the exit timestamp, updates the corresponding database record, and calculates total hours worked.

### 3.1.3 Leave Request Flow
The Leave Request Flow manages the submission and validation of employee leave applications. The process is defined below:
1. **Form Input:** The employee completes the digital leave form by selecting the leave type (Annual, MC, Cuti Ganti, Cuti Tanpa Gaji), selecting start and end dates, entering a reason, and providing emergency contact details (Name, Phone, Address, Relationship).
2. **Supporting Documentation:** If the leave type is Medical Certificate (MC), the employee must upload an image or PDF of the certificate, which is stored in a secure Supabase Storage bucket.
3. **Duration Calculation:** The application automatically calculates the requested duration, excluding weekends and national holidays.
4. **Database Validation:** The system queries the database to check if the employee has a sufficient leave balance for the requested category.
   - If the balance is insufficient, the system stops the transaction and displays a validation error.
   - If the balance is sufficient, the system creates a new entry in the `Leave_Requests` table with the status set to "Pending".
5. **Workflow Escalation:** The request enters the approval pipeline, and a notification is displayed on the dashboard of the designated Head of Department (HOD).

### 3.1.4 Approval Flow (Manager)
The Approval Flow coordinates the multi-level validation chain to verify leave requests:
1. **Level 1: HOD Review:** The HOD reviews the request. If the HOD rejects it, the status is set to "Rejected" and the flow ends. If approved, the request is routed to the Finance Manager.
2. **Level 2: Finance Manager Review:** The Finance Manager evaluates the operational and financial impact of the leave. If rejected, the status changes to "Rejected" and the flow ends. If validated, the request is routed to the Managing Director (MD).
3. **Level 3: Managing Director Review:** The MD provides final approval for extended leaves or senior positions. If approved, the status is set to "Approved".
4. **Balance Adjustment:** Upon final approval, the database deducts the calculated leave days from the employee's balance, and a notification is sent to the employee.

### 3.1.5 Monitoring Flow (HR Admin)
The Monitoring Flow aggregates attendance and leave logs into real-time visual summaries:
1. **Query & Aggregate:** The dashboard queries database tables (`Profiles`, `Attendances`, `Leave_Requests`) to count active, late, absent, and on-leave employees.
2. **Visual Dashboard Update:** The aggregated numbers are sent to the frontend API and rendered as KPI widgets and interactive charts (e.g., departmental leave ratios, weekly presence trends).
3. **SSE Feed Synchronization:** The dashboard uses Server-Sent Events (SSE) to update status lists automatically without requiring page reloads.

---

## 3.2 Methodology, Framework, or Model Applied

### 3.2.1 Agile Development Process (Scrum)
The project is developed using the Agile Scrum framework, which breaks down system design into short development cycles (sprints). This iterative approach helps the team incorporate feedback, verify database relationships early, and adjust layouts based on testing.

* **Sprint 1 (Weeks 1-3): Requirement Analysis & Database Setup**  
  Define user requirements, design the database schema, and configure the Supabase cloud database instance.
* **Sprint 2 (Weeks 4-6): Authentication & Core Clocking Engine**  
  Implement secure JWT authentication, configure Role-Based Access Control (RBAC) rules, develop the clock-in/out endpoints, and set up Server-Sent Events (SSE) for real-time dashboard updates.
* **Sprint 3 (Weeks 7-9): Multi-Tier Leave Processing Module**  
  Build the digital leave request forms, write backend validations (e.g., excluding weekends from leave calculations), and configure the hierarchical approval routing logic (HOD -> Finance -> MD).
* **Sprint 4 (Weeks 10-11): Analytics & Administrative Views**  
  Develop interactive visual charts (using libraries like Chart.js) and build administration panels for department, branch, and profile management.
* **Sprint 5 (Weeks 12-14): Testing, Deployment, & Documentation**  
  Write automated backend unit tests (using Vitest), deploy the live application on Vercel and Render, conduct User Acceptance Testing (UAT) with target users, and complete the final project report.

### 3.2.2 Technology Stack Architecture
The system is built on a decoupled, three-tier architecture:
- **Presentation Layer (Frontend):** React (TypeScript) and Tailwind CSS are used to build a responsive, single-page application.
- **Application Logic Layer (Backend API):** Node.js and Express handle API routing, JWT token verification, calendar calculations, and real-time Server-Sent Events (SSE) streams.
- **Data Persistence Layer (Database):** Supabase (PostgreSQL) stores all relational data. It enforces ACID compliance for database updates, which is essential for accurate leave balance tracking.

### 3.2.3 Data Management Procedures and Security
To protect employee data and ensure system security, the project implements several key data management procedures:

**Table 2: Data management procedures**

| Activity / Area | Core Security and Management Procedures |
| :--- | :--- |
| **Data Storage** | Profiles, attendance records, and leave requests are stored in a centralized cloud PostgreSQL database. |
| **Access Control (RBAC)** | Access is restricted based on user roles. Database schema and API endpoints are protected using middleware checks. |
| **Session Security** | Sessions are managed using JSON Web Tokens (JWT). Passwords are encrypted using bcrypt before database write operations. |
| **Validation Controls** | Incoming requests are validated on both the frontend and backend to check input parameters and date ranges. |
| **Backup Policy** | Supabase automated cloud backup systems maintain daily snapshots to prevent database loss. |

### 3.2.4 Database Design Concept
The relational database schema is designed to model real-world HR workflows, ensuring data integrity through primary and foreign keys.

**Table 3: Database entity relationship mapping**

| Entity Name | Attributes and Data Types | Key Relations and Constraints |
| :--- | :--- | :--- |
| **Profiles** | `user_id` (UUID), `full_name` (Text), `email` (Text), `password` (Text), `status` (Text), `branch` (Text), `phone` (Text), `role` (Text), `department` (Text), `created_at` (Timestamp) | Central entity; PK is `user_id`. Linked to attendance and leave requests. |
| **Branches** | `branch` (Text), `code` (Text), `name` (Text), `created_at` (Timestamp) | PK is `branch`. Defines branch locations for employee profile assignment. |
| **Attendances** | `attendance_id` (UUID), `user_id` (UUID), `clock_in` (Timestamp), `clock_out` (Timestamp), `late_minutes` (Int), `date` (Date), `status` (Text) | PK is `attendance_id`. FK is `user_id` referencing `Profiles` table with cascade delete. |
| **Leave_Type** | `leave_type_id` (UUID), `leave_type_name` (Text), `annual_quota` (Int) | PK is `leave_type_id`. Defines quota properties for leave verification. |
| **Leave_Requests** | `leave_id` (UUID), `user_id` (UUID), `leave_type` (Text), `start_date` (Date), `end_date` (Date), `days` (Int), `status` (Text), `approver_id` (UUID), `mc_file_url` (Text), emergency contacts, signature... | PK is `leave_id`. FK is `user_id` referencing `Profiles` table. Stores application details and files. |
| **Leave_Approvals** | `id` (UUID), `leave_id` (UUID), `approver_id` (UUID), `approver_role` (Text), `status` (Text), `remarks` (Text), `created_at` (Timestamp) | PK is `id`. FK is `leave_id` referencing `Leave_Requests` table. |
| **Hod_History** | `id` (UUID), `department` (Text), `previous_hod_id` (UUID), `new_hod_id` (UUID), `changed_by_id` (UUID), `changed_at` (Timestamp) | PK is `id`. Tracks assignment history for HOD reassignments. |

---

## 3.3 Systematic Review of the Methodology Applied

The Agile Scrum methodology was chosen over the traditional Waterfall model to ensure flexibility and support continuous testing. Traditional Waterfall projects develop and test components sequentially, which can delay the detection of database synchronization or user-interface issues. Scrum addresses this by producing testable system increments every sprint, allowing the team to identify and resolve issues early.

The testing strategy consists of two main parts:
1. **Automated Unit Testing (Vitest):** The backend business logic is verified using automated unit tests. Crucial operations—such as leave balance deduction, weekend-exclusion date calculations, and late-clocking metrics—are tested with simulated parameters to ensure stability before deployment.
2. **User Acceptance Testing (UAT):** Real-world users evaluate the web interface across all 5 roles (Staff, HOD, Finance Manager, MD, HR Admin) to verify system accessibility, usability, and visual clarity.

The application is deployed using cloud-native hosting environments: the Supabase PostgreSQL database handles persistent records, the backend API is hosted on Render, and the React frontend is deployed on Vercel.
