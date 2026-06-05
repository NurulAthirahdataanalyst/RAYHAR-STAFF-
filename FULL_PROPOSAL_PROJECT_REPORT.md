FORM D  
Faculty of Applied Sciences and Technology  
Universiti Tun Hussein Onn Malaysia  
BACHELOR DEGREE PROJECT I  

NAME: NURUL ATHIRAH BINTI ABDUL RAHMAN 
MATRIC NUMBER: AW230109 
PROGRAM CODE: BWQ 
PROJECT TITLE: WEB-BASED EMPLOYEE ATTENDANCE MANAGEMENT & LEAVE TRACKING SYSTEM FOR HUMAN RESOURCE MONITORING 

PLEASE TICK (      ) THE SUPERVISOR’S APPROVAL: 
 [ ] APPROVED 
 [ ] NOT APPROVED  

Please state the reasons: 

DATE OF SUBMISSION TO SUPERVISOR: 12 JUNE 2026 
SIGNATURE AND OFFICIAL STAMPS OF SUPERVISOR:


---

WEB-BASED EMPLOYEE ATTENDANCE MANAGEMENT & LEAVE TRACKING SYSTEM FOR HUMAN RESOURCE MONITORING

NURUL ATHIRAH BINTI ABDUL RAHMAN

A proposal submitted in fulfilment of the requirement for the 
Bachelor’s Degree of Science (Computational Data Analytics) with Honours
Faculty of Applied Sciences and Technology 
Universiti Tun Hussein Onn Malaysia 

JUNE 2026

---

