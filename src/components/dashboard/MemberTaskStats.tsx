import React, { useState, useEffect } from 'react';
import { Task, Member, Admin } from '../../types';
import Card from '../ui/Card';
import { Users, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';

interface MemberTaskStatsProps {
  tasks: Task[];
  members: Member[];
  admins: Admin[];
  projectManagers: any[];
  currentUserId?: string;
  showOnlyCurrentUser?: boolean;
}

interface MemberStats {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned: number;
  completed: number;
  pending: number;
  inProgress: number;
  total: number;
}

export const MemberTaskStats: React.FC<MemberTaskStatsProps> = ({
  tasks,
  members,
  admins,
  projectManagers,
  currentUserId,
  showOnlyCurrentUser = false
}) => {
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);

  useEffect(() => {
    const calculateStats = () => {
      // Combine all users
      const allUsers = [
        ...members.map(m => ({ ...m, role: 'member' })),
        ...admins.map(a => ({ ...a, role: 'admin' })),
        ...projectManagers.map(pm => ({ ...pm, role: 'project_manager' }))
      ];

      // Filter users if showing only current user
      const usersToShow = showOnlyCurrentUser && currentUserId 
        ? allUsers.filter(user => user.id === currentUserId)
        : allUsers;

      const stats = usersToShow.map(user => {
        const userTasks = tasks.filter(task => task.user_id === user.id);
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assigned: userTasks.length,
          completed: userTasks.filter(task => task.status === 'completed').length,
          pending: userTasks.filter(task => task.status !== 'completed').length,
          inProgress: userTasks.filter(task => task.status === 'in_progress').length,
          total: userTasks.length
        };
      });

      // Sort by total tasks (descending), then by name
      stats.sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        return a.name.localeCompare(b.name);
      });

      setMemberStats(stats);
    };

    calculateStats();
  }, [tasks, members, admins, projectManagers, currentUserId, showOnlyCurrentUser]);

  if (memberStats.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No task statistics available</p>
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-purple-600 bg-purple-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'project_manager': return 'bg-purple-100 text-purple-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-800">
            {showOnlyCurrentUser ? 'My Task Statistics' : 'Member Task Statistics'}
          </h3>
        </div>
        <div className="text-xs text-gray-500">
          Real-time updates
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {memberStats.map((member) => (
          <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-xs">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm truncate">{member.name}</h4>
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                    {member.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{member.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-green-600">{member.completed}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-600">{member.inProgress}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-yellow-600">{member.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>

            {/* Progress bar */}
            {member.total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((member.completed / member.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(member.completed / member.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary */}
      {!showOnlyCurrentUser && memberStats.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {memberStats.reduce((sum, member) => sum + member.total, 0)}
              </div>
              <div className="text-xs text-gray-500">Total Tasks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {memberStats.reduce((sum, member) => sum + member.completed, 0)}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {memberStats.reduce((sum, member) => sum + member.inProgress, 0)}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {memberStats.reduce((sum, member) => sum + member.pending, 0)}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
