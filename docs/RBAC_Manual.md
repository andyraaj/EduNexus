# Role-Based Access Control (RBAC) - A Beginner's Guide

## 1. What is RBAC?
**Role-Based Access Control (RBAC)** is a security method where access to a system is restricted based on the **role** a user holds within an organization. instead of giving permission to every single user individually (which is messy), you give permissions to a "Role" (like Student or Admin), and then assign that Role to a user.

### Key Concepts

#### **Authentication (AuthN)** - "Who are you?"
Authentication is the process of verifying a user's identity.
*   **Example**: Entering your generic `username` and `password` on a login screen.
*   **Analogy**: Showing your ID card to the security guard at the college gate. He just checks if you are a valid person to enter.

#### **Authorization (AuthZ)** - "What are you allowed to do?"
Authorization happens *after* authentication. It determines what resources the authenticated user can access.
*   **Example**: A student can view their own marks but cannot change them. An admin can change marks.
*   **Analogy**: Your ID card says you are a "Student". This allows you to enter the library and canteen, but the "Staff Room" is off-limits. The Principal's ID card allows him to enter everywhere.

### Difference Table
| Feature | Authentication (AuthN) | Authorization (AuthZ) |
| :--- | :--- | :--- |
| **Question** | Who are you? | What can you do? |
| **Verification** | Passwords, Biometrics, OTPs | Roles, Permissions, Rules |
| **Timing** | Happens First | Happens Second (after login) |
| **Error Message** | "Invalid Email or Password" | "Access Denied / 403 Forbidden" |

---

## 2. Why RBAC in an ERP System?
In a college ERP like **EduNexus**, you have thousands of users.
*   You cannot manually set permissions for 5,000 students separately.
*   **Security**: Students shouldn't see other students' grades or sensitive faculty data.
*   **Safety**: Only Admins should be able to delete users or modify course structures.
*   **Efficiency**: If a new module "Sports" is added, you just give the "Student" role access to it, and instantly all 5,000 students can see it.

---

## 3. Real-Life Example Flow
**Scenario**: A user logs in.

1.  **Login (AuthN)**: User enters `student@adani.edu.in` and password.
2.  **Role Detection**: The system checks the database.
    *   *Database says*: "User ID 101 is linked to Role ID 2 (Student)".
3.  **Token Generation**: The system creates a session/token that says `{ user: "Dhaval", role: "student" }`.
4.  **Access Control (AuthZ)**:
    *   User clicks "View Grades" -> **System checks**: "Does 'student' verify 'view_grades'?" -> **YES** -> Show Page.
    *   User clicks "Delete Faculty" -> **System checks**: "Does 'student' verify 'delete_user'?" -> **NO** -> Show "Access Denied".

---

## 4. EduNexus ERP Logic

### Roles Defined
1.  **Student**: The learner. Needs to consume information (classes, results).
2.  **Faculty**: The teacher. Needs to manage daily activities (attendance, marks).
3.  **Admin**: The controller. Needs full access to configure the system.

### Permissions Matrix
| Feature | Student | Faculty | Admin |
| :--- | :---: | :---: | :---: |
| **Login** | ✅ | ✅ | ✅ |
| **View Timetable** | ✅ | ✅ | ✅ |
| **View Attendance** | ✅ (Own) | ✅ (Class) | ✅ (All) |
| **Mark Attendance** | ❌ | ✅ | ✅ |
| **View Results** | ✅ (Own) | ✅ (Class) | ✅ (All) |
| **Upload Marks** | ❌ | ✅ | ✅ |
| **Manage Users** | ❌ | ❌ | ✅ |
| **System Settings** | ❌ | ❌ | ✅ |

---

## 5. Flow Diagram (Text-Based)

```mermaid
graph TD
    A[User Enters Credentials] --> B{Valid Login?}
    B -- No --> C[Show Error "Invalid Password"]
    B -- Yes --> D[Fetch User Role from DB]
    
    D --> E{Check Role}
    
    E -- Role = Student --> F[Redirect to /student-dashboard.html]
    E -- Role = Faculty --> G[Redirect to /faculty-dashboard.html]
    E -- Role = Admin --> H[Redirect to /admin-dashboard.html]
    
    F --> I[Load Student Permissions]
    G --> J[Load Faculty Permissions]
    H --> K[Load Admin Permissions]
    
    I --> L[Show: Results, Timetable, Attendance]
    J --> M[Show: Upload Marks, Take Attendance]
    K --> N[Show: Manage Users, System Config]
```

## 6. Implementation Strategy

### Frontend (What we will build now)
1.  **Simulation**: Since we don't have a real backend connected yet, we will simulate the "Database Check" using JavaScript.
2.  **Storage**: When you select a role and click login, we will save that role in `localStorage` (Browser memory).
3.  **Protection**: On every dashboard page, we will run a script:
    *   `token = localStorage.getItem('userRole')`
    *   `if (token != 'admin') window.location.href = 'login.html'`

### Backend (Conceptual) - Node.js & MySQL

**1. Database Schema (`users` table)**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('student', 'faculty', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example Data
INSERT INTO users (email, role) VALUES 
('student@adani.edu.in', 'student'),
('prof@adani.edu.in', 'faculty'),
('admin@adani.edu.in', 'admin');
```

**2. Node.js Middleware (Express.js Example)**
This code runs *before* the dashboard route to protect it.

```javascript
// Middleware to check roles
function checkRole(requiredRole) {
    return function(req, res, next) {
        // Assume req.user is set by authentication (Passport/JWT)
        if (req.user && req.user.role === requiredRole) {
            next(); // User has permission, proceed
        } else {
            res.status(403).json({ error: "Access Denied: Insufficient Permissions" });
        }
    }
}

// Applying the protection
app.get('/admin/dashboard', checkRole('admin'), (req, res) => {
    res.send("Welcome to Admin Panel");
});

app.get('/faculty/marks', checkRole('faculty'), (req, res) => {
    res.send("Upload Marks Here");
});
```
