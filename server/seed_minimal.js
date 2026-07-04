/**
 * Fixed minimal seeder — creates Departments first, then Users + profiles.
 * Run: node server/seed_minimal.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const Course = require('./models/Course');

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected:', mongoose.connection.host);

        // ── 1. Clear existing data ─────────────────────────────────────────────
        await Promise.all([
            User.deleteMany(),
            Student.deleteMany(),
            Faculty.deleteMany(),
            Department.deleteMany(),
            Course.deleteMany(),
        ]);
        console.log('🗑️  Cleared: Users, Students, Faculty, Departments, Courses');

        // ── 2. Create Departments ──────────────────────────────────────────────
        const [deptCS, deptMath, deptPhys] = await Department.insertMany([
            { code: 'CS', name: 'Computer Science', description: 'Computer Science & Engineering', isActive: true },
            { code: 'MATH', name: 'Mathematics', description: 'Mathematics & Statistics', isActive: true },
            { code: 'PHY', name: 'Physics', description: 'Physics & Applied Sciences', isActive: true },
        ]);
        console.log('🏛️  Departments created: CS, MATH, PHY');

        // ── 3. Create Admin User ───────────────────────────────────────────────
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@edunexus.edu',
            password: 'password123',
            role: 'admin',
        });
        console.log('👤 Admin created');

        // ── 4. Create Faculty Users + profiles ────────────────────────────────
        const [fuJohn, fuSarah, fuMichael] = await User.create([
            { name: 'Dr. John Smith',      email: 'john.smith@edunexus.edu',    password: 'password123', role: 'faculty' },
            { name: 'Prof. Sarah Johnson', email: 'sarah.johnson@edunexus.edu', password: 'password123', role: 'faculty' },
            { name: 'Dr. Michael Chen',    email: 'michael.chen@edunexus.edu',  password: 'password123', role: 'faculty' },
        ]);

        await Faculty.create([
            { user: fuJohn._id,    employeeId: 'EMP001', department: deptCS._id,   designation: 'Associate Professor' },
            { user: fuSarah._id,   employeeId: 'EMP002', department: deptMath._id, designation: 'Assistant Professor' },
            { user: fuMichael._id, employeeId: 'EMP003', department: deptPhys._id, designation: 'Lecturer' },
        ]);
        console.log('👨‍🏫 Faculty created: John, Sarah, Michael');

        // ── 5. Create Student Users + profiles ────────────────────────────────
        const deptMap = [deptCS._id, deptMath._id, deptPhys._id];

        const studentUsers = [];
        for (let i = 0; i < 10; i++) {
            const u = await User.create({
                name: `Student ${i + 1}`,
                email: `student${i + 1}@edunexus.edu`,
                password: 'password123',
                role: 'student',
            });
            studentUsers.push(u);
        }

        await Student.insertMany(studentUsers.map((u, i) => ({
            user: u._id,
            rollNumber: `STU2024${String(i + 1).padStart(3, '0')}`,
            department: deptMap[i % 3],
            semester: (i % 2 === 0) ? 5 : 6,
            batchYear: 2024,
        })));
        console.log('🎓 10 Students created');

        // ── 6. Create Courses ──────────────────────────────────────────────────
        await Course.insertMany([
            { code: 'CS601',   title: 'Data Structures & Algorithms', credits: 4, department: deptCS._id,   semester: 6, primaryFaculty: fuJohn._id,    isActive: true },
            { code: 'CS602',   title: 'Web Development',              credits: 4, department: deptCS._id,   semester: 6, primaryFaculty: fuJohn._id,    isActive: true },
            { code: 'MATH501', title: 'Advanced Calculus',            credits: 3, department: deptMath._id, semester: 5, primaryFaculty: fuSarah._id,   isActive: true },
            { code: 'MATH502', title: 'Linear Algebra',               credits: 3, department: deptMath._id, semester: 5, primaryFaculty: fuSarah._id,   isActive: true },
            { code: 'PHY601',  title: 'Quantum Mechanics',            credits: 4, department: deptPhys._id, semester: 6, primaryFaculty: fuMichael._id, isActive: true },
            { code: 'PHY602',  title: 'Electromagnetism',             credits: 4, department: deptPhys._id, semester: 6, primaryFaculty: fuMichael._id, isActive: true },
        ]);
        console.log('📚 6 Courses created');

        // ── Done ───────────────────────────────────────────────────────────────
        console.log('\n✅ Seeding complete!\n');
        console.log('══════════════════════════════════════════════════');
        console.log('  LOGIN CREDENTIALS (use these on the deployed app)');
        console.log('══════════════════════════════════════════════════');
        console.log('  Role      Email                            Password');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  admin     admin@edunexus.edu               password123');
        console.log('  faculty   john.smith@edunexus.edu          password123');
        console.log('  faculty   sarah.johnson@edunexus.edu       password123');
        console.log('  faculty   michael.chen@edunexus.edu        password123');
        console.log('  student   student1@edunexus.edu            password123');
        console.log('  student   student2@edunexus.edu            password123');
        console.log('══════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        console.error(err);
        process.exit(1);
    }
};

seed();
