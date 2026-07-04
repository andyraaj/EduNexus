import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard, BookOpen, CheckSquare,
    Calendar, MessageSquare, CreditCard, User,
    FileText, FileCheck2, Megaphone, HelpCircle, Users,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import Sidebar from './Sidebar';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/student/dashboard' },
    { icon: Megaphone,       label: 'Announcements',  path: '/student/announcements' },
    { icon: BookOpen,        label: 'Courses',         path: '/student/courses' },
    { icon: CheckSquare,     label: 'Attendance',      path: '/student/attendance' },
    { icon: CheckSquare,     label: 'QR Attendance',   path: '/student/qr-attendance' },
    { icon: FileText,        label: 'Assignments',     path: '/student/assignments' },
    { icon: Calendar,        label: 'Quizzes',         path: '/student/quizzes' },
    { icon: HelpCircle,      label: 'Doubt Solver',    path: '/student/doubts' },
    { icon: Users,           label: 'Mentorship',      path: '/student/mentorship' },
    { icon: FileCheck2,      label: 'Results',         path: '/student/results' },
    { icon: Calendar,        label: 'Calendar',        path: '/student/calendar' },
    { icon: MessageSquare,   label: 'Messages',        path: '/student/messages' },
    { icon: CreditCard,      label: 'Fees & Dues',     path: '/student/fees' },
    { icon: User,            label: 'Profile',         path: '/student/profile' },
];

const StudentLayout: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/login');
    }, [logout, navigate]);

    const openSidebar  = useCallback(() => setSidebarOpen(true), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    return (
        <div className="erp-layout">
            <Sidebar
                navItems={navItems}
                roleTag="Student Portal"
                isOpen={sidebarOpen}
                onClose={closeSidebar}
                onLogout={handleLogout}
            />

            <div className="erp-main">
                <TopBar onMenuClick={openSidebar} />
                <main className="erp-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default StudentLayout;
