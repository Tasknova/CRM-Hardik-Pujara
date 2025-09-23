import React from 'react';
import { Shield, Users, CheckCircle, Calendar, Folder } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'member' | 'project_manager') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-teal-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-full shadow-2xl border-4 border-blue-100 transform hover:scale-110 transition-transform duration-300">
              <img 
                src="/logo2.png" 
                alt="Tasknova Logo" 
                className="h-20 w-auto"
              />
            </div>
          </div>

          <p className="text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light">
            Streamline your team's task management and leave tracking with our comprehensive, intelligent solution
          </p>
          <div className="mt-8 flex justify-center">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-1 w-24 rounded-full"></div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-10 mb-20">
          <Card className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Task Management</h3>
            <p className="text-gray-600 text-base leading-relaxed">
              Create, assign, and track tasks with priorities, deadlines, and real-time status updates for seamless project execution
            </p>
          </Card>

          <Card className="text-center p-8 bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Leave Management</h3>
            <p className="text-gray-600 text-base leading-relaxed">
              Plan and track team leaves with an intuitive calendar interface, automated balance tracking, and streamlined approval workflow
            </p>
          </Card>

          <Card className="text-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Team Collaboration</h3>
            <p className="text-gray-600 text-base leading-relaxed">
              Enhance team productivity with role-based access controls, real-time notifications, and comprehensive oversight tools
            </p>
          </Card>
        </div>

        {/* Login Options */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Choose Your Access Level
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105" hover>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Admin Access</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Full control over team tasks, leaves, and member management
              </p>
              <Button
                onClick={() => onSelectRole('admin')}
                className="w-full py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform transition-all duration-200 hover:scale-105"
                variant="primary"
              >
                Login as Admin
              </Button>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105" hover>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Folder className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Project Manager</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Manage tasks and projects for all team members
              </p>
              <Button
                onClick={() => onSelectRole('project_manager')}
                className="w-full py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform transition-all duration-200 hover:scale-105"
                variant="primary"
              >
                Login as Project Manager
              </Button>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105" hover>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Team Member</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Manage personal tasks and submit leave requests
              </p>
              <Button
                onClick={() => onSelectRole('member')}
                className="w-full py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform transition-all duration-200 hover:scale-105"
                variant="primary"
              >
                Login as Member
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;