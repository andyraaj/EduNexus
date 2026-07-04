# 🎓 EduNexus ERP - Comprehensive System Documentation

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

---

## 📖 Project Overview
**EduNexus ERP** is a robust, industrial-grade Educational Resource Planning system designed to streamline the management of modern academic institutions. It provides a unified, SaaS-like platform for Students, Faculty, and Administrators to manage academic operations, including attendance tracking, Learning Management (LMS), real-time notifications, messaging, and financial billing.

Built from scratch utilizing the **MERN Stack** (MongoDB, Express, React, Node.js), this project represents a production-ready architecture. The frontend is elevated with **TypeScript**, **Vite**, and **Tailwind CSS** for maximum performance, type safety, and a premium User Interface with micro-animations and skeleton loading states. The backend features advanced architectural patterns like JWT-gated WebSocket rooms, robust Role-Based Access Control (RBAC), and automated event-driven services.

---
## 🌐 Live Links & Demo

### 🚀 Live Application

https://EduNexus-d6jk.onrender.com/

### 🎥 Project Demonstration Video

https://youtu.be/NNCnvQNx45E?si=8kEkJsPTBwAHe0ik

### 💻 GitHub Repository

https://github.com/DhavalXHub/EduNexus-erp

### 🔑 Demo Student Credentials

Email: `student1@EduNexus.edu`

Password: `password123`

> **Note:** The application is hosted on Render's free tier. The first request may take 20–30 seconds while the server wakes up.

---

## ✨ Comprehensive Feature Set

### 🛡️ Role-Based Access Control (RBAC) & Identity Normalization
The application strictly protects routes and data utilizing an identity-normalized architecture (tying all sub-profiles to a core `User._id`). It features three distinct ecosystems:
1. **Admin**: Highest level of access. Manages user provisioning, system-wide analytics, course catalogs, and financial oversight.
2. **Faculty**: Academic instructors who manage specific course cohorts, track attendance, and drive the LMS (assignments, quizzes).
3. **Student**: The end-user who consumes educational content, submits tasks, takes timed quizzes, and tracks their holistic performance via aggregated analytics.

### 🧑‍🎓 Student Portal
- **Real-Time Dashboard**: View dynamic performance metrics (Overall Score, Attendance, Assignment/Quiz Averages), weekly activity charts, and real upcoming tasks.
- **LMS (Assignments & Quizzes)**: Submit assignments (with file URLs) and take real-time timed quizzes. View a "My Results" section for graded feedback.
- **Attendance Tracking**: Real-time view of attendance records for each enrolled subject.
- **Financial/Fees**: View fee invoices, payment history, and pending dues.
- **Real-Time Messaging & Notifications**: Instantly receive broadcast announcements and 1:1 chat messages.

### 👨‍🏫 Faculty Portal
- **Course & Roster Management**: Dynamically load assigned courses and view enrolled student cohorts.
- **Attendance Marker**: Interactive system to mark student attendance daily.
- **Assessments System**: Create quizzes with multiple-choice questions, publish assignments, and grade student submissions with custom feedback.
- **Faculty Insights Hub**: View deep analytics on assignment completion rates, attendance trends, and quiz score distributions for their specific courses.

### ⚙️ Admin Portal
- **Master Data Management**: Provision new students and faculty members securely.
- **Course & Enrollment Orchestration**: Create new courses and manage cross-department enrollments.
- **Financial Oversight**: Generate fee invoices for students and track overall institution revenue.
- **System Analytics**: Global dashboards using `recharts` to visualize attendance, revenue, and active users across the entire institution.

---

## 🛠️ Technology Stack & Deep Dive Implementation

### Frontend Ecosystem (Client)
- **React.js (v18) & Vite**: Replaced legacy build tools for significantly faster Hot Module Replacement (HMR) and optimized production builds. Uses Functional Components and Hooks extensively.
- **TypeScript**: Enforces strict domain models (e.g., `StudentAnalytics`, `QuizAttempt`) across the frontend for robust API integration.
- **Tailwind CSS & CSS Variables**: Utility-first styling combined with CSS custom properties (`index.css`) to enforce a centralized design system, ensuring a premium, consistent UI.
- **Context API & WebSocket**: 
  - `AuthContext`: Manages global JWT state.
  - `SocketContext`: Maintains a persistent `socket.io-client` connection. Authenticates using the JWT and automatically subscribes users to personal channels (`user_X`) and course channels (`course_Y`) for targeted real-time updates.