# CONTENTS
- [GLOSSARY](#glossary)
- [LIST OF TABLES](#list-of-tables)
- [LIST OF FIGURES](#list-of-figures)
- [LIST OF SYMBOLS AND ABBREVIATIONS](#list-of-symbols-and-abbreviations)
- [LIST OF APPENDICES](#list-of-appendices)
- [CHAPTER 1 INTRODUCTION](#chapter-1-introduction)
  - [1.1 Background of the Industrial Based Project](#11-background-of-the-industrial-based-project)
    - [1.1.1 Challenges of Coordinating Multi-Branch SME Operations](#111-challenges-of-coordinating-multi-branch-sme-operations)
  - [1.2 Problem Statement](#12-problem-statement)
    - [1.2.1 Lack of Real-Time Attendance Monitoring](#121-lack-of-real-time-attendance-monitoring)
    - [1.2.2 Inefficient and Fragmented Leave Approval Processes](#122-inefficient-and-fragmented-leave-approval-processes)
    - [1.2.3 Data Discrepancies and Manual Administrative Burden](#123-data-discrepancies-and-manual-administrative-burden)
    - [1.2.4 Transparency and Employee Self-Service Gaps](#124-transparency-and-employee-self-service-gaps)
  - [1.3 Objective of the Projects](#13-objective-of-the-projects)
  - [1.4 Significance of the Industrial Based Projects](#14-significance-of-the-industrial-based-projects)
    - [1.4.1 Organizational Automation and Workflow Streamlining](#141-organizational-automation-and-workflow-streamlining)
    - [1.4.2 Computational Decision-Making and Real-Time Analytics](#142-computational-decision-making-and-real-time-analytics)
    - [1.4.3 Financial Auditing and Quota Accuracy](#143-financial-auditing-and-quota-accuracy)
  - [1.5 Scopes and Limitations of Industrial Based Projects](#15-scopes-and-limitations-of-industrial-based-projects)
    - [1.5.1 Functional Scopes](#151-functional-scopes)
    - [1.5.2 Technical Scopes](#152-technical-scopes)
    - [1.5.3 Project Limitations](#153-project-limitations)
  - [1.6 The Importance of Project](#16-the-importance-of-project)
- [CHAPTER 2 REVIEW ON CURRENT PRACTICES](#chapter-2-review-on-current-practices)
  - [2.1 Systematic Review on the Industrial Based Project](#21-systematic-review-on-the-industrial-based-project)
    - [2.1.1 Comparative Critique of Traditional and Commercial HRM Systems](#211-comparative-critique-of-traditional-and-commercial-hrm-systems)
    - [2.1.2 Systematic Comparison of Attendance Management Practices](#212-systematic-comparison-of-attendance-management-practices)
  - [2.2 Summary of the Research Gap](#22-summary-of-the-research-gap)
- [CHAPTER 3 METHODOLOGY](#chapter-3-methodology)
  - [3.1 Overall Flowcharts of the Projects](#31-overall-flowcharts-of-the-projects)
    - [3.1.1 Authentication Flow](#311-authentication-flow)
    - [3.1.2 Attendance Flow (Employee)](#312-attendance-flow-employee)
    - [3.1.3 Leave Request Flow](#313-leave-request-flow)
    - [3.1.4 Approval Flow (Manager)](#314-approval-flow-manager)
    - [3.1.5 Monitoring Flow (HR Admin)](#315-monitoring-flow-hr-admin)
  - [3.2 Methodology, Framework, or Model Applied](#32-methodology-framework-or-model-applied)
    - [3.2.1 Agile Development Process (Scrum)](#321-agile-development-process-scrum)
    - [3.2.2 Technology Stack Architecture](#322-technology-stack-architecture)
    - [3.2.3 Data Management Procedures and Security](#323-data-management-procedures-and-security)
    - [3.2.4 Database Design Concept](#324-database-design-concept)
  - [3.3 Systematic Review of the Methodology Applied](#33-systematic-review-of-the-methodology-applied)
- [CHAPTER 4 EXPECTED PROJECT OUTCOME](#chapter-4-expected-project-outcome)
  - [4.1 A Functional and Transparent Employee Portal](#41-a-functional-and-transparent-employee-portal)
  - [4.2 An Automated Leave Management Engine](#42-an-automated-leave-management-engine)
  - [4.3 An HR Data Analytics Dashboard (Computational Focus)](#43-an-hr-data-analytics-dashboard-computational-focus)
  - [4.4 Comprehensive Project Documentation and Evaluation](#44-comprehensive-project-documentation-and-evaluation)
- [CHAPTER 5 PLANNING](#chapter-5-planning)
  - [5.1 Overview](#51-overview)
    - [5.1.1 Risk Management and Mitigation Strategies](#511-risk-management-and-mitigation-strategies)
- [REFERENCES](#references)
- [APPENDICES](#appendices)

---

## GLOSSARY

| Term / Acronym | Definition |
| :--- | :--- |
| **HRLMS** | Human Resources Leave Management System. |
| **RBAC** | Role-Based Access Control. A method of restricting system access to authorized users based on their specific role. |
| **ERD** | Entity-Relationship Diagram. A structural database model showcasing entities, attributes, and key constraints. |
| **HRM** | Human Resource Management. |
| **SME** | Small and Medium-sized Enterprises. |
| **DB** | Database. A structured system for storing data on a computer server (Supabase Software, using PostgreSQL in this system). |
| **SSE** | Server-Sent Events. A server-push technology enabling a client to receive automatic real-time data streams over an HTTP connection without polling. |
| **JWT** | JSON Web Token. A secure, URL-safe token used to represent claims between the web server and web client, acting as digital credentials. |
| **HOD** | Head of Department. The supervisor responsible for reviewing department-level requests. |

---

## LIST OF TABLES

* **Table 1:** Differences between manual and digital leave management workflows (Chapter 1)
* **Table 2:** Data management procedures (Chapter 3)
* **Table 3:** Database entity relationship mapping (Chapter 3)
* **Table 4:** Comparative matrix of attendance tracking and leave management paradigms (Chapter 2)
* **Table 5:** Detailed Gantt Chart task schedule and dependencies (Chapter 5)

---

## LIST OF FIGURES

* **Figure 1:** Authentication Flow Diagram
* **Figure 2:** Attendance Flow (Employee Clock-In/Clock-Out)
* **Figure 3:** Leave Request Flow
* **Figure 4:** Multi-Level Approval Flow by Managers
* **Figure 5:** Monitoring Flow for HR Administrators
* **Figure 6:** Agile Scrum Iterative Framework
* **Figure 7:** System Architecture and Deployment Model

---

## LIST OF SYMBOLS AND ABBREVIATIONS

* **API** - Application Programming Interface
* **SPA** - Single Page Application
* **SQL** - Structured Query Language
* **UAT** - User Acceptance Testing
* **UI/UX** - User Interface / User Experience
* **MD** - Managing Director
* **MC** - Medical Certificate
* **ACID** - Atomicity, Consistency, Isolation, Durability

---

## LIST OF APPENDICES

* **Appendix A:** Gantt Chart for the Project
* **Appendix B:** User Acceptance Testing (UAT) Questionnaire Sheets
* **Appendix C:** Database Schema Script (PostgreSQL DDL)

---

## CHAPTER 1 INTRODUCTION

Chapter 1 starts with Section 1.1 on the background of the Industrial Based Project, followed by Section 1.2 which introduces the problem statement. Section 1.3 and Section 1.4 demonstrate the objectives of the project and the significance of this Industrial Based Project, respectively. Section 1.5 outlines the scope and limitations of the project, followed by Section 1.6, which discusses the overall importance of the project.

### 1.1 Background of the Industrial Based Project

In the contemporary business landscape, the rapid evolution and integration of digital technologies have fundamentally reshaped organizational structures, operational dynamics, and employee productivity paradigms. Over the past decade, the transition from traditional, localized business models to decentralized, multi-site, and hybrid configurations has accelerated. This shift has necessitated a corresponding transformation in administrative infrastructure, particularly within the domain of Human Resource Management (HRM). Human Resource Management is not merely an administrative department; it serves as a core engine driving organizational alignment, workforce compliance, and operational efficiency. Central to this mandate are two primary, high-frequency transactional workflows: monitoring daily employee attendance patterns and administering employee leave entitlements.

The mechanical recording of employee attendance and the auditing of leave balances are critical factors that directly influence organizational productivity, labor cost management, and financial health. Attendance records provide the essential baseline data required for payroll processing, overtime calculations, performance appraisals, and regulatory labor compliance. Accurate tracking of leave balances ensures that employees utilize their contracted benefits fairly while preventing unauthorized absences that disrupt production schedules or project delivery. When executed efficiently, these processes foster an environment of transparency, accountability, and organizational trust.

Historically, Small and Medium Enterprises (SMEs) have relied on manual, physical methods to execute these workflows. These methods include paper-based logbooks, physical punch-card registers, isolated spreadsheets (e.g., standalone Microsoft Excel sheets), and decentralized, ad-hoc communications via messaging platforms like WhatsApp, Telegram, or email. In localized, single-office operations, these low-cost manual systems can sometimes be managed, albeit with high administrative overhead. However, when an organization expands to operate across multiple physical branches, locations, or departments, manual systems quickly break down. 

Manual systems suffer from asynchronous information lag, where attendance records must be physically transported or emailed in batches at the end of each payroll cycle. This lag creates severe visibility gaps, making it impossible for centralized HR personnel to observe operational status across locations in real time. The lack of automation forces HR staff to dedicate significant hours to manually compiling, sorting, and cross-referencing records, introducing a high risk of human error, data entry mistakes, and record losses.

Furthermore, the rise of the digital economy has introduced hybrid and remote work options, which are increasingly adopted by SMEs seeking to attract talent and reduce physical office overhead. Biometric hardware configurations—such as wall-mounted fingerprint readers, iris scanners, or RFID card scanners—were once seen as the ultimate solution to attendance tracking. However, these systems are highly rigid. They require physical presence at a specific door to log work, making them useless for employees working remotely, traveling between branch offices, or performing field assignments. Furthermore, biometric hardware carries high upfront installation costs, requires ongoing maintenance, and presents integration challenges with existing digital payroll software.

To address these challenges, web-based architectures offer a scalable, accessible, and cost-effective alternative. A web-based Attendance and Leave Management System utilizes secure cloud databases to centralize all transactions. It allows employees to access their workspace, clock in or out, request leaves, and review personal histories using standard web browsers on desktops or mobile devices. For managers and HR administrators, it provides real-time access to database updates, automatic notifications, and dynamic analytics dashboards from a centralized interface. By removing physical hardware dependencies and automating routine checks, a web platform bridges the operational gap for growing businesses.

### 1.1.1 Challenges of Coordinating Multi-Branch SME Operations

For Small and Medium Enterprises (SMEs) operating across multiple regional branches or branch offices, coordinating workforce attendance is a significant operational challenge. A prime example is Rayhar, a multi-branch organization that requires coordinated HR oversight across diverse departments. In such organizational structures, each branch typically functions as a semi-independent unit under a local branch leader. Attendance data is captured locally and stored in siloed formats, such as handwritten books or local Excel files. 

At the end of each calendar month, these records must be collected, formatted, and sent to the centralized HR department at headquarters. This process creates several problems:
1. **The Consolidation Bottleneck:** The centralized HR team must receive, format, and merge multiple separate spreadsheets or handwritten logs. Differences in formatting, spelling, and completeness lead to hours of tedious cross-referencing.
2. **Delayed Payroll Processing:** Because data must be manually collected from multiple locations, any delay in one branch stalls the entire organization's payroll calculations.
3. **Absence of Real-Time Control:** Centralized HR administrators cannot verify if employees are active, late, or absent at any given moment. This lag makes it difficult to manage staffing shortages or track productivity trends in real time.
4. **Lack of Standardized Rules:** Without a centralized system, branch managers may apply leave policies and late-docking rules inconsistently, creating inequalities and lowering employee morale.

---

## 1.2 Problem Statement

The absence of an integrated, automated, and centralized tracking mechanism in multi-branch organizations creates severe operational inefficiencies, financial risks, and communication gaps. The core problems are detailed below:

### 1.2.1 Lack of Real-Time Attendance Monitoring
Under current manual practices, centralized HR departments cannot monitor workforce attendance across branches in real time. Because attendance data is compiled asynchronously at the end of each month, HR lacks immediate visibility into daily presence ratios, unplanned absenteeism, or punctuality trends. If an employee fails to report to a specific branch, headquarters remains unaware of the shortage unless notified by telephone or email. This visibility gap makes it difficult to make rapid staffing decisions, lowers accountability, and complicates the management of client-facing operations.

### 1.2.2 Inefficient and Fragmented Leave Approval Processes
Without a structured digital system, the leave application process is highly fragmented and inefficient. Employees submit requests through paper forms, emails, or personal messages, which are easily lost or delayed. This lack of a structured tracking process often results in requests remaining unreviewed until shortly before the requested leave date. Furthermore, because there is no automated validation, employees can submit requests that exceed their remaining quota. This forces HR personnel to manually review historical files to calculate balances, increasing delays and the risk of approval errors.

### 1.2.3 Data Discrepancies and Manual Administrative Burden
The process of compiling monthly attendance logs from multiple branches and translating them into payroll inputs is highly error-prone. Handwritten logs are often illegible, and standalone spreadsheets lack data validations, leading to formatting inconsistencies and missing entries. HR administrators must spend substantial time manually correcting these discrepancies, checking medical certificates, and calculating late-arrival penalties. This manual processing creates administrative bottlenecks, delays payroll runs, and increases the likelihood of costly financial discrepancies.

### 1.2.4 Transparency and Employee Self-Service Gaps
Employees have no direct access to view their historical attendance records or remaining leave balances. To find this information, they must contact HR staff, who must search through spreadsheets or paper archives. This lack of transparency leads to frequent disputes regarding remaining leave days or overtime calculations, while increasing the administrative workload on the HR department.

---

## 1.3 Objective of the Projects

To address these challenges, this project focuses on the design, development, and evaluation of a Web-Based Employee Attendance Management & Leave Tracking System. The specific objectives are:

1. **To analyze workforce attendance and leave patterns** for HR administrative reporting using descriptive data analytics techniques (e.g., dynamic charts and real-time status feeds).
2. **To develop an automated leave balance and application module** for Rayhar employees featuring a multi-level approval pipeline using React (TypeScript), Node.js (Express), and a Supabase (PostgreSQL) database.
3. **To design a centralized web-based architecture** for multi-branch employee tracking and role-based authorization using Unified Modeling Language (UML) and system flow diagrams.
4. **To evaluate the effectiveness of the developed system** in improving attendance tracking and leave management through automated unit testing (using Vitest) and structured User Acceptance Testing (UAT).

---

## 1.4 Significance of the Industrial Based Projects

This project provides significant practical and technical value by modernizing workforce administration for SMEs. Its significance is visible across three main areas:

### 1.4.1 Alignment with Corporate Modernization and Automation
By digitizing the attendance and leave management lifecycle, the system eliminates paper forms and spreadsheet tracking. The web application automates the routing of leave requests through the chain of command, notifying approvers immediately and updating records upon approval. This reduces leave processing cycles from days to minutes, freeing HR staff to focus on strategic initiatives rather than manual administration.

### 1.4.2 Computational Decision-Making and Real-Time Analytics
The integration of a real-time analytics dashboard changes how HR interacts with workforce data. The dashboard converts raw clock-in logs into visual KPIs (e.g., daily presence rates, late arrivals, and active leaves). This allows management to monitor operational capacity across branches instantly and identify staffing trends quickly.

### 1.4.3 Financial Auditing and Quota Accuracy
The platform enforces ACID-compliant database constraints using Supabase PostgreSQL. This ensures that leave deductions are calculated accurately, factoring in weekends and holidays to prevent balance overdrafts. Every clock-in, clock-out, and approval transaction is logged with a secure server-side timestamp, creating an unalterable audit trail that ensures payroll accuracy and labor compliance.

---

## 1.5 Scopes and Limitations of Industrial Based Projects

### 1.5.1 Functional Scopes

The system features five user access levels governed by Role-Based Access Control (RBAC):

1. **Staff / General Employee:**
   - Access a personal web dashboard to check daily schedules and remaining leave quotas.
   - Clock in and out using web-based check-in elements.
   - Complete leave forms, upload digital Medical Certificates (MC), and track request status.
2. **Head of Department (HOD) / Branch Leader:**
   - Monitor the active presence of department staff and view daily attendance histories.
   - Serve as the first-level review for leave requests, approving or rejecting them with remarks.
3. **Finance Manager:**
   - Perform second-level approval for leave requests to evaluate operational and financial impacts.
   - Access department-level cost records and attendance logs.
4. **Managing Director (MD):**
   - Retain final approval authority for extended leaves or senior staff requests.
   - View high-level company metrics and branch performance summaries.
5. **HR Administrator:**
   - Manage core system entities: Add/edit employees, update branch lists, assign roles, reset passwords, and adjust leave configurations.
   - Access comprehensive attendance reports and export compiled payroll data.

The core system is divided into four modules:
- **Authentication & Profile Module:** Secure login using JWT tokens and user profile configuration.
- **Attendance Module:** Web check-in/check-out with late flag detection (arrivals after 10:00 AM) and a Live Presence Feed powered by Server-Sent Events (SSE).
- **Leave Management Module:** Dynamic application submission, weekend-exclusion duration calculation, and multi-tier routing (HOD -> Finance -> MD).
- **Analytics Dashboard:** Graphical charts and KPI widgets summarizing attendance rates, active leaves, and absenteeism trends.

### 1.5.2 Technical Scopes

The system is built on a modern, decoupled web architecture:
- **Frontend Presentation Layer:** Built using **React (TypeScript)**, **Tailwind CSS**, and **Vite** to ensure a responsive interface across devices.
- **Backend API Layer:** Powered by **Node.js (Express)** to handle API routes, token validation, leave rules, and real-time Server-Sent Events (SSE).
- **Database & Hosting Layer:** Managed through **Supabase (PostgreSQL)** to secure relational data integrity. The frontend is hosted on **Vercel**, the backend is deployed on **Render**, and the database runs on Supabase cloud servers.

### 1.5.3 Project Limitations

- **No Hardware Integration:** The system operates purely as a software solution. It does not integrate with physical biometric hardware (fingerprint or facial scanners) or RFID readers.
- **Network Dependency:** Users require an active internet connection to interact with the system. The application does not support offline logging or cached check-ins in this version.
- **Data Testing Scope:** The platform's validation and analytics modules are tested using simulated, synthetic dataset records to protect confidential real-world company data.

---

## 1.6 The Importance of Project

The Web-Based Employee Attendance Management & Leave Tracking System is crucial for helping SMEs modernize their administrative processes. By replacing manual paperwork with automated cloud storage, the system reduces the administrative burden on managers and HR staff. It minimizes payroll disputes by recording attendance with secure server-side timestamps and calculating leave balances automatically. For employees, the self-service portal provides clear, real-time transparency regarding their leave status. Ultimately, the system provides a scalable, affordable, and flexible solution that allows SMEs to coordinate multiple branches efficiently without the high costs of enterprise ERP platforms.

**Table 1: Differences between manual and digital leave management workflows**

| Feature | Manual Leave Form | Digital HRLMS (Proposed) |
| :--- | :--- | :--- |
| **Request Process** | Physical paper forms completed by hand | Electronic submission via web portal |
| **Approval Chain** | Physical routing, requiring signatures | Multi-level digital routing with instant alerts |
| **Processing Speed** | Asynchronous, taking days to process | Near-instantaneous routing and notifications |
| **Record Storage** | File cabinets or local standalone Excel sheets | Relational cloud database (Supabase PostgreSQL) |
| **Data Integrity** | Prone to loss, damage, and manual typing errors | Secure, automated database validation constraints |
| **Analytics & Reports** | Compiled manually at month-end | Live computational dashboards and charts |

---

## CHAPTER 2 REVIEW ON CURRENT PRACTICES

Chapter 2 describes the review on current practices which starts by introduction in Section 2.1 discussing the systematic review on the industrial based project, followed by Section 2.2 summarizing the research gap.

## 2.1 Systematic Review on the Industrial Based Project

To establish a solid theoretical and empirical baseline for the proposed system, a systematic review was conducted to evaluate the primary mechanisms currently employed by organizations to track employee attendance and manage leave processes. Attendance tracking and leave administration are foundational to resource allocation, regulatory compliance, and payroll validation. In modern organizational studies, these practices are generally grouped into three main categories:
1. Manual tracking systems (paper-based logbooks, offline spreadsheets).
2. Physical biometric hardware systems (fingerprint, iris, facial recognition, RFID devices).
3. Commercial Enterprise Resource Planning (ERP) software suites (SAP SuccessFactors, Oracle HCM, Workday).

Each of these paradigms represents different balances of cost, operational flexibility, data integrity, and administrative efficiency. The following sections provide a detailed critique of these existing mechanisms to identify their limitations, particularly for Small and Medium Enterprises (SMEs) with decentralized or multi-branch structures.

### 2.1.1 Comparative Critique of Traditional and Commercial HRM Systems

#### 1. Manual Systems: Paper Logbooks and Spreadsheets
Manual methods represent the oldest and most basic approach to workforce monitoring. In a typical paper-based system, employees write their names, arrival times, and signatures in a physical logbook at the entrance of the workplace. Similarly, spreadsheet-based tracking relies on employees or department heads typing clock-in and clock-out hours into standalone files, such as Microsoft Excel sheets, which are stored locally or emailed periodically.

While manual systems require almost no financial investment and have a short learning curve, they are highly inefficient and insecure:
* **High Inefficiency:** Collecting, organizing, and consolidating paper logs or separate spreadsheets from multiple branches requires significant administrative work. HR staff must manually enter this data into payroll systems, which is time-consuming.
* **Vulnerability to Data Tampering and Fraud:** Manual records rely entirely on trust. They are highly susceptible to retroactive editing, inaccurate time logs, and "buddy punching" (where one employee clocks in for an absent colleague). This undermines data integrity.
* **Lack of Real-Time Validation:** Manual spreadsheets do not validate data entry automatically. An employee can easily request more leave days than their remaining quota, forcing HR to manually check historical records to detect discrepancies.
* **Delayed Decision-Making:** Summary records are compiled asynchronously at the end of each payroll cycle, leaving management with a visibility gap during active operations.

#### 2. Biometric Hardware Systems
Biometric hardware systems utilize physical scanning devices—such as fingerprint readers, facial recognition terminals, iris scanners, or RFID card punch machines—mounted at building entrances. These devices capture physical biological traits, convert them into digital hashes, and match them against a local database to verify identity and record clocking times.

While biometric hardware provides strong protection against identity theft and buddy punching, it has major limitations for modern organizations:
* **Rigidity in Hybrid and Remote Work Environments:** Biometric terminals require physical presence at a specific location to clock in. This makes them unsuitable for remote workers, field sales agents, traveling consultants, or multi-branch staff who work across different sites.
* **High Financial Investment:** Implementing biometric readers at every branch entrance involves high upfront hardware costs, network wiring expenses, and ongoing maintenance fees. For SMEs, this represents a significant capital cost.
* **Integration and Synchronization Issues:** Most biometric devices run on proprietary, local database systems. Synchronizing this data in real time across multiple regional branches to a central HR dashboard requires complex database configurations, VPN tunnels, and dedicated IT support.
* **Hardware Fragility:** Physical terminals are prone to mechanical wear, sensor failures, and connection drops, leading to missing logs and administrative frustration.

#### 3. Commercial Enterprise Resource Planning (ERP) Systems
Enterprise Resource Planning systems integrate various business functions—such as finance, supply chain, and human resources—into a single, unified database environment. Platforms like SAP SuccessFactors, Oracle Fusion Cloud HCM, and Workday offer highly secure, scalable, and automated modules for attendance monitoring and leave processing.

Despite their power and security, enterprise ERPs are generally unsuitable for SMEs:
* **Prohibitive Cost Structure:** Enterprise systems require substantial financial investment. The recurring user licensing fees, initial consultancy setups, and database integration costs are financially unviable for growing businesses.
* **Complexity and Resource Intensity:** These platforms are built for large corporate structures and feature complex interfaces and configurations. Training staff and administering the system requires dedicated IT support, which is beyond the capacity of most SMEs.
* **Customization Bottlenecks:** Customizing an enterprise ERP to align with the specific workflow structures or approval chains of a local SME is often slow and costly, requiring certified consultants.

### 2.1.2 Systematic Comparison of Attendance Management Practices

To highlight the gaps in current options, Table 4 compares manual systems, biometric hardware, enterprise ERPs, and the proposed web-based system across key operational metrics. The proposed system perfectly contrasts with manual practices by integrating advanced real-time and automated features. Specifically, the system highlights the following advanced capabilities:

* **Real-Time Presence Feed:** Uses Server-Sent Events (SSE) to show exactly when someone clocks in/out without requiring the administrator to refresh the page.
* **Multi-Level Approval Workflow:** Automatically routes leave requests based on organizational roles (e.g., Pending HOD/Branch Leader → Pending Finance → Pending MD), ensuring continuous progress without manual form-passing.
* **Automated Email Notifications:** Sends automated emails to approvers when a leave is requested, and to employees when their request is approved or rejected (powered by Nodemailer).

**Table 4: Comparative matrix of attendance tracking and leave management paradigms**

| Evaluation Parameter | Manual Systems | Biometric Hardware | Enterprise ERP | Proposed Web-Based System (HRLMS) |
| :--- | :--- | :--- | :--- | :--- |
| **Upfront Financial Cost** | Negligible | High (Devices, wiring) | Extremely High (Consulting) | Low (Cloud subscription model) |
| **Recurring Maintenance** | None | High (Hardware repairs) | Very High (Annual license) | Low (Standard cloud database hosting) |
| **Location Flexibility** | Low (Requires local entry) | None (Requires physical device) | High (Web/Mobile apps) | High (Web browser-based access) |
| **Real-Time Data Capture** | None (Batch sent monthly) | Delayed (Requires sync steps) | High (Instant DB write) | High (Instant DB write with SSE support) |
| **Identity Verification** | Low (No security verification) | Extremely High (Biometrics) | Medium (User credentials) | Medium (Secure JWT authentication) |
| **Leave Quota Validation** | Manual check (Error-prone) | None (Attendance only) | Automated (Real-time check) | Automated (Real-time check in PostgreSQL) |
| **Deployment Complexity** | Low | High (On-site installation) | High (Long project timeline) | Low (Vercel, Render, Supabase) |

---

## 2.2 Summary of the Research Gap

The systematic review demonstrates a clear gap in the market for Small and Medium Enterprises (SMEs). Manual systems are too inefficient, biometric hardware is inflexible for modern remote work, and enterprise ERPs are too expensive. Therefore, the proposed custom Web-Based Attendance Management and Leave Tracking System bridges this gap. It provides the accessibility and automated analytics of an ERP without the prohibitive recurring costs, while eliminating the physical constraints of biometric hardware and the errors of manual logbooks.

By using a modern, decoupled web architecture, the proposed system delivers essential enterprise-level features. Implementing a centralized relational database using Supabase (PostgreSQL) ensures transactional integrity and automatic quota calculations, eliminating manual coordination errors. Using Server-Sent Events (SSE) allows the system to provide a real-time presence feed for managers, while JSON Web Token (JWT) validation secures role-based routing (Staff, HOD, Finance, MD, Admin). This project provides a scalable, affordable, and flexible tool tailored to the needs of SMEs operating in decentralized or multi-branch environments.

---

## CHAPTER 3 METHODOLOGY

Chapter 3 briefly describes about methodologies that will be used in this study. First, the overall flowcharts of the projects will be present in Section 3.1. Then, it followed by Section 3.2 where the methodology, framework, or model applied will be explained. The following Section 3.3 will introduce the systematic review of the methodology applied.

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

---

## CHAPTER 4 EXPECTED PROJECT OUTCOME

Chapter 4 details the specific expected outcomes, systems, and deliverables produced by the project. Section 4.1 discusses a functional and transparent employee portal, followed by Section 4.2 detailing an automated leave management engine. Section 4.3 presents an HR data analytics dashboard, and finally Section 4.4 outlines the comprehensive project documentation and evaluation.

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

---

## CHAPTER 5 PLANNING

Chapter 5 outlines the planning phase of the project. Section 5.1 provides an overview of the project schedule, including risk management and mitigation strategies. The detailed Gantt chart tracking the project timeline is provided in Appendix A.

## 5.1 Overview

To ensure the successful execution and delivery of the Web-Based Employee Attendance Management & Leave Tracking System within the 14-week academic semester, a structured project plan has been established. The project schedule is aligned with the Agile Scrum framework, organizing development into distinct phases with clear milestone checkpoints.

The project schedule includes the following phases:
1. **Phase 1: Project Initiation & Requirements Analysis (Weeks 1-2):** Research current HRM systems, define user requirements, and establish project scope.
2. **Phase 2: UI Design & Database Modeling (Weeks 2-3):** Design user interface wireframes and develop the Entity-Relationship Diagram (ERD).
3. **Phase 3: Backend API Setup & Authentication (Weeks 4-5):** Set up the Node.js Express server, configure JWT authentication, and establish the database connection.
4. **Phase 4: Frontend Development & SSE (Weeks 5-7):** Build the employee and manager dashboards and integrate Server-Sent Events (SSE) for real-time presence updates.
5. **Phase 5: Leave Engine & Approval Pipelines (Weeks 8-9):** Develop leave forms, write balance validations, and implement the multi-tier approval routing.
6. **Phase 6: Admin Dashboard & Analytics (Weeks 10-11):** Build the HR administrator layouts and integrate charts to visualize attendance and leave data.
7. **Phase 7: Quality Assurance & Testing (Weeks 11-12):** Execute automated unit tests (using Vitest) and conduct User Acceptance Testing (UAT) with users.
8. **Phase 8: Deployment & Report Finalization (Weeks 13-14):** Deploy the frontend on Vercel, the backend on Render, and compile the final project report.

### 5.1.1 Risk Management and Mitigation Strategies
To ensure steady progress, the project plan includes several mitigation strategies for common technical risks:
- **Database Connection Latency:** Database queries are optimized with indexes on frequently accessed fields, such as `user_id` and `date`, to prevent performance bottlenecks.
- **Scope Creep:** Feature development is strictly confined to the core attendance, leave, and reporting modules defined in Chapter 1.
- **Service Downtime:** The system uses decoupled cloud hosting (Vercel, Render, Supabase), which provides automatic service failovers to minimize downtime.

---

## 5.2 Gantt Chart

The project schedule and task dependencies are tracked using the timeline mapping detailed in Appendix A.

---

# REFERENCES

1. Beck, K., Beedle, M., Van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., ... & Thomas, D. (2001). *Manifesto for Agile Software Development*.
2. Elmasri, R., & Navathe, S. B. (2017). *Fundamentals of Database Systems* (7th ed.). Pearson.
3. Express Documentation. (2026). *Express Routing and Middleware Guides*. Retrieved from [expressjs.com](https://expressjs.com).
4. Fowler, M. (2012). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional.
5. Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.
6. PostgreSQL Global Development Group. (2026). *PostgreSQL 16 Database Documentation*. Retrieved from [postgresql.org](https://postgresql.org).
7. Pressman, R. S., & Maxim, B. R. (2020). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill.
8. React Documentation. (2026). *React Web Components & Lifecycle*. Retrieved from [react.dev](https://react.dev).
9. Schwaber, K., & Beedle, M. (2002). *Agile Software Development with Scrum*. Prentice Hall.
10. Somerville, I. (2016). *Software Engineering* (10th ed.). Pearson.
11. Supabase Documentation. (2026). *PostgreSQL Row Level Security and Realtime Streams*. Retrieved from [supabase.com](https://supabase.com).
12. TypeScript Documentation. (2026). *TypeScript Language Specification*. Retrieved from [typescriptlang.org](https://www.typescriptlang.org).

---

# APPENDICES

## APPENDIX A: Gantt Chart for the Project

The project schedule and task dependencies are tracked using the timeline mapping detailed below.

**Table 5: Detailed Gantt Chart task schedule and dependencies**

| ID | Task Name / Activity | Start Week | End Week | Duration | Predecessors | Key Deliverables |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **T1** | Lit Review & Requirements | W1 | W2 | 2 Weeks | None | Chapter 1 & 2 drafts |
| **T2** | Database Schema Design | W2 | W3 | 2 Weeks | T1 | PostgreSQL schema script |
| **T3** | API Setup & JWT Auth | W4 | W5 | 2 Weeks | T2 | Express server, Auth endpoints |
| **T4** | Dashboard & SSE Engine | W5 | W7 | 3 Weeks | T3 | React layouts, Live presence feed |
| **T5** | Leave Logic & Approvals | W8 | W9 | 2 Weeks | T4 | Validation scripts, HOD routing |
| **T6** | Analytics Dashboard | W10 | W11 | 2 Weeks | T5 | Chart displays, CSV export |
| **T7** | Vitest & UAT Testing | W11 | W12 | 2 Weeks | T6 | Test logs, survey summaries |
| **T8** | Vercel & Render Deployment| W13 | W13 | 1 Week | T7 | Live system URL |
| **T9** | Final Report Compile | W13 | W14 | 2 Weeks | T8 | Completed proposal report |

