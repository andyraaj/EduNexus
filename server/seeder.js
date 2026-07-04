const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Notice = require('./models/Notice');
const connectDB = require('./config/db');

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });
connectDB();

const importData = async () => {
    try {
        // Clear all collections
        await User.deleteMany();
        await Student.deleteMany();
        await Faculty.deleteMany();
        await Course.deleteMany();
        await Enrollment.deleteMany();
        await Invoice.deleteMany();
        await Payment.deleteMany();
        await Quiz.deleteMany();
        await QuizAttempt.deleteMany();
        await Assignment.deleteMany();
        await Submission.deleteMany();
        await Notice.deleteMany();
        console.log('Data Cleared...');

        // ── Create Users ──────────────────────────────────────────────────────
        const adminUser = await User.create({ name: 'Admin User', email: 'admin@EduNexus.edu', password: 'password123', role: 'admin' });
        
        const facultyUser1 = await User.create({ name: 'Dr. John Smith', email: 'john.smith@EduNexus.edu', password: 'password123', role: 'faculty' });
        const facultyUser2 = await User.create({ name: 'Prof. Sarah Johnson', email: 'sarah.johnson@EduNexus.edu', password: 'password123', role: 'faculty' });
        const facultyUser3 = await User.create({ name: 'Dr. Michael Chen', email: 'michael.chen@EduNexus.edu', password: 'password123', role: 'faculty' });

        const studentUsers = [];
        for (let i = 0; i < 20; i++) {
            const u = await User.create({
                name: `Student ${i + 1}`,
                email: `student${i + 1}@EduNexus.edu`,
                password: 'password123',
                role: 'student'
            });
            studentUsers.push(u);
        }

        // ── Create Faculty ────────────────────────────────────────────────────
        const faculty1 = await Faculty.create({
            user: facultyUser1._id,
            employeeId: 'EMP001',
            department: 'Computer Science',
            designation: 'Associate Professor'
        });

        const faculty2 = await Faculty.create({
            user: facultyUser2._id,
            employeeId: 'EMP002',
            department: 'Mathematics',
            designation: 'Assistant Professor'
        });

        const faculty3 = await Faculty.create({
            user: facultyUser3._id,
            employeeId: 'EMP003',
            department: 'Physics',
            designation: 'Lecturer'
        });

        // ── Create Courses ────────────────────────────────────────────────────
        const courses = await Course.insertMany([
            { code: 'CS601', title: 'Data Structures & Algorithms', credits: 4, department: 'Computer Science', semester: 6, primaryFaculty: faculty1._id, isActive: true },
            { code: 'CS602', title: 'Web Development', credits: 4, department: 'Computer Science', semester: 6, primaryFaculty: faculty1._id, isActive: true },
            { code: 'MATH501', title: 'Advanced Calculus', credits: 3, department: 'Mathematics', semester: 5, primaryFaculty: faculty2._id, isActive: true },
            { code: 'MATH502', title: 'Linear Algebra', credits: 3, department: 'Mathematics', semester: 5, primaryFaculty: faculty2._id, isActive: true },
            { code: 'PHY601', title: 'Quantum Mechanics', credits: 4, department: 'Physics', semester: 6, primaryFaculty: faculty3._id, isActive: true },
            { code: 'PHY602', title: 'Electromagnetism', credits: 4, department: 'Physics', semester: 6, primaryFaculty: faculty3._id, isActive: true }
        ]);

        // ── Create Students ───────────────────────────────────────────────────
        const students = await Student.insertMany(studentUsers.map((user, i) => {
            const departments = ['Computer Science', 'Mathematics', 'Physics'];
            const dept = departments[i % 3];
            return {
                user: user._id,
                rollNumber: `${dept.substring(0, 2).toUpperCase()}2024${String(i + 1).padStart(3, '0')}`,
                department: dept,
                semester: i % 2 === 0 ? 5 : 6,
                batchYear: 2024
            };
        }));

        // ── Create Enrollments ────────────────────────────────────────────────
        const enrollments = [];
        const academicYear = '2025-2026';
        
        // CS students enroll in CS courses
        for (let i = 0; i < 7; i++) {
            enrollments.push(
                { student: students[i]._id, course: courses[0]._id, academicYear, semester: 6, status: 'enrolled' },
                { student: students[i]._id, course: courses[1]._id, academicYear, semester: 6, status: 'enrolled' }
            );
        }
        
        // Math students enroll in Math courses
        for (let i = 7; i < 14; i++) {
            enrollments.push(
                { student: students[i]._id, course: courses[2]._id, academicYear, semester: 5, status: 'enrolled' },
                { student: students[i]._id, course: courses[3]._id, academicYear, semester: 5, status: 'enrolled' }
            );
        }
        
        // Physics students enroll in Physics courses
        for (let i = 14; i < 20; i++) {
            enrollments.push(
                { student: students[i]._id, course: courses[4]._id, academicYear, semester: 6, status: 'enrolled' },
                { student: students[i]._id, course: courses[5]._id, academicYear, semester: 6, status: 'enrolled' }
            );
        }
        
        await Enrollment.insertMany(enrollments);

        // ── Create Invoices & Payments (for admin telemetry) ─────────────────
        const invoices = [];
        const payments = [];
        const paymentMethods = ['credit_card', 'debit_card', 'net_banking', 'upi', 'bank_transfer'];
        
        for (let i = 0; i < students.length; i++) {
            const tuitionDue = 45000;
            const rand = Math.random();
            let invoice;
            
            if (rand < 0.3) {
                // 30% fully paid
                const inv = {
                    student: students[i]._id,
                    amountDue: tuitionDue,
                    amountPaid: tuitionDue,
                    dueDate: new Date(2026, 5, 30),
                    status: 'paid_full',
                    type: 'tuition',
                    description: 'Semester 6 Tuition Fee'
                };
                invoices.push(inv);
            } else if (rand < 0.6) {
                // 30% pending
                invoices.push({
                    student: students[i]._id,
                    amountDue: tuitionDue,
                    amountPaid: 0,
                    dueDate: new Date(2026, 5, 30),
                    status: 'pending',
                    type: 'tuition',
                    description: 'Semester 6 Tuition Fee'
                });
            } else {
                // 40% partial payment
                const amountPaid = Math.floor(tuitionDue * (0.3 + Math.random() * 0.6));
                invoices.push({
                    student: students[i]._id,
                    amountDue: tuitionDue,
                    amountPaid: amountPaid,
                    dueDate: new Date(2026, 5, 30),
                    status: 'paid_partial',
                    type: 'tuition',
                    description: 'Semester 6 Tuition Fee'
                });
            }
        }
        
        const createdInvoices = await Invoice.insertMany(invoices);
        
        // Create payments for paid invoices
        for (const inv of createdInvoices) {
            if (inv.amountPaid > 0) {
                payments.push({
                    invoice: inv._id,
                    student: inv.student,
                    amount: inv.amountPaid,
                    paymentDate: new Date(2026, 1, Math.floor(Math.random() * 28) + 1),
                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
                });
            }
        }
        
        if (payments.length > 0) await Payment.insertMany(payments);

        // ── Create Quizzes & Quiz Attempts ────────────────────────────────────
        const quiz1 = await Quiz.create({
            title: 'Data Structures Basics',
            description: 'Test your understanding of fundamental data structures',
            course: courses[0]._id,
            faculty: faculty1._id,
            questions: [
                { text: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctOptionIndex: 1 },
                { text: 'Which data structure uses LIFO?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctOptionIndex: 1 }
            ],
            timeLimitMinutes: 15,
            isActive: true
        });

        // Create quiz attempts for some students
        for (let i = 0; i < 5; i++) {
            await QuizAttempt.create({
                student: students[i]._id,
                quiz: quiz1._id,
                score: Math.floor(Math.random() * 20) + 5,
                submittedAt: new Date()
            });
        }

        // ── Create Assignments ────────────────────────────────────────────────
        const assignment1 = await Assignment.create({
            title: 'Implement Binary Search Tree',
            description: 'Implement a complete BST with insert, delete, and search operations',
            course: courses[0]._id,
            faculty: faculty1._id,
            dueDate: new Date(2026, 3, 30),
            maxMarks: 100,
            isActive: true
        });

        // Create submissions
        for (let i = 0; i < 5; i++) {
            await Submission.create({
                student: students[i]._id,
                assignment: assignment1._id,
                fileUrl: `https://example.com/submissions/student${i + 1}_bst.zip`,
                submittedAt: new Date(2026, 3, 25),
                marksAwarded: Math.floor(Math.random() * 30) + 60,
                feedback: 'Good implementation. Code quality could be improved.'
            });
        }

        // ── Create Notices ────────────────────────────────────────────────────
        await Notice.insertMany([
            {
                title: 'Exam Registration Deadline Extended',
                content: 'The last date for semester exam registration has been extended to 15th March 2026.',
                category: 'Urgent',
                postedBy: adminUser._id,
                targetAudience: 'all'
            },
            {
                title: 'Annual Tech Fest – Technova 2026',
                content: 'Get ready for the biggest tech event of the year! Hackathons, coding contests, and robotics workshops.',
                category: 'Event',
                postedBy: adminUser._id,
                targetAudience: 'all'
            },
            {
                title: 'Mid-Semester Examination Schedule Released',
                content: 'The mid-semester examination schedule has been published. Students must check their hall tickets.',
                category: 'Academic',
                postedBy: facultyUser1._id,
                targetAudience: 'student'
            },
            {
                title: 'Library Closed This Sunday',
                content: 'The Central Library will remain closed on Sunday due to scheduled maintenance.',
                category: 'General',
                postedBy: adminUser._id,
                targetAudience: 'all'
            },
            {
                title: 'Faculty Meeting – Curriculum Review',
                content: 'All faculty members must attend the curriculum review meeting on March 12 at 2:00 PM.',
                category: 'Urgent',
                postedBy: adminUser._id,
                targetAudience: 'faculty'
            }
        ]);

        console.log('\n✅ Sample Data Imported Successfully!');
        console.log('\nTest Credentials:');
        console.log('  Admin:    admin@EduNexus.edu           / password123');
        console.log('  Faculty:  john.smith@EduNexus.edu      / password123');
        console.log('  Faculty:  sarah.johnson@EduNexus.edu   / password123');
        console.log('  Faculty:  michael.chen@EduNexus.edu    / password123');
        console.log('  Student:  student1@EduNexus.edu        / password123');
        console.log('  Student:  student2@EduNexus.edu        / password123');
        console.log('\n📊 Created:');
        console.log(`  • 20 Students across 3 departments`);
        console.log(`  • 3 Faculty members`);
        console.log(`  • 6 Courses`);
        console.log(`  • 40 Enrollments`);
        console.log(`  • 20 Invoices with mixed statuses`);
        console.log(`  • 12 Payments`);
        console.log(`  • 1 Quiz with 5 attempts`);
        console.log(`  • 1 Assignment with 5 submissions`);
        console.log(`  • 5 Announcements`);
        console.log('');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
};

importData();
