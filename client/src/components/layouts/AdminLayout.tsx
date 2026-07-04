import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    BarChart2, Users, Building2, ClipboardList, Book,
    CalendarClock, FileCheck2, DollarSign, Megaphone,
    CalendarDays, ShieldCheck, MessageSquare, Settings,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import Sidebar from './Sidebar';

const navItems = [
    { icon: BarChart2,      label: 'Dashboard',     path: '/admin/dashboard' },
    { icon: Users,          label: 'Users',          path: '/admin/users' },
    { icon: Building2,      label: 'Foundation',     path: '/admin/foundation' },
    { icon: ClipboardList,  label: 'Admissions',     path: '/admin/admissions' },
    { icon: Book,           label: 'Courses',        path: '/admin/courses' },
    { icon: CalendarClock,  label: 'Timetable',      path: '/admin/timetable' },
    { icon: FileCheck2,     label: 'Results',        path: '/admin/results' },
    { icon: DollarSign,     label: 'Finance',        path: '/admin/finance' },
    { icon: BarChart2,      label: 'Analytics',      path: '/admin/analytics' },
    { icon: Megaphone,      label: 'Announcements',  path: '/admin/announcements' },
    { icon: CalendarDays,   label: 'Calendar',       path: '/admin/calendar' },
    { icon: ShieldCheck,    label: 'Audit Logs',     path: '/admin/audit-logs' },
    { icon: MessageSquare,  label: 'Messages',       path: '/admin/messages' },
    { icon: Settings,       label: 'Settings',       path: '/admin/profile' },
];

const AdminLayout: React.FC = () => {
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
                roleTag="Admin Console"
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

export default AdminLayout;
