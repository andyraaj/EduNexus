# EduNexus – College ERP Management System
## Web Application Development Project (Semester VI)

---

## 1. System Overview

### Purpose of EduNexus
EduNexus is a centralized Enterprise Resource Planning (ERP) system designed specifically for educational institutions. It aims to digitize and automate manual academic processes, fostering a seamless ﬂow of information between students, faculty, and administration. Unlike generic ERPs, EduNexus is hyper-focused on the academic lifecycle, from attendance tracking to performance analytics.

### Target Users
- **Students**: Access academic data, resources, and track performance.
- **Faculty**: Manage course delivery, attendance, assessments, and student progress.
- **Admin**: Oversee the entire institution’s data, configuration, and user management.

### Problems Solved by the System
- **Data Redundancy**: Eliminates scattered spreadsheets and paper records.
- **Communication Gap**: reducing the delay in conveying important notices (exams, events).
- **Manual Errors**: Automates marks calculation and attendance aggregation.
- **Performance Blindspots**: Provides real-time insights into student progress, preventing "surprise" failures at the end of the semester.

### Key Advantages
- **Centralized Information Hub**: Single source of truth for all academic data.
- **Real-time Analytics**: Instant feedback on attendance risk and exam performance.
- **Paperless Workflow**: Digital assignments, notes, and leave requests.
- **Role-Speciﬁc UI**: optimized dashboards for each user type to reduce clutter.

---

## 2. User Roles & Access Control

### Role-Based Access Control (RBAC)
EduNexus enforces strict strict RBAC to ensure data security and integrity.
- **Authentication**: All users must log in via a secure portal.
- **Authorization**: Middleware checks user role before granting access to specific API routes or pages.

### Roles Description
1.  **Student**: Read-mostly access to personal data; Write access for quizzes, leave requests, and profile updates.
2.  **Faculty**: Read/Write access for their assigned subjects/classes (Attendance, Marks, Notes). Cannot modify global settings.
3.  **Admin**: Superuser access. Can manage users, course structures, and view global analytics.

---

## 3. Modules & Features

### A. Student Module
*Focused on tracking personal progress and accessing resources.*
- **Profile Management**: View and edit basic details (phone, email, bio).
- **Attendance**:
    - Visual Dashboard: Percentage view with color codes.
    - **Status Indicators**:
        - 🟢 **Safe (>75%)**
        - 🟡 **Warning (60-75%)**
        - 🔴 **Critical (<60%)**
- **Timetable Viewer**: Dynamic calendar view with the current day's schedule highlighted.
- **Examination**:
    - View Internal/External marks.
    - **CGPA/percentage calculator** based on input data.
- **Academic Performance Tracker**: Line/Bar charts showing performance trends over semesters.
- **Subject-Based Resource Hub**: Download Notes (PDF), View PPTs, Access Question Banks.
- **Digital Leave Request**: Apply for leave with reason and attachments (medical certs). Track status (Pending/Approved/Rejected).
- **Notice Board**: Tabbed view for **Urgent**, **Academic**, and **Events**.
- **Instant Quiz**:
    - Join quiz via code or notification.
    - Timer-based interface.
    - Auto-submission on timeout.
    - Performance history view.

### B. Faculty Module
*Focused on class management and student evaluation.*
- **Attendance Management**: Mark attendance for assigned slots. Bulk update based on previous record (auto-fill active students).
- **Marks Management**: Input internal marks subject-wise. Auto-calculate averages.
- **Study Material Upload**: Drag-and-drop interface for uploading notes to specific subjects.
- **Quiz Management**:
    - Create new/edit quizzes.
    - Set Time Limit, Title, and Description.
    - View real-time participation counts.
- **Leave Requests**: Approve or Reject student leave applications with comments.
- **Notice Board**: Post notices for assigned classes/departments. Priority tagging.