- **Axios**: Configured with interceptors to handle API requests and authorization headers.
- **Recharts**: Renders responsive SVG charts.
- **Skeleton Loaders**: Implemented custom CSS-animated skeleton components to prevent layout shift during data fetching.

### Backend Ecosystem (Server)
- **Node.js & Express.js**: The core RESTful API engine routing requests through an MVC (Model-View-Controller) architecture.
- **MongoDB & Mongoose**: Utilizes complex aggregations (`$lookup`, `$group`, `$unwind`) in the `analyticsService` to generate real-time performance metrics without storing redundant data.
- **JWT Authentication**: Stateless, secure authentication. 
- **Socket.io (Real-Time Engine)**: 
  - **Middleware**: Intercepts socket handshakes to verify the JWT.
  - **Event-Driven Broadcasts**: When a faculty creates an assignment, the `assignmentService` triggers `notificationService.notifyCourseStudents`, which maps the course roster and emits a `newNotification` event via Socket.IO directly to the enrolled students' browsers.
- **Bcrypt.js**: Secures user passwords.

---

## 📂 System Architecture & Folder Structure

The project uses a monorepo-style structure separating the client and server.

```text
EduNexus/
├── client/                     # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI elements (Skeleton, QuizRunner, TopBar)
│   │   ├── contexts/           # React Contexts (AuthContext, SocketContext)
│   │   ├── pages/              # Route views grouped by role (admin/, student/, faculty/)
│   │   ├── services/           # Axios API wrappers (lmsService.ts, analyticsService.ts)
│   │   ├── App.tsx             # Main router and layout configuration
│   │   └── main.tsx            # React entry point
│   ├── tailwind.config.js      # Tailwind theme configuration
│   └── tsconfig.json           
│
├── server/                     # Node.js + Express Backend
│   ├── config/                 # Database connection
│   ├── controllers/            # HTTP request/response handlers
│   ├── middleware/             # Auth & Error handling (authMiddleware.js)
│   ├── models/                 # Mongoose Schemas (User.js, Course.js, Assignment.js, etc.)
│   ├── routes/                 # API Endpoint definitions
│   ├── services/               # Core business logic & database queries
│   ├── server.js               # Main Express app initialization
│   └── socketServer.js         # Socket.io configuration and JWT validation
│
└── README.md                   # Project Documentation
```

---

## 🚀 From Scratch to End: How Data Flows

### 1. Unified Authentication Flow
When a user visits the site, the React frontend checks `AuthContext`. Upon login, `Axios` sends credentials to `POST /api/v1/auth/login`. The Express server verifies via `Bcrypt`, generates a JWT, and returns it. The client stores this in memory/localStorage and redirects to the appropriate dashboard. Simultaneously, the `SocketContext` instantiates a WebSocket connection, passing the JWT in the handshake for backend verification.

### 2. Service-Layer Abstraction
To keep controllers lean, the backend heavily utilizes a **Service Layer** (`server/services/`). For instance, when the Student Dashboard loads, it calls `fetchStudentAnalytics()`. The controller passes the request to `analyticsService.getStudentAnalytics(userId)`, which runs parallel Mongoose aggregations to calculate Attendance %, Assignment Averages, and fetches Upcoming Tasks, returning a unified payload.

### 3. Real-Time Event Driven Capabilities
When a Faculty member posts an Announcement or Assignment, the backend creates the database record, then triggers the internal `socketServer`. The server looks up all `Student._id`s enrolled in the target course, maps them to `User._id`s, and broadcasts a `new_announcement` or `newNotification` event. The client's `SocketContext` immediately pushes this into the React state, updating the UI (like a Notification Bell counter) instantly without polling.

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** (Running locally on port 27017 or a valid MongoDB Atlas URI)

### 1. Clone & Install Dependencies
```bash
# Install Server Dependencies
cd EduNexus/server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root `EduNexus/server` folder with the following:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/EduNexus_db
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Running the Application
Run the frontend and backend servers concurrently.

**Terminal 1: Start Backend**
```bash
cd EduNexus/server
npm run dev
# Starts Nodemon on http://localhost:5000
```

**Terminal 2: Start Frontend**
```bash
cd EduNexus/client
npm run dev
# Starts Vite on http://localhost:5173
```

Open your browser and navigate to **`http://localhost:5173`**. Log in using the provided demo buttons on the login screen to explore the distinct Student, Faculty, and Admin ecosystems.
