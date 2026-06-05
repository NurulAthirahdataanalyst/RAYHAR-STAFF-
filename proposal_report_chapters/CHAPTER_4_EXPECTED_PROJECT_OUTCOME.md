# CHAPTER 4: EXPECTED PROJECT OUTCOME

This chapter details the specific expected outcomes, systems, and deliverables produced by the project. The completed system delivers four main components: a functional employee self-service portal, an automated leave validation engine, a real-time HR data analytics dashboard, and comprehensive documentation evaluating the system's effectiveness.

## 4.1 A Functional and Transparent Employee Portal

The first major deliverable is the Web-Based Employee Portal, which serves as the primary user interface for general staff. This portal replaces manual, paper-based attendance tracking and physical punch cards.

The portal provides several key features:
* **Interactive Attendance Tracking:** The frontend interface features simple "Clock In" and "Clock Out" controls. When clicked, these trigger secure API requests that log the employee's presence in the database.
* **Server-Side Timestamp Verification:** The system captures timestamps from the cloud server rather than the user's local device, preventing device-time manipulation and ensuring accurate logs.
* **Workforce Transparency and Self-Service:** Employees can access their dashboard to view their personal clocking history, check monthly late-arrival metrics, and view real-time leave balances (e.g., Annual, MC, Cuti Ganti). This reduces administrative inquiries by allowing employees to retrieve their own records directly.

---

## 4.2 An Automated Leave Management Engine

The second major deliverable is the Leave Management Engine, which automates the leave application lifecycle and reduces the manual workload on HR staff.

The engine includes several core capabilities:
* **Automated Duration Calculation:** When a leave request is submitted, the backend calculates the requested duration, automatically excluding weekends and company holidays to ensure accurate quota tracking.
* **Leave Balance Checks:** The system checks the employee's available balance in the database before processing the request. If the request exceeds the remaining balance, the transaction is stopped, preventing quota overdrafts.
* **Transactional Integrity (ACID):** Database updates are managed through structured SQL transactions in Supabase PostgreSQL. This ensures that leave deductions are executed reliably, preventing data inconsistencies in the event of connection drops or simultaneous approvals.
* **Multi-Level Approval Pipeline:** Requests are automatically routed through the approval chain based on the employee's profile. Notifications are sent sequentially to the designated HOD, Finance Manager, and Managing Director for review.
* **Automated Notifications:** The system sends real-time dashboard notifications and email updates to keep employees and managers informed throughout the approval process.

---

## 4.3 An HR Data Analytics Dashboard (Computational Focus)

The third major deliverable is the HR Monitoring Dashboard, which aggregates raw attendance and leave records into visual, actionable summaries for management.

The dashboard provides several key analytics tools:
* **Live Presence Feed:** Powered by Server-Sent Events (SSE), the dashboard displays real-time clock-in updates and employee statuses (Present, Late, Absent, On-Leave) without requiring page reloads.
* **Data Visualizations:** The system uses graphical charts to display key HR metrics:
  - **Pie Charts:** Show the distribution of active leave categories.
  - **Bar Graphs:** Track monthly absenteeism and late-arrival rates.
  - **Line Charts:** Visualize daily attendance trends to help analyze operational capacity.
* **Payroll Data Export:** HR administrators can filter monthly attendance records and export the compiled data to CSV or Excel formats, simplifying payroll calculations and reducing data entry errors.

---

## 4.4 Comprehensive Project Documentation and Evaluation

The final deliverable of this project is a comprehensive Final Year Project Report documenting the system's design, implementation, and performance evaluation.

The documentation includes:
* **Technical Design Specs:** Complete database schemas, Entity-Relationship Diagrams (ERD), and UML sequence diagrams detailing system operations.
* **Testing Evaluation Records:** Documentation of unit testing coverage (using Vitest) and the results of User Acceptance Testing (UAT) conducted with target users.
* **Operational Analysis:** An evaluation of how the system improves administrative efficiency, showing reductions in processing times and data discrepancies compared to manual workflows.
