import React, { useState, useEffect } from 'react';
import { DailyTask, DailyTaskFilters } from '../../types';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { DailyTaskCard } from './DailyTaskCard';
import { DailyTaskForm } from './DailyTaskForm';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';

export const MemberDailyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DailyTaskFilters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    tasks,
    loading,
    error,
    realtimeConnected,
    createTask,
    updateTask,
    deleteTask,
    markCompleted,
    markSkipped,
    markPending
  } = useDailyTasks({ 
    ...filters, 
    date: selectedDate,
    member: user?.id 
  });

  const handleStatusChange = async (id: string, status: 'pending' | 'completed' | 'skipped') => {
    try {
      switch (status) {
        case 'completed':
          await markCompleted(id);
          break;
        case 'skipped':
          await markSkipped(id);
          break;
        case 'pending':
          await markPending(id);
          break;
      }
    } catch (error) {
      console.error('Error changing task status:', error);
    }
  };

  const handleCreateTask = async (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => {
    if (!user) return;
    
    try {
      const result = await createTask({
        ...taskData,
        user_id: user.id,
        created_by: user.id
      });
      if (result) {
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => {
    if (!editingTask) return;
    
    try {
      const result = await updateTask(editingTask.id, taskData);
      if (result) {
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleEditTask = (task: DailyTask) => {
    setEditingTask(task);
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, completed: 0, skipped: 0 };
    tasks.forEach(task => {
      counts[task.status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-red-500">Please log in to view your daily tasks.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
             <div className="flex justify-between items-center mb-6">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">My Daily Tasks</h1>
           <p className="text-gray-600">Manage your daily tasks and track your progress</p>
           <div className="flex items-center mt-1">
             <div className={`w-2 h-2 rounded-full mr-2 ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
             <span className={`text-xs ${realtimeConnected ? 'text-green-600' : 'text-gray-500'}`}>
               {realtimeConnected ? 'Real-time updates enabled' : 'Connecting...'}
             </span>
           </div>
         </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Add Daily Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.skipped}</div>
            <div className="text-sm text-gray-600">Skipped</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading your daily tasks...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500">Error: {error}</div>
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <p className="text-lg mb-2">No daily tasks found for {selectedDate}</p>
            <p>Create your first daily task to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <DailyTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              isAdmin={false}
            />
          ))}
        </div>
      )}

      {/* Forms */}
      <DailyTaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateTask}
        members={[]}
        currentUserId={user.id}
        isAdmin={false}
      />

      <DailyTaskForm
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdateTask}
        task={editingTask}
        members={[]}
        currentUserId={user.id}
        isAdmin={false}
      />
    </div>
  );
};