### C. Admin Module
*Focused on configuration and oversight.*
- **User Management**: Add/Edit/Delete Students and Faculty. Bulk import via CSV.
- **Academic Configuration**: Manage Departments, Courses, and Subjects allocation.
- **Timetable Builder**: Drag-and-drop or slot-based timetable creation.
- **Global Notices**: Post announcements visible to the entire college.
- **Quiz Monitoring**: Oversee all active quizzes and their integrity.
- **Analytics Dashboard**:
    - Daily Login Stats.
    - Attendance Marking Compliance (Which faculty hasn't marked attendance?).
- **Activity Logs**: Audit trail of critical actions (e.g., "Admin updated User A's role").

---

## 4. Instant Quiz System (Detailed Design)

The **Instant Quiz System** is a cornerstone feature for real-time academic assessment.

### Workflow
1.  **Creation**: Faculty creates a quiz, adds questions (MCQ), sets the correct answer key, and defines a duration (e.g., 10 minutes).
2.  **Publishing**: Faculty "Publishes" the quiz. It becomes active for the target student group.
3.  **Participation**:
    - Students see an "Active Quiz" notification.
    - On start, a server-side timer begins.
    - Questions are served (randomized order to prevent cheating).
    - Students select options.
4.  **Submission**:
    - Student clicks "Submit" OR Timer hits 00:00.
    - Answers are processed immediately against the key.
5.  **Result**:
    - Student sees their score immediately.
    - Faculty sees a leaderboard and distribution of scores.

### Technical Highlight
- **State Management**: Use LocalStorage/SessionStorage to preserve quiz state if the browser is accidentally refreshed, combined with server-side timestamps to prevent time manipulation.

---

## 5. Dashboards & Analytics

### Student Dashboard
- **Header**: "Welcome back, [Name]. You have [X] upcoming exams."
- **Cards**:
    - Attendance Summary (Donut Chart).
    - Recent Marks (Bar Chart).
    - Active Notices (List).
    - "Next Class" widget.

### Faculty Dashboard
- **Quick Actions**: "Mark Attendance", "Upload Notes".
- **Insights**:
    - "Class Low Attendance Alert": List of students below 60%.
    - Quiz completion rates.

### Admin Dashboard (System Health)
- **Stats Widgets**: Total Users, Active Sessions Today, Storage Used.
- **Graph**: System activity over the last 30 days.

---

## 6. UI/UX Design Requirements

### Theme Strategy
- **Primary Color**: Academic Blue (`#2563EB`) or Deep Teal (`#0F766E`) for trust and professionalism.
- **Secondary Color**: Slate segments for text hierarchy.
- **Feedback Colors**: Green (Success), Red (Danger/Critical), Amber (Warning).

### Accessibility & Layout
- **Responsiveness**: Mobile-first approach using CSS Grid/Flexbox.
- **Navigation**:
    - **Desktop**: Sidebar navigation (collapsible).
    - **Mobile**: Bottom navigation bar or Hamburger menu.
- **Dark Mode**: Toggle verified accessible contrast ratios.

---

## 7. Technology Stack

### Frontend
- **Core**: HTML5, CSS3 (Custom Variables + Flexbox/Grid).
- **Scripting**: Vanilla JavaScript (ES6+) for maximum control and understanding logic for the project.
- **Framework (Optional/Bonus)**: React.js or Vue.js if advanced interactivity is needed.
- **Charts**: Chart.js or ApexCharts for analytics.

### Backend
- **Runtime**: Node.js.
- **Framework**: Express.js (Minimalist, robust).
- **Architecture**: MVC (Model-View-Controller) pattern to keep code organized.

### Database
- **Primary**: MongoDB (NoSQL) - Excellent for handling flexible schemas like Quiz questions or User profiles.
- **Alternative**: MySQL - If relational strictness is preferred for Attendance/Marks.

### Authentication
- **Mechanism**: JSON Web Tokens (JWT).
- **Storage**: HTTPOnly Cookies for security (prevents XSS).

---

## 8. Database Design

### E-R Diagram Description
The database revolves around the `User` entity, branching into specialized profiles. `Attendance` and `Marks` link `Users` to `Subjects`. `Quizzes` link to `Subjects` and `Faculty`.

### Key Collections / Tables

1.  **Users**
    - `_id`, `name`, `email`, `password_hash`, `role` (enum: 'student', 'faculty', 'admin'), `created_at`.
2.  **Profiles** (Extends Users)
    - `user_id`, `department`, `year`, `semester`, `details` (JSON).
3.  **Subjects**
    - `_id`, `name`, `code`, `department`, `semester`.
4.  **Attendance**
    - `_id`, `student_id`, `subject_id`, `date`, `status` (Present/Absent), `faculty_id`.
5.  **Marks**
    - `_id`, `student_id`, `subject_id`, `exam_type` (Internal 1, Mid-sem), `score`, `total_max`.
6.  **Quizzes**
    - `_id`, `title`, `faculty_id`, `subject_id`, `questions` (Array of Objects), `time_limit_min`, `is_active`.
7.  **QuizAttempts**
    - `_id`, `quiz_id`, `student_id`, `score`, `answers_submitted`, `timestamp`.
8.  **Resources**
    - `_id`, `subject_id`, `uploader_id`, `file_url`, `file_type`, `title`.

---

## 9. Security Considerations

1.  **Password Hashing**: Use `bcrypt` or `argon2` to hash passwords before storing. Never store plain text.
2.  **Input Validation**: sanitize all inputs (e.g., using `express-validator` or `zod`) to prevent MongoDB Injection or SQL Injection.
3.  **Protected Routes**: Middleware to verify JWT token validity before serving the dashboard.
4.  **Role Guard**: Middleware to check `if (user.role === 'admin')` before allowing administrative actions.

---

## 10. Future Scope

- **AI Performance Predictor**: Use historical data to predict if a student is at risk of failing.
- **Parent Portal**: A refined view for parents to track their ward's attendance.
- **Payment Gateway**: Integration for collection of semester fees.
- **Mobile Application**: React Native app consuming the same API.

---

## 11. Conclusion
EduNexus represents a modern approach to campus management. By focusing on user experience and real-time data, it transforms the mundane task of record-keeping into a strategic asset for the institution.
