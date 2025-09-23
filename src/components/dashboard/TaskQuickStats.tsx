import React from 'react';
import { Task } from '../../types';
import Card from '../ui/Card';
import { CheckCircle2, Clock, AlertCircle, BarChart3 } from 'lucide-react';

interface TaskQuickStatsProps {
  tasks: Task[];
}

export const TaskQuickStats: React.FC<TaskQuickStatsProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const notStartedTasks = tasks.filter(task => task.status === 'not_started').length;

  const stats = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: BarChart3,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'In Progress',
      value: inProgressTasks,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: 'Not Started',
      value: notStartedTasks,
      icon: Clock,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      label: 'Pending',
      value: pendingTasks,
      icon: Clock,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Task Overview</h3>
        </div>
        <div className="text-xs text-gray-500">
          Real-time stats
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-xs font-medium ${stat.textColor}`}>
                  {totalTasks > 0 ? Math.round((stat.value / totalTasks) * 100) : 0}%
                </span>
              </div>
              <div className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar showing completion rate */}
      {totalTasks > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-semibold text-blue-600">
              {Math.round((completedTasks / totalTasks) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </Card>
  );
};
