import React from 'react';
import { CheckCircle, AlertTriangle, Play, FileText, Pause } from 'lucide-react';
import { Task, Leave } from '../../types';
import Card from '../ui/Card';

interface DashboardStatsProps {
  tasks: Task[];
  leaves: Leave[];
  userRole?: 'admin' | 'member' | 'project_manager';
  userId?: string;
  assignedProjectIds?: string[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ tasks, userRole, userId, assignedProjectIds }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter tasks based on user role
  let filteredTasks = tasks;
  
  if (userRole === 'member' && userId) {
    // Members see only tasks assigned to them
    filteredTasks = tasks.filter(task => {
      const assignedIds = task.assigned_user_ids?.filter(id => id) || [];
      return assignedIds.includes(userId);
    });
  } else if (userRole === 'project_manager' && assignedProjectIds) {
    // Project Managers see only tasks from their assigned projects
    filteredTasks = tasks.filter(task => 
      task.project_id && assignedProjectIds.includes(task.project_id)
    );
  }
  // Admins see all tasks (no filtering needed)

  const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
  const notStartedTasks = filteredTasks.filter(task => task.status === 'not_started').length;
  const pendingTasks = filteredTasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress').length;
  // Blocked: not completed and due before today, or status 'blocked'
  const blockedTasks = filteredTasks.filter(task => {
    const due = new Date(task.due_date);
    return (task.status !== 'completed' && due < today) || (task.status as string) === 'blocked';
  }).length;
  // Incomplete Tasks: total of all tasks whose status != completed
  const incompleteTasks = filteredTasks.filter(task => task.status !== 'completed').length;

  const stats = [
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Not Started',
      value: notStartedTasks,
      icon: Play,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Pending',
      value: pendingTasks,
      icon: Pause,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      label: 'In Progress',
      value: inProgressTasks,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Blocked Tasks',
      value: blockedTasks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'Incomplete Tasks',
      value: incompleteTasks,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="text-center" hover>
            <div className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <Icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;