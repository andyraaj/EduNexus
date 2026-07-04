import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';

// Layouts & Protection
import ProtectedRoute from '@/components/ProtectedRoute';
import StudentLayout from '@/components/layouts/StudentLayout';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Shared Pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const AdmissionsApplyPage = lazy(() => import('@/pages/AdmissionsApplyPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AcademicCalendarPage = lazy(() => import('@/pages/common/AcademicCalendarPage'));

// Student Pages
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'));
const StudentCoursesPage = lazy(() => import('@/pages/student/StudentCoursesPage'));
const StudentAttendancePage = lazy(() => import('@/pages/student/StudentAttendancePage'));
const StudentQRScannerPage = lazy(() => import('@/pages/student/StudentQRScannerPage'));
const StudentQuizPage = lazy(() => import('@/pages/student/StudentQuizPage'));
const StudentFeesPage = lazy(() => import('@/pages/student/StudentFeesPage'));
const StudentMessagesPage = lazy(() => import('@/pages/student/StudentMessagesPage'));
const StudentAssignmentsPage = lazy(() => import('@/pages/student/StudentAssignmentsPage'));
const QuizAttemptPage = lazy(() => import('@/pages/student/QuizAttemptPage'));
const StudentResultsPage = lazy(() => import('@/pages/student/StudentResultsPage'));
const StudentCoursePage = lazy(() => import('@/pages/student/StudentCoursePage'));
const StudentDoubtsPage = lazy(() => import('@/pages/student/StudentDoubtsPage'));
const StudentMentorshipPage = lazy(() => import('@/pages/student/StudentMentorshipPage'));

// Faculty Pages
const FacultyDashboard = lazy(() => import('@/pages/faculty/FacultyDashboard'));
const FacultyCoursesPage = lazy(() => import('@/pages/faculty/FacultyCoursesPage'));
const FacultyCoursePage = lazy(() => import('@/pages/faculty/FacultyCoursePage'));
const FacultyAttendancePage = lazy(() => import('@/pages/faculty/FacultyAttendancePage'));
const FacultyQRAttendancePage = lazy(() => import('@/pages/faculty/FacultyQRAttendancePage'));
const FacultyAssignmentsPage = lazy(() => import('@/pages/faculty/FacultyAssignmentsPage'));
const FacultyQuizPage = lazy(() => import('@/pages/faculty/FacultyQuizPage'));
const FacultyQuizAttemptsPage = lazy(() => import('@/pages/faculty/FacultyQuizAttemptsPage'));
const FacultyGradebookPage = lazy(() => import('@/pages/faculty/FacultyGradebookPage'));
const FacultyLeavesPage = lazy(() => import('@/pages/faculty/FacultyLeavesPage'));
const FacultyDoubtsPage = lazy(() => import('@/pages/faculty/FacultyDoubtsPage'));
const FacultyMentorshipPage = lazy(() => import('@/pages/faculty/FacultyMentorshipPage'));

// Admin Pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminCoursesPage = lazy(() => import('@/pages/admin/AdminCoursesPage'));
const AdminFinancePage = lazy(() => import('@/pages/admin/AdminFinancePage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));
const AdminFoundationPage = lazy(() => import('@/pages/admin/AdminFoundationPage'));
const AdminTimetablePage = lazy(() => import('@/pages/admin/AdminTimetablePage'));
const AdminAdmissionsPage = lazy(() => import('@/pages/admin/AdminAdmissionsPage'));

const MessagesPage = lazy(() => import('@/pages/common/MessagesPage'));
const ResultsManagementPage = lazy(() => import('@/pages/common/ResultsManagementPage'));

const routeFallback = (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        Loading...
    </div>
);

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                <Suspense fallback={routeFallback}>
                <Routes>
                    {/* Public Route */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/admissions/apply" element={<AdmissionsApplyPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/pricing" element={<PricingPage />} />

                    {/* Student Routes */}
                    <Route path="/student" element={<ProtectedRoute allowedRoles={['student']} />}>
                        <Route element={<StudentLayout />}>
                            <Route index element={<Navigate to="/student/dashboard" replace />} />
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="announcements" element={<AdminAnnouncementsPage />} />
                            <Route path="courses" element={<StudentCoursesPage />} />
                            <Route path="courses/:courseId" element={<StudentCoursePage />} />
                            <Route path="attendance" element={<StudentAttendancePage />} />
                            <Route path="qr-attendance" element={<StudentQRScannerPage />} />
                            <Route path="assignments" element={<StudentAssignmentsPage />} />
                            <Route path="quizzes" element={<StudentQuizPage />} />
                            <Route path="quizzes/attempt/:id" element={<QuizAttemptPage />} />
                            <Route path="results" element={<StudentResultsPage />} />
                            <Route path="doubts" element={<StudentDoubtsPage />} />
                            <Route path="mentorship" element={<StudentMentorshipPage />} />
                            <Route path="calendar" element={<AcademicCalendarPage />} />
                            <Route path="fees" element={<StudentFeesPage />} />
                            <Route path="messages" element={<StudentMessagesPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="profile/:userId" element={<ProfilePage />} />
                        </Route>
                    </Route>

                    {/* Faculty Routes */}
                    <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']} />}>
                        <Route element={<FacultyLayout />}>
                            <Route index element={<Navigate to="/faculty/dashboard" replace />} />
                            <Route path="dashboard" element={<FacultyDashboard />} />
                            <Route path="announcements" element={<AdminAnnouncementsPage />} />
                            <Route path="courses" element={<FacultyCoursesPage />} />
                            <Route path="courses/:courseId" element={<FacultyCoursePage />} />
                            <Route path="attendance" element={<FacultyAttendancePage />} />
                            <Route path="qr-attendance" element={<FacultyQRAttendancePage />} />
                            <Route path="assignments" element={<FacultyAssignmentsPage />} />
                            <Route path="quizzes" element={<FacultyQuizPage />} />
                            <Route path="quizzes/:quizId/attempts" element={<FacultyQuizAttemptsPage />} />
                            <Route path="gradebook" element={<FacultyGradebookPage />} />
                            <Route path="results" element={<ResultsManagementPage />} />
                            <Route path="leaves" element={<FacultyLeavesPage />} />
                            <Route path="doubts" element={<FacultyDoubtsPage />} />
                            <Route path="mentorship" element={<FacultyMentorshipPage />} />
                            <Route path="calendar" element={<AcademicCalendarPage />} />
                            <Route path="messages" element={<MessagesPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="profile/:userId" element={<ProfilePage />} />
                        </Route>
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                        <Route element={<AdminLayout />}>
                            <Route index element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsersPage />} />
                            <Route path="courses" element={<AdminCoursesPage />} />
                            <Route path="foundation" element={<AdminFoundationPage />} />
                            <Route path="admissions" element={<AdminAdmissionsPage />} />
                            <Route path="timetable" element={<AdminTimetablePage />} />
                            <Route path="results" element={<ResultsManagementPage />} />
                            <Route path="finance" element={<AdminFinancePage />} />
                            <Route path="analytics" element={<AdminAnalyticsPage />} />
                            <Route path="announcements" element={<AdminAnnouncementsPage />} />
                            <Route path="calendar" element={<AcademicCalendarPage />} />
                            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                            <Route path="messages" element={<MessagesPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="profile/:userId" element={<ProfilePage />} />
                        </Route>
                    </Route>

                    {/* Catch All - 404 */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                </Suspense>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
