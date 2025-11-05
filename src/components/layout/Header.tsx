import React, { useState } from 'react';
import { LogOut, User, Bell, ArrowLeft, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';

interface HeaderProps {
  unreadNotifications: number;
  onNotificationsClick: () => void;
  activeTab: string;
  onProfileClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ unreadNotifications, onNotificationsClick, activeTab, onProfileClick }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
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
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Back Button - Only show on project tasks page */}
            {isOnProjectTasksPage && (
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 mr-4 px-4 py-2 rounded-lg font-medium shadow-sm transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Button>
            )}
            
            <div className="flex-shrink-0 flex items-center">
              <div className="block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{getPageTitle()}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Propazone Real Estate CRM</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Notifications Icon */}
            <button
              onClick={onNotificationsClick}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            
            <button 
              onClick={onProfileClick}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </button>
            
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs">
            <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">Are you sure you want to logout?</div>
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