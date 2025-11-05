import React, { useState, useEffect } from 'react';
import { CheckSquare, Calendar, AlertCircle, CheckCircle, Clock, XCircle, Search, Edit, Save, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Task } from '../../types';

interface BrokerTasksPageProps {
  brokerId: string;
}

const BrokerTasksPage: React.FC<BrokerTasksPageProps> = ({ brokerId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ progress: number; notes: string }>({ progress: 0, notes: '' });

  useEffect(() => {
    fetchTasks();
  }, [brokerId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('broker_id', brokerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
      case 'not_started':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      case 'not_started':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task marked as completed!');
      await fetchTasks(); // Ensure we wait for the fetch to complete
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setEditForm({
      progress: task.progress || 0,
      notes: task.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditForm({ progress: 0, notes: '' });
  };

  const handleSaveTask = async (taskId: string) => {
    try {
      if (editForm.progress < 0 || editForm.progress > 100) {
        toast.error('Progress must be between 0 and 100');
        return;
      }

      const updateData: any = {
        progress: editForm.progress,
        description: editForm.notes,
        updated_at: new Date().toISOString()
      };

      // Update status based on progress
      if (editForm.progress === 100) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      } else if (editForm.progress > 0 && editForm.progress < 100) {
        updateData.status = 'in_progress';
      } else if (editForm.progress === 0) {
        updateData.status = 'not_started';
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task updated successfully!');
      setEditingTask(null);
      await fetchTasks(); // Ensure we wait for the fetch to complete
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">Tasks assigned to you</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterStatus !== 'all' ? 'No tasks found' : 'No tasks yet'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your filters' 
              : 'You don\'t have any tasks assigned to you yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(task.status)}
                    <h3 className="text-lg font-semibold text-gray-900">{task.task_name}</h3>
                  </div>
                  {!editingTask || editingTask !== task.id ? (
                    <>
                      {task.description && (
                        <p className="text-gray-600 mb-3 whitespace-pre-wrap">{task.description}</p>
                      )}
                    </>
                  ) : (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        placeholder="Add notes about this task..."
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority} priority
                    </span>
                    {task.project && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {task.project.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {task.status !== 'completed' && (
                    <>
                      {editingTask === task.id ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveTask(task.id)}
                            className="flex items-center space-x-1"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="flex items-center space-x-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCompleteTask(task.id)}
                            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Complete</span>
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="space-y-2">
                  {editingTask === task.id ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Progress: {editForm.progress}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editForm.progress}
                        onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">Progress: {task.progress || 0}%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrokerTasksPage;

