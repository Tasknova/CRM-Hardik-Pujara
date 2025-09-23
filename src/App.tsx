import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/LandingPage';
import LoginForm from './components/auth/LoginForm';
import Header from './components/layout/Header';
import Sidebar, { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from './components/layout/Sidebar';
import MemberDashboard from './components/dashboard/MemberDashboard';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ProjectManagerDashboard from './components/dashboard/ProjectManagerDashboard';
import ProjectManagerProfile from './components/dashboard/ProjectManagerProfile';
import MemberProfile from './components/dashboard/MemberProfile';
import AdminProfile from './components/dashboard/AdminProfile';
import Reports from './components/dashboard/Reports';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import ProjectTasksPage from './components/dashboard/ProjectTasksPage';
import Footer from './components/layout/Footer';
import { supabase } from './lib/supabase';
import NotificationsPage from './components/dashboard/NotificationsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getRemovedFlag = (user) => user ? sessionStorage.getItem(`notifications_removed_${user.id}`) === '1' : false;

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'project_manager' | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Moved up
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showBadge, setShowBadge] = useState(true);
  const [filteredNotificationsCount, setFilteredNotificationsCount] = useState(0);
  const SIDEBAR_GAP = 16; // px

  React.useEffect(() => {
    if (!user) return;
    let isMounted = true;
    let channel: any = null;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (isMounted) {
        setUnreadNotifications(count || 0);
        // Hide badge if notifications are hidden, unless a new notification arrives
        const removed = getRemovedFlag(user);
        if (removed && (count || 0) === 0) setShowBadge(false);
        else if (removed && (count || 0) > 0) setShowBadge(true);
        else if (!removed) setShowBadge((count || 0) > 0);
      }
    };
    fetchUnread();
    // Real-time subscription
    channel = supabase.channel('notifications-unread-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchUnread();
        }
      )
      .subscribe();
    // Listen for custom event to hide badge
    const hideBadgeHandler = () => setShowBadge(false);
    window.addEventListener('notifications-hide-badge', hideBadgeHandler);
    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('notifications-hide-badge', hideBadgeHandler);
    };
  }, [user]);

  if (!user) {
    if (selectedRole) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoginForm
            role={selectedRole}
            onBack={() => setSelectedRole(null)}
          />
        </div>
      );
    }
    return <LandingPage onSelectRole={setSelectedRole} />;
  }

  const handleNotificationsClick = () => {
    setActiveTab('notifications');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
             <Header 
         unreadNotifications={filteredNotificationsCount === 0 ? 0 : unreadNotifications}
         onNotificationsClick={handleNotificationsClick}
         activeTab={activeTab}
       />
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main
        className="flex-1 transition-all duration-500 pr-4 md:pr-8 lg:pr-16"
        style={{
          paddingLeft: (sidebarOpen ? SIDEBAR_MAX_WIDTH : SIDEBAR_MIN_WIDTH) + SIDEBAR_GAP,
        }}
      >
        <Routes>
          <Route path="/projects/:projectId/tasks" element={<ProjectTasksPage />} />
          <Route path="*" element={
            user.role === 'admin' ? (
              activeTab === 'profile' ? <AdminProfile />
              : activeTab === 'reports' ? <Reports />
              : activeTab === 'notifications' ? <NotificationsPage setFilteredNotificationsCount={setFilteredNotificationsCount} />
              : <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />
            ) : user.role === 'project_manager' ? (
              activeTab === 'profile' ? <ProjectManagerProfile />
              : activeTab === 'notifications' ? <NotificationsPage setFilteredNotificationsCount={setFilteredNotificationsCount} />
              : <ProjectManagerDashboard activeTab={activeTab} />
            ) : activeTab === 'profile' ? (
              <MemberProfile />
            ) : activeTab === 'notifications' ? (
              <NotificationsPage setFilteredNotificationsCount={setFilteredNotificationsCount} />
            ) : (
              <MemberDashboard activeTab={activeTab} />
            )
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={4500} />
    </AuthProvider>
  );
};

export default App;