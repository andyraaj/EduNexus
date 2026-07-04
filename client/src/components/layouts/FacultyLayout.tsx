import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard, BookOpen, CheckSquare, Edit3,
    Calendar, MessageSquare, User, FileCheck2,
    Megaphone, HelpCircle, Briefcase, Users,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import Sidebar from './Sidebar';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',       path: '/faculty/dashboard' },
    { icon: Megaphone,       label: 'Announcements',   path: '/faculty/announcements' },
    { icon: BookOpen,        label: 'Courses',          path: '/faculty/courses' },
    { icon: CheckSquare,     label: 'Attendance',       path: '/faculty/attendance' },
    { icon: CheckSquare,     label: 'QR Attendance',    path: '/faculty/qr-attendance' },
    { icon: Edit3,           label: 'Assignments',      path: '/faculty/assignments' },
    { icon: Calendar,        label: 'Quizzes',          path: '/faculty/quizzes' },
    { icon: LayoutDashboard, label: 'Gradebook',        path: '/faculty/gradebook' },
    { icon: FileCheck2,      label: 'Results',          path: '/faculty/results' },
    { icon: Briefcase,       label: 'Leave Requests',   path: '/faculty/leaves' },
    { icon: HelpCircle,      label: 'Doubt Solver',     path: '/faculty/doubts' },
    { icon: Users,           label: 'Mentorship',       path: '/faculty/mentorship' },
    { icon: Calendar,        label: 'Calendar',         path: '/faculty/calendar' },
    { icon: MessageSquare,   label: 'Messages',         path: '/faculty/messages' },
    { icon: User,            label: 'Profile',          path: '/faculty/profile' },
];

const FacultyLayout: React.FC = () => {
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
                roleTag="Faculty Portal"
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

export default FacultyLayout;
