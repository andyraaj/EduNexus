# EduNexus – College ERP Management System
**Complete Project Documentation**

## 1. Project Overview
"EduNexus" is a comprehensive Enterprise Resource Planning (ERP) system designed for colleges and universities. It streamlines academic and administrative processes by providing role-based portals for Students, Faculty, and Administrators. The system handles Attendance, Results, Fees/Billing, Quizzes, and User Management.

## 2. Technology Stack
The project is built using the **MERN Stack** (MongoDB, Express.js, React-logic via Vanilla JS, Node.js).

### Frontend
- **HTML5:** Semantic structure for all pages.
- **CSS3:** Custom styling with CSS Variables for theming (Root colors, spacing). No external CSS frameworks (Bootstrap/Tailwind) were used; all styles are hand-written in `styles.css`.
- **Vanilla JavaScript:** DOM manipulation, async/await for API calls, and local storage for session management.

### Backend
- **Node.js:** Runtime environment.
- **Express.js:** Web framework for routing and middleware.
- **MongoDB:** Database (connected via Mongoose ODM).

### Key Libraries & Dependencies
- **bcryptjs:** For hashing user passwords securely.
- **jsonwebtoken (JWT):** For secure authentication and session management.
- **cors:** To handle Cross-Origin Resource Sharing.
- **dotenv:** To manage environment variables.
- **pdfkit:** For generating downloadable PDF marksheets on the server side.
- **nodemon:** For development (auto-restarting server).

## 3. Architecture & Design
The project follows the **MVC (Model-View-Controller)** pattern.

- **Models (`server/models`):** Define the database schema (User, Student, Attendance, Marks, Quiz, etc.).
- **Views (`client/`):** HTML files serving as the user interface.
- **Controllers (Routes in `server/routes`):** Handle business logic and API endpoints.

### Authentication Flow
1. User logs in via `login.html`.
2. Server validates credentials and returns a **JWT Token**.
3. Token is stored in `localStorage` (`"EduNexus_session"`).
4. All subsequent API calls include this token in the `Authorization` header (`Bearer <token>`).
5. `authMiddleware.js` verifies the token and injects user info into the request object.

## 4. Modules & Features

### A. Student Module
- **Dashboard:** View attendance stats, pending fees, and result overview.
- **Attendance:** View monthly attendance records with color-coded status.
- **Results:** View marks for all semesters and **Download PDF Marksheet** (generated dynamically).
- **Billing:** View invoices and simulated "Pay Now" functionality.
- **Quizzes:** Take active quizzes with a countdown timer and auto-grading.

### B. Faculty Module
- **Dashboard:** Management-focused sidebar.
- **Mark Attendance:** Select Subject/Date -> Fetch Student List -> Mark Present/Absent.
- **Grading:** Select Subject/Exam -> Fetch Student List -> Enter Marks -> Save to DB.
- **Quiz Management:** Create new quizzes, add questions, set time limits.

### C. Admin Module
- **Dashboard:** System overview.
- **User Management:** View all users, filter by role (Student, Faculty, Admin), and manage accounts.

## 5. Project Directory Structure

```text
EduNexus/
├── client/                     # Frontend Code
│   ├── css/styles.css          # Global Styles
│   ├── js/script.js            # Main Logic (Auth, API calls, UI updates)
│   ├── index.html              # Landing Page
│   ├── login.html              # Login Page
│   ├── student-dashboard.html  # Student Portal
│   ├── faculty-dashboard.html  # Faculty Portal
│   ├── admin-dashboard.html    # Admin Portal
│   ├── attendance.html         # Student Attendance View
│   ├── results.html            # Student Results View
│   ├── billing.html            # Student Billing View
│   ├── quiz.html               # Student Quiz Interface
│   ├── faculty-attendance.html # Faculty Attendance Marking
│   ├── faculty-results.html    # Faculty Grading Interface
│   ├── faculty-quizzes.html    # Faculty Quiz Creation
│   ├── admin-users.html        # Admin User Management
│   └── ... (images/assets)
│
├── server/                     # Backend Code
│   ├── config/db.js            # Database Connection
│   ├── middleware/             # Auth Middleware
│   ├── models/                 # Mongoose Schemas (User, Student, Invoice, etc.)
│   ├── routes/                 # API Routes
│   │   ├── authRoutes.js       # Login/Register
│   │   ├── attendanceRoutes.js # Attendance Logic
│   │   ├── marksRoutes.js      # Marks & PDF Logic
│   │   ├── billingRoutes.js    # Invoice Logic
│   │   ├── quizRoutes.js       # Quiz Logic
│   │   ├── facultyRoutes.js    # Faculty Helper Routes
│   │   └── userRoutes.js       # User Management Routes
│   └── server.js               # Main Server Entry Point
│
├── .env                        # Environment Variables (Port, MongoURI, JWT Secret)
├── package.json                # Project Metadata & Dependencies
└── README.md                   # Quick Start Guide
```

## 6. Setup & Execution Instructions

### Prerequisites
- Node.js installed.
- MongoDB installed (or a cloud connection string).

### Steps to Run
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *(This installs express, mongoose, pdfkit, etc.)*

2.  **Configure Environment:**
    Ensure `.env` file exists with:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    ```

3.  **Start the Server:**
    ```bash
    npm start
    ```
    *(Server runs on port 5000 by default)*

4.  **Access the Application:**
    Open browser and go to `c`

## 7. Future Enhancements
- **Timetable Management:** Dynamic scheduling for classes.
- **Library Module:** Book tracking and issuing.
- **Messaging System:** Internal chat between Faculty and Students.
