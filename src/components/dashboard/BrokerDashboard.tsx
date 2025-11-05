import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  User, 
  LogOut, 
  Building2,
  Home,
  Building,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import BrokerDashboardHome from './BrokerDashboardHome';
import BrokerDealsPage from './BrokerDealsPage';
import BrokerTasksPage from './BrokerTasksPage';
import BrokerProfile from './BrokerProfile';

type BrokerTab = 'dashboard' | 'deals' | 'tasks' | 'profile';

const BrokerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BrokerTab>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user is a broker
    if (!user || (user as any).role !== 'broker') {
      navigate('/broker/login');
      return;
    }
    setLoading(false);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/broker/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const broker = user as any;

  const tabs = [
    { id: 'dashboard' as BrokerTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deals' as BrokerTab, label: 'Deals', icon: FileText },
    { id: 'tasks' as BrokerTab, label: 'Tasks', icon: CheckSquare },
    { id: 'profile' as BrokerTab, label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-purple-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src="/logoFinal.png" alt="Propazone" className="h-8 w-auto" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Propazone</span>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Broker Portal</span>
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
              <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {broker.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <BrokerDashboardHome brokerId={broker.id} />}
        {activeTab === 'deals' && <BrokerDealsPage brokerId={broker.id} />}
        {activeTab === 'tasks' && <BrokerTasksPage brokerId={broker.id} />}
        {activeTab === 'profile' && <BrokerProfile broker={broker} />}
      </div>
    </div>
  );
};

export default BrokerDashboard;

