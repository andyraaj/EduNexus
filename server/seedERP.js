/**
 * EduNexus ERP Seeder — v2
 * Fully consistent with unified User._id references across all models.
 * Department is now an ObjectId reference, not a string.
 *
 * Usage: node server/seedERP.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Timetable = require('./models/Timetable');
const AttendanceRecord = require('./models/AttendanceRecord');
const Marks = require('./models/Marks');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const Notice = require('./models/Notice');
const InstitutionSettings = require('./models/InstitutionSettings');

const connectDB = require('./config/db');

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting EduNexus ERP Database Seed (v2)...\n');

        // Clear ALL collections
        const collections = [
            User, Student, Faculty, Department, Course, Enrollment,
            Timetable, AttendanceRecord, Marks, Assignment, Submission,
            Quiz, QuizAttempt, Invoice, Payment, Notification, Notice,
            InstitutionSettings,
        ];
        await Promise.all(collections.map(M => M.deleteMany({})));
        console.log('✓ Cleared all existing data');

        // ═══════════════════════════════════════════════════════════════════
        // 1. INSTITUTION SETTINGS
        // ═══════════════════════════════════════════════════════════════════
        await InstitutionSettings.create({
            name: 'EduNexus University',
            code: 'ACX',
            activeAcademicYear: '2025-2026',
            attendanceThreshold: 75,
            defaultCurrency: 'INR',
            gradingScheme: 'marks',
            contactEmail: 'info@EduNexus.edu',
            contactPhone: '+91-1234567890',
            address: '123 University Road, Pune, Maharashtra',
        });
        console.log('✓ Created institution settings');

        // ═══════════════════════════════════════════════════════════════════
        // 2. DEPARTMENTS (ObjectId-based, not strings)
        // ═══════════════════════════════════════════════════════════════════
        const departments = await Department.insertMany([
            { code: 'CS', name: 'Computer Science', description: 'Department of Computer Science & Engineering' },
            { code: 'MATH', name: 'Mathematics', description: 'Department of Mathematics & Statistics' },
            { code: 'PHYS', name: 'Physics', description: 'Department of Physics & Applied Sciences' },
        ]);
        const deptMap = {};
        departments.forEach(d => { deptMap[d.code] = d._id; });
        console.log(`✓ Created ${departments.length} departments`);

        // ═══════════════════════════════════════════════════════════════════
        // 3. ADMIN USER
        // ═══════════════════════════════════════════════════════════════════
        const adminUser = await User.create({
            email: 'admin@EduNexus.edu',
            password: 'password123',
            name: 'Admin User',
            role: 'admin',
        });
        console.log('✓ Created admin user');

        // ═══════════════════════════════════════════════════════════════════
        // 4. FACULTY USERS & PROFILES
        // ═══════════════════════════════════════════════════════════════════
        const facultyData = [
            { name: 'Dr. John Smith', email: 'john.smith@EduNexus.edu', deptCode: 'CS', designation: 'Professor' },
            { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@EduNexus.edu', deptCode: 'CS', designation: 'Associate Professor' },
            { name: 'Prof. Priya Singh', email: 'priya.singh@EduNexus.edu', deptCode: 'MATH', designation: 'Professor' },
            { name: 'Dr. Amit Sharma', email: 'amit.sharma@EduNexus.edu', deptCode: 'PHYS', designation: 'Associate Professor' },
        ];

        const hashedPassword = await bcrypt.hash('password123', 10);
        const facultyUsers = await User.insertMany(
            facultyData.map(f => ({
                email: f.email,
                password: hashedPassword,
                name: f.name,
                role: 'faculty',
            }))
        );

        const facultyProfiles = await Faculty.insertMany(
            facultyUsers.map((user, idx) => ({
                user: user._id,
                department: deptMap[facultyData[idx].deptCode], // ObjectId ref
                designation: facultyData[idx].designation,
                employeeId: `EMP-2025-${idx + 1}`,
            }))
        );

        // Update department heads
        await Department.findByIdAndUpdate(deptMap['CS'], { headOfDepartment: facultyUsers[0]._id });
        await Department.findByIdAndUpdate(deptMap['MATH'], { headOfDepartment: facultyUsers[2]._id });
        await Department.findByIdAndUpdate(deptMap['PHYS'], { headOfDepartment: facultyUsers[3]._id });

        console.log(`✓ Created ${facultyProfiles.length} faculty members`);

        // ═══════════════════════════════════════════════════════════════════
        // 5. STUDENT USERS & PROFILES
        // ═══════════════════════════════════════════════════════════════════
        const deptCodes = ['CS', 'MATH', 'PHYS'];
        const studentUsers = [];
        const studentProfiles = [];

        for (let i = 0; i < 30; i++) {
            const deptCode = deptCodes[i % 3];
            const name = `Student ${i + 1}`;
            const email = `student${i + 1}@EduNexus.edu`;

            const user = await User.create({
                email,
                password: 'password123',
                name,
                role: 'student',
            });

            const student = await Student.create({
                user: user._id,
                rollNumber: `${deptCode}2025${String(i + 1).padStart(3, '0')}`,
                department: deptMap[deptCode], // ObjectId ref
                semester: 6,
                batchYear: 2025,
            });

            studentUsers.push(user);
            studentProfiles.push(student);
        }
        console.log('✓ Created 30 students across 3 departments');

        // ═══════════════════════════════════════════════════════════════════
        // 6. COURSES (primaryFaculty = User._id, department = ObjectId)
        // ═══════════════════════════════════════════════════════════════════
        const courseData = [
            { code: 'CS601', title: 'Data Structures & Algorithms', credits: 4, deptCode: 'CS', semester: 6, facultyIdx: 0 },
            { code: 'CS602', title: 'Database Systems', credits: 4, deptCode: 'CS', semester: 6, facultyIdx: 1 },
            { code: 'MATH601', title: 'Advanced Calculus', credits: 3, deptCode: 'MATH', semester: 6, facultyIdx: 2 },
            { code: 'MATH602', title: 'Linear Algebra', credits: 3, deptCode: 'MATH', semester: 6, facultyIdx: 2 },
            { code: 'PHYS601', title: 'Quantum Mechanics', credits: 4, deptCode: 'PHYS', semester: 6, facultyIdx: 3 },
            { code: 'PHYS602', title: 'Thermodynamics', credits: 3, deptCode: 'PHYS', semester: 6, facultyIdx: 3 },
        ];

        const courses = await Course.insertMany(
            courseData.map(c => ({
                code: c.code,
                title: c.title,
                credits: c.credits,
                department: deptMap[c.deptCode],               // ObjectId
                semester: c.semester,
                description: `A comprehensive course on ${c.title}`,
                primaryFaculty: facultyUsers[c.facultyIdx]._id, // User._id, NOT Faculty._id
                isActive: true,
            }))
        );
        console.log(`✓ Created ${courses.length} courses`);

        // ═══════════════════════════════════════════════════════════════════
        // 7. ENROLLMENTS (student = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const enrollments = [];
        for (let i = 0; i < studentUsers.length; i++) {
            const deptCode = deptCodes[i % 3];
            const deptId = deptMap[deptCode];
            const deptCourses = courses.filter(c => c.department.toString() === deptId.toString());

            for (const course of deptCourses.slice(0, 2)) {
                enrollments.push({
                    student: studentUsers[i]._id,  // User._id, NOT Student._id
                    course: course._id,
                    academicYear: '2025-2026',
                    semester: 6,
                    status: 'enrolled',
                });
            }
        }
        await Enrollment.insertMany(enrollments);
        console.log(`✓ Created ${enrollments.length} enrollments`);

        // ═══════════════════════════════════════════════════════════════════
        // 8. TIMETABLE (faculty = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const timeSlots = [
            { start: '09:00', end: '10:30' },
            { start: '11:00', end: '12:30' },
            { start: '14:00', end: '15:30' },
        ];

        const timetableEntries = courses.map((course, i) => ({
            course: course._id,
            faculty: course.primaryFaculty, // Already User._id
            dayOfWeek: daysOfWeek[i % 5],
            startTime: timeSlots[i % 3].start,
            endTime: timeSlots[i % 3].end,
            classroom: `Room ${101 + i}`,
            semester: 6,
            academicYear: '2025-2026',
            isActive: true,
        }));
        await Timetable.insertMany(timetableEntries);
        console.log(`✓ Created ${timetableEntries.length} timetable entries`);

        // ═══════════════════════════════════════════════════════════════════
        // 9. ATTENDANCE RECORDS (faculty = User._id, records.student = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const attendanceRecords = [];
        const today = new Date();
        for (let daysAgo = 10; daysAgo >= 0; daysAgo--) {
            for (const course of courses) {
                const date = new Date(today);
                date.setDate(date.getDate() - daysAgo);
                date.setUTCHours(0, 0, 0, 0);

                const relevantEnrollments = enrollments.filter(
                    e => e.course.toString() === course._id.toString()
                );
                if (relevantEnrollments.length > 0) {
                    attendanceRecords.push({
                        course: course._id,
                        faculty: course.primaryFaculty, // User._id
                        date,
                        records: relevantEnrollments.map(e => ({
                            student: e.student,  // User._id
                            status: Math.random() > 0.1 ? 'present' : 'absent'
                        }))
                    });
                }
            }
        }
        await AttendanceRecord.insertMany(attendanceRecords);
        console.log(`✓ Created ${attendanceRecords.length} attendance records`);

        // ═══════════════════════════════════════════════════════════════════
        // 10. MARKS (student = User._id, course = Course._id)
        // ═══════════════════════════════════════════════════════════════════
        const marks = [];
        const examTypes = ['Internal 1', 'Mid-Sem', 'Final'];
        for (let i = 0; i < studentUsers.length; i++) {
            for (const course of courses) {
                const isEnrolled = enrollments.some(
                    e => e.student.toString() === studentUsers[i]._id.toString()
                      && e.course.toString() === course._id.toString()
                );
                if (isEnrolled) {
                    for (const examType of examTypes) {
                        marks.push({
                            student: studentUsers[i]._id,  // User._id
                            course: course._id,             // Course._id (not Subject)
                            examType,
                            score: Math.floor(Math.random() * 80) + 20,
                            maxScore: 100,
                        });
                    }
                }
            }
        }
        await Marks.insertMany(marks);
        console.log(`✓ Created ${marks.length} marks entries`);

        // ═══════════════════════════════════════════════════════════════════
        // 11. ASSIGNMENTS (faculty = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const assignments = courses.map(course => ({
            course: course._id,
            faculty: course.primaryFaculty, // User._id
            title: `Assignment 1: ${course.title}`,
            description: `Complete the assignment covering core topics in ${course.title}`,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxMarks: 20,
        }));
        const assignmentDocs = await Assignment.insertMany(assignments);
        console.log(`✓ Created ${assignmentDocs.length} assignments`);

        // ═══════════════════════════════════════════════════════════════════
        // 12. SUBMISSIONS (student = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const submissions = [];
        for (const assignment of assignmentDocs) {
            const courseEnrollments = enrollments.filter(
                e => e.course.toString() === assignment.course.toString()
            );
            for (const enrollment of courseEnrollments.slice(0, 8)) {
                submissions.push({
                    assignment: assignment._id,
                    student: enrollment.student,  // User._id
                    fileUrl: `https://EduNexus.edu/submissions/a_${assignment._id}_s_${enrollment.student}.pdf`,
                    submittedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
                    marksAwarded: Math.floor(Math.random() * 20),
                    feedback: 'Good work. Could be improved in section 2.',
                });
            }
        }
        await Submission.insertMany(submissions);
        console.log(`✓ Created ${submissions.length} submissions`);

        // ═══════════════════════════════════════════════════════════════════
        // 13. QUIZZES (faculty = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const quizzes = await Quiz.insertMany(
            courses.map(course => ({
                course: course._id,
                faculty: course.primaryFaculty, // User._id
                title: `Quiz 1: ${course.title}`,
                description: `Quick assessment on ${course.title}`,
                timeLimitMinutes: 30,
                questions: [
                    { text: 'What is the primary concept of this module?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctOptionIndex: 0 },
                    { text: 'Which methodology is used in this domain?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctOptionIndex: 1 },
                    { text: 'What is the expected output of this process?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctOptionIndex: 2 },
                ],
                isActive: true,
            }))
        );
        console.log(`✓ Created ${quizzes.length} quizzes`);

        // ═══════════════════════════════════════════════════════════════════
        // 14. QUIZ ATTEMPTS (student = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const quizAttempts = [];
        for (const quiz of quizzes) {
            const courseEnrollments = enrollments.filter(
                e => e.course.toString() === quiz.course.toString()
            );
            for (const enrollment of courseEnrollments.slice(0, 6)) {
                const answersMap = {};
                if (quiz.questions?.length >= 3) {
                    answersMap[quiz.questions[0].questionId] = Math.floor(Math.random() * 4);
                    answersMap[quiz.questions[1].questionId] = Math.floor(Math.random() * 4);
                    answersMap[quiz.questions[2].questionId] = Math.floor(Math.random() * 4);
                }
                const pastDate = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);
                quizAttempts.push({
                    quiz: quiz._id,
                    student: enrollment.student, // User._id
                    score: Math.floor(Math.random() * quiz.questions.length),
                    answers: answersMap,
                    startTime: new Date(pastDate.getTime() - 30 * 60000),
                    endTime: pastDate,
                });
            }
        }
        await QuizAttempt.insertMany(quizAttempts);
        console.log(`✓ Created ${quizAttempts.length} quiz attempts`);

        // ═══════════════════════════════════════════════════════════════════
        // 15. INVOICES (student = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const invoices = [];
        for (const user of studentUsers) {
            const amountDue = 5000 + Math.round(Math.random() * 5000);
            const amountPaid = [0, Math.round(amountDue * 0.5), amountDue][Math.floor(Math.random() * 3)];
            const status = amountPaid === 0 ? 'pending' : amountPaid >= amountDue ? 'paid_full' : 'paid_partial';
            invoices.push({
                student: user._id, // User._id
                amountDue,
                amountPaid,
                status,
                type: 'tuition',
                description: 'Semester 6 tuition fees',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
        }
        const invoiceDocs = await Invoice.insertMany(invoices);
        console.log(`✓ Created ${invoiceDocs.length} invoices`);

        // ═══════════════════════════════════════════════════════════════════
        // 16. PAYMENTS (student = User._id, consistent with Invoice)
        // ═══════════════════════════════════════════════════════════════════
        const payments = [];
        for (const invoice of invoiceDocs) {
            if (invoice.amountPaid > 0) {
                payments.push({
                    invoice: invoice._id,
                    student: invoice.student, // User._id — consistent!
                    amount: invoice.amountPaid,
                    paymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    method: ['credit_card', 'bank_transfer', 'upi'][Math.floor(Math.random() * 3)],
                });
            }
        }
        await Payment.insertMany(payments);
        console.log(`✓ Created ${payments.length} payment records`);

        // ═══════════════════════════════════════════════════════════════════
        // 17. ANNOUNCEMENTS
        // ═══════════════════════════════════════════════════════════════════
        await Notice.insertMany([
            { title: 'Semester Registration Open', content: 'Registration for next semester is now open. Register before the deadline.', postedBy: adminUser._id, category: 'Academic', targetAudience: 'all' },
            { title: 'Mid-Semester Exams Schedule', content: 'Mid-semester exams will be held from next week. Check your timetable.', postedBy: adminUser._id, category: 'Urgent', targetAudience: 'student' },
            { title: 'Library Extended Hours', content: 'Library will remain open until 10 PM during exam season.', postedBy: adminUser._id, category: 'General', targetAudience: 'all' },
            { title: 'New Lab Equipment', content: 'New lab equipment has been installed in Lab 3.', postedBy: adminUser._id, category: 'Event', targetAudience: 'all' },
            { title: 'Scholarship Announcement', content: 'Merit-based scholarships are available. Apply by the deadline.', postedBy: adminUser._id, category: 'Academic', targetAudience: 'student' },
        ]);
        console.log('✓ Created 5 announcements');

        // ═══════════════════════════════════════════════════════════════════
        // 18. NOTIFICATIONS (recipient = User._id)
        // ═══════════════════════════════════════════════════════════════════
        const notifications = [];
        for (const user of studentUsers.slice(0, 10)) {
            notifications.push({
                recipient: user._id, // User._id
                message: 'Your assignment has been submitted successfully.',
                type: 'assignment_created',
                isRead: false,
            });
        }
        await Notification.insertMany(notifications);
        console.log('✓ Created 10 notifications');

        // ═══════════════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════════════
        console.log('\n✅ EduNexus ERP Seed Complete!');
        console.log('📊 Summary:');
        console.log('   • 1 Admin (admin@EduNexus.edu / password123)');
        console.log(`   • ${facultyProfiles.length} Faculty (john.smith@EduNexus.edu / password123)`);
        console.log(`   • ${studentUsers.length} Students (student1@EduNexus.edu / password123)`);
        console.log(`   • ${departments.length} Departments`);
        console.log(`   • ${courses.length} Courses`);
        console.log(`   • ${enrollments.length} Enrollments`);
        console.log(`   • ${timetableEntries.length} Timetable entries`);
        console.log(`   • ${attendanceRecords.length} Attendance records`);
        console.log(`   • ${marks.length} Marks entries`);
        console.log(`   • ${assignmentDocs.length} Assignments`);
        console.log(`   • ${submissions.length} Submissions`);
        console.log(`   • ${quizzes.length} Quizzes`);
        console.log(`   • ${quizAttempts.length} Quiz attempts`);
        console.log(`   • ${invoiceDocs.length} Invoices`);
        console.log(`   • ${payments.length} Payments`);
        console.log('\n🔑 All passwords: password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

// Connect and seed
connectDB().then(seedDatabase).catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
});
