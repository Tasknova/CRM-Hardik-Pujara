import React from 'react';
import { Shield, Users, Folder, Key } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'member' | 'project_manager') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-6 rounded-full shadow-2xl border-4 border-blue-100">
            <div className="flex items-center justify-center">
              <img src="/logoFinal.png" alt="Propazone Logo" className="h-20 w-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Login Options */}
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Choose Your Access Level
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
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

          <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
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

          <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2" hover>
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

        {/* Project Level Access Link */}
        <div className="text-center">
          <a 
            href="/project-access/login" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
          >
            <Key className="w-4 h-4 mr-2" />
            Project Level Access
          </a>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;