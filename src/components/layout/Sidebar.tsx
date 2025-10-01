import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  CalendarDays, 
  Users, 
  BarChart3,
  UserPlus,
  Folder,
  User,
  BarChart2,
  CalendarRange,
  ClipboardList,
  Target,
  Settings,
  Shield,
  Trash2,
  Home,
  Building2,
  UserCheck,
  Building,
  Factory,
  CreditCard,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom'; // Added for NavLink
import type { NavLinkProps } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dashboardMode?: 'team' | 'business';
  onDashboardModeChange?: (mode: 'team' | 'business') => void;
}

// Sidebar widths for layout adjustment
export const SIDEBAR_MIN_WIDTH = 64; // px (w-16)
export const SIDEBAR_MAX_WIDTH = 256; // px (w-64)

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, setIsOpen, dashboardMode, onDashboardModeChange }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isProjectManager = user?.role === 'project_manager';
  const isSuperAdmin = user?.email === 'contact.propazone@gmail.com';

  const memberTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'projects', label: 'Projects', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  // Team Management Navigation
  const teamManagementTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: ClipboardList },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'deleted-tasks', label: 'Deleted Tasks', icon: Trash2 },
    { id: 'leave-management', label: 'Leave Management', icon: CalendarDays },
    { id: 'all-leaves', label: 'All Leaves', icon: CalendarRange },
    { id: 'company-holidays', label: 'Company Holidays', icon: CalendarRange },
    { id: 'team-members', label: 'Team Members', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'admin-management', label: 'Admin Management', icon: Shield },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // Business Management Navigation
  const businessManagementTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rental-property', label: 'Rental Property', icon: Home },
    { id: 'resale-property', label: 'Resale Property', icon: Building2 },
    { id: 'builder-property', label: 'Builder Purchase', icon: Factory },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'owners', label: 'Owners', icon: Building },
    { id: 'builders', label: 'Builders', icon: Factory },
    { id: 'loan-providers', label: 'Loan Providers', icon: CreditCard },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'document-hub', label: 'Document Hub', icon: FileText },
    { id: 'project-managers', label: 'PM Management', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // Legacy admin tabs (for backward compatibility)
  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: ClipboardList },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'deleted-tasks', label: 'Deleted Tasks', icon: Trash2 },
    { id: 'leaves', label: 'All Leaves', icon: CalendarDays },
    { id: 'holidays', label: 'Company Holidays', icon: CalendarRange },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'rental-property', label: 'Rental Property', icon: Home },
    { id: 'resale-property', label: 'Resale Property', icon: Building2 },
    { id: 'builder-property', label: 'Builder Purchase', icon: Factory },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'owners', label: 'Owners', icon: Building },
    { id: 'builders', label: 'Builders', icon: Factory },
    { id: 'loan-providers', label: 'Loan Providers', icon: CreditCard },
    { id: 'project-manager-management', label: 'PM Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'admin-management', label: 'Admin Management', icon: Shield },
  ];

  const projectManagerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: ClipboardList },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'profile', label: 'Profile', icon: User },
  ];
  if (isSuperAdmin) {
    adminTabs.splice(3, 0, { id: 'leave-defaults', label: 'Leave Management', icon: Settings });
  }

  // Select tabs based on dashboard mode and user role
  let tabs;
  if (user?.role === 'admin' && dashboardMode) {
    // Admin with dashboard mode
    tabs = dashboardMode === 'team' ? teamManagementTabs : businessManagementTabs;
  } else {
    // Legacy behavior for other roles or no dashboard mode
    tabs = user?.role === 'admin' ? adminTabs : user?.role === 'project_manager' ? projectManagerTabs : memberTabs;
  }


  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30
        ${isOpen ? 'w-64' : 'w-16'}
        bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200
        shadow-xl transition-all duration-500 ease-in-out
        group/sidebar
      `}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
             {/* Logo Section */}
       <div className="flex items-center justify-center h-16 px-4 border-b border-blue-200">
         {isOpen ? (
           <div className="flex items-center space-x-2">
             <div className="text-2xl">🏢</div>
             <h1 className="text-xl font-bold text-gray-800">Propazone</h1>
           </div>
         ) : (
           <div className="text-2xl">🏢</div>
         )}
       </div>

      {/* Dashboard Mode Switcher for Admin */}
      {isAdmin && dashboardMode && onDashboardModeChange && (
        <div className="px-2 py-3 border-b border-blue-200">
          <div className={`flex bg-gray-100 rounded-lg p-1 ${isOpen ? 'flex-row' : 'flex-col space-y-1'}`}>
            <button
              onClick={() => onDashboardModeChange('team')}
              className={`${isOpen ? 'flex-1' : 'w-full'} px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                dashboardMode === 'team'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              {isOpen && <span className="truncate">Team</span>}
            </button>
            <button
              onClick={() => onDashboardModeChange('business')}
              className={`${isOpen ? 'flex-1' : 'w-full'} px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                dashboardMode === 'business'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3 h-3 inline mr-1" />
              {isOpen && <span className="truncate">Business</span>}
            </button>
          </div>
        </div>
      )}

      <nav className={`mt-4 px-2 transition-all duration-500 ease-in-out overflow-y-auto h-[calc(100vh-5rem)] custom-scrollbar`} style={{ maxHeight: 'calc(100vh - 5rem)', minHeight: 'calc(100vh - 5rem)' }}>
        <ul className="space-y-2">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <li key={tab.id} className="overflow-hidden">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center w-full py-3 rounded-lg transition-all duration-300
                    ${activeTab === tab.id 
                      ? 'bg-blue-200 text-blue-800 shadow-lg scale-105' 
                      : 'text-blue-600 hover:bg-blue-100 hover:text-blue-900'
                    }
                    ${isOpen ? 'px-4' : 'justify-center'}
                    sidebar-btn
                  `}
                  style={{
                    transitionDelay: `${idx * 40}ms`,
                  }}
                >
                                     <span className={`transition-transform duration-500 ${isOpen ? 'scale-110' : 'scale-100'} relative`}>
                     <Icon className="w-6 h-6" />
                   </span>
                  <span
                    className={`ml-3 whitespace-nowrap font-medium text-base transition-all duration-500
                      ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}
                    `}
                  >
                    {tab.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Animated accent bar */}
      <div className={`absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-blue-400 to-blue-200 rounded-r transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}></div>
    </aside>
  );
};

export default Sidebar;