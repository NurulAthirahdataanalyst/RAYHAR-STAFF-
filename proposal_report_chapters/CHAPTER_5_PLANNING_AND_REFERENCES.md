# CHAPTER 5: PLANNING

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

The project schedule and task dependencies are tracked using the timeline mapping detailed in Table 5.

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
