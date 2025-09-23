import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Task, Leave } from '../../types';
import Card from '../ui/Card';

interface DashboardStatsProps {
  tasks: Task[];
  leaves: Leave[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ tasks, leaves }) => {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const notStartedTasks = tasks.filter(task => task.status === 'not_started').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  // Blocked: not completed and due before today, or status 'blocked'
  const blockedTasks = tasks.filter(task => {
    const due = new Date(task.due_date);
    return (task.status !== 'completed' && due < today) || task.status === 'blocked';
  }).length;
  const totalLeaves = leaves.length;

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
      icon: Clock,
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
      label: 'Total Leaves',
      value: totalLeaves,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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