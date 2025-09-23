import React from 'react';
import { BarChart3, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { DailyTask } from '../../types';
import Card from '../ui/Card';

interface DailyTaskQuickStatsProps {
  dailyTasks: DailyTask[];
}

export const DailyTaskQuickStats: React.FC<DailyTaskQuickStatsProps> = ({ dailyTasks }) => {
  const totalTasks = dailyTasks.length;
  const completedTasks = dailyTasks.filter(task => task.status === 'completed').length;
  const pendingTasks = dailyTasks.filter(task => task.status !== 'completed').length;
  const skippedTasks = dailyTasks.filter(task => task.status === 'skipped').length;
  
  // Today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = dailyTasks.filter(task => task.task_date === today);
  const todayCompleted = todayTasks.filter(task => task.status === 'completed').length;
  const todayPending = todayTasks.filter(task => task.status !== 'completed').length;

  const stats = [
    {
      label: 'Total Daily Tasks',
      value: totalTasks,
      icon: BarChart3,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
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
      label: 'Skipped',
      value: skippedTasks,
      icon: XCircle,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      label: "Today's Tasks",
      value: todayTasks.length,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: "Today's Completed",
      value: todayCompleted,
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Tasks Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="text-center">
              <div className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
