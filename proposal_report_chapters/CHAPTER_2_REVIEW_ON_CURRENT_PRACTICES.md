# CHAPTER 2: REVIEW ON CURRENT PRACTICES

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
* **Delayed Decision-Making:** Because data is consolidated asynchronously at the end of each payroll cycle, management lacks real-time visibility into daily attendance or sudden absenteeism. This hinders immediate resource planning.

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

---

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

As shown in Table 4, the proposed system provides the automated validation, cloud accessibility, and real-time reporting of an enterprise ERP, while maintaining the low cost and easy deployment of a manual system.

---

## 2.2 Summary of the Research Gap

The systematic review demonstrates a clear gap in the market for Small and Medium Enterprises (SMEs). Manual systems are too inefficient, biometric hardware is inflexible for modern remote work, and enterprise ERPs are too expensive. Therefore, the proposed custom Web-Based Attendance Management and Leave Tracking System bridges this gap. It provides the accessibility and automated analytics of an ERP without the prohibitive recurring costs, while eliminating the physical constraints of biometric hardware and the errors of manual logbooks.

By using a modern, decoupled web architecture, the proposed system delivers essential enterprise-level features. Implementing a centralized relational database using Supabase (PostgreSQL) ensures transactional integrity and automatic quota calculations, eliminating manual coordination errors. Using Server-Sent Events (SSE) allows the system to provide a real-time presence feed for managers, while JSON Web Token (JWT) validation secures role-based routing (Staff, HOD, Finance, MD, Admin). This project provides a scalable, affordable, and flexible tool tailored to the needs of SMEs operating in decentralized or multi-branch environments.
