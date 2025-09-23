import React, { useState } from 'react';
import { LogOut, User, Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';

interface HeaderProps {
  unreadNotifications: number;
  onNotificationsClick: () => void;
  activeTab: string;
}

const Header: React.FC<HeaderProps> = ({ unreadNotifications, onNotificationsClick, activeTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Check if we're on the project tasks page
  const isOnProjectTasksPage = location.pathname.includes('/projects/') && location.pathname.includes('/tasks');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'good morning';
    if (hour < 18) return 'good afternoon';
    return 'good evening';
  };

  const getPageTitle = () => {
    // For dashboard, show personalized greeting instead of "Dashboard"
    if (activeTab === 'dashboard') {
      const adminName = user?.name || 'Admin';
      return `Hey ${adminName}, ${getGreeting()} 👋`;
    }

    const titleMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'tasks': 'All Tasks',
      'my-tasks': 'My Tasks',
      'daily-tasks': 'Daily Tasks',
      'leaves': 'All Leaves',
      'holidays': 'Company Holidays',
      'team': 'Team Management',
      'reports': 'Reports',
      'projects': 'Projects',
      'project-manager-management': 'Project Manager Management',
      'notifications': 'Notifications',
      'profile': 'Profile',
      'admin-management': 'Admin Management',
      'leave-defaults': 'Leave Management'
    };
    
    return titleMap[activeTab] || 'Dashboard';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Back Button - Only show on project tasks page */}
            {isOnProjectTasksPage && (
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 mr-4 px-4 py-2 rounded-lg font-medium shadow-sm transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Button>
            )}
            
            <div className="flex-shrink-0 flex items-center">
              <div className="block">
                <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-xs text-gray-500">Tasknova Team Management</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications Icon */}
            <button
              onClick={onNotificationsClick}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="danger"
                size="sm"
                icon={LogOut}
                onClick={() => setShowLogoutConfirm(true)}
                className="font-semibold px-4 py-2 rounded shadow hover:bg-red-600 hover:text-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <div className="mb-4 text-lg font-semibold text-gray-800">Are you sure you want to logout?</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;