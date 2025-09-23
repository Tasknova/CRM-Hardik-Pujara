import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, CheckCircle2, AlertCircle, Eye, Edit, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

interface TaskCalendarViewProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onView?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  showUser?: boolean;
  members?: { id: string; name: string }[];
  admins?: { id: string; name: string }[];
  projectManagers?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  onDelete,
  onStatusChange,
  onUpdate,
  onView,
  onEdit,
  showUser = false,
  members = [],
  admins = [],
  projectManagers = [],
  projects = []
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});

  const getUserName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    const admin = admins.find(a => a.id === userId);
    const pm = projectManagers.find(p => p.id === userId);
    return member?.name || admin?.name || pm?.name || 'Unknown User';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const isOverdue = (dueDate: string, status: Task['status']) => {
    if (status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= lastDay || currentDay.getDay() !== 0) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      const taskDate = new Date(task.due_date);
      const dateKey = taskDate.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    return grouped;
  }, [tasks]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-3 text-center">
              <span className="text-sm font-medium text-gray-700">{day}</span>
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayTasks = tasksByDate[dateKey] || [];
            const isExpanded = expandedDays[dateKey];
            const maxVisibleTasks = isExpanded ? dayTasks.length : 3;
            const visibleTasks = dayTasks.slice(0, maxVisibleTasks);
            const hasMoreTasks = dayTasks.length > 3;
            
            return (
              <div
                key={index}
                className={`min-h-[120px] bg-white p-2 ${
                  !isCurrentMonth(date) ? 'bg-gray-50' : ''
                } ${isToday(date) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    !isCurrentMonth(date) ? 'text-gray-400' : 
                    isToday(date) ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                
                {/* Tasks for this day */}
                <div className="space-y-1">
                  {visibleTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-2 rounded border-l-4 text-xs cursor-pointer transition-all duration-200 hover:shadow-sm ${getPriorityColor(task.priority)}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {task.task_name}
                        </span>
                        {isOverdue(task.due_date, task.status) && (
                          <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">
                          {task.project_id ? getProjectName(task.project_id) : 'No Project'}
                        </span>
                      </div>
                      
                      {showUser && (
                        <div className="flex items-center space-x-1 text-gray-600 mt-1">
                          <User className="w-3 h-3" />
                          <span className="truncate text-xs">
                            {getUserName(task.user_id)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-1">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMoreTasks && !isExpanded && (
                    <button
                      onClick={() => toggleDayExpansion(dateKey)}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 py-1 px-2 rounded transition-colors duration-200 border border-blue-200"
                    >
                      📋 +{dayTasks.length - 3} more tasks
                    </button>
                  )}
                  
                  {/* Show Less Button */}
                  {hasMoreTasks && isExpanded && (
                    <button
                      onClick={() => toggleDayExpansion(dateKey)}
                      className="w-full text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 py-1 px-2 rounded transition-colors duration-200 border border-gray-200"
                    >
                      🔽 Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500">No tasks match your current filters.</p>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task Details">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedTask.task_name}</h3>
              {selectedTask.description && (
                <p className="text-gray-600 mt-2">{selectedTask.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Status</p>
                <Badge variant="secondary" className={getStatusColor(selectedTask.status)}>
                  {selectedTask.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium text-gray-700">Priority</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-700">Due Date</p>
                <p className="text-gray-900">{formatDate(new Date(selectedTask.due_date))}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Progress</p>
                <p className="text-gray-900">{selectedTask.progress}%</p>
              </div>
              {showUser && (
                <div>
                  <p className="font-medium text-gray-700">Assigned To</p>
                  <p className="text-gray-900">{getUserName(selectedTask.user_id)}</p>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-700">Project</p>
                <p className="text-gray-900">
                  {selectedTask.project_id ? getProjectName(selectedTask.project_id) : 'No Project'}
                </p>
              </div>
            </div>

            {isOverdue(selectedTask.due_date, selectedTask.status) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 font-medium">This task is overdue</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
              {onView && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onView(selectedTask);
                    setSelectedTask(null);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Full Details</span>
                </Button>
              )}
              {onEdit && (
                <Button
                  onClick={() => {
                    onEdit(selectedTask);
                    setSelectedTask(null);
                  }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Task</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TaskCalendarView;
