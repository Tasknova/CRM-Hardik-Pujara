import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, User, Tag, Eye, AlertTriangle, ArrowLeft } from 'lucide-react';
import { DeletedTask } from '../../types';
import { deletedTasksService } from '../../services/deletedTasks';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface DeletedTasksPageProps {
  onBack?: () => void;
}

const DeletedTasksPage: React.FC<DeletedTasksPageProps> = ({ onBack }) => {
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DeletedTask | null>(null);
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});
  const [stats, setStats] = useState({
    totalDeleted: 0,
    deletedToday: 0,
    deletedThisWeek: 0,
    deletedThisMonth: 0,
    byType: { regular: 0, daily: 0 }
  });

  useEffect(() => {
    fetchDeletedTasks();
    fetchStats();
  }, []);

  const fetchUserNames = async (userIds: string[]) => {
    if (userIds.length === 0) return {};
    
    try {
      const [membersData, adminsData, projectManagersData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name')
          .in('id', userIds)
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name')
          .in('id', userIds)
          .eq('is_active', true),
        supabase
          .from('project_managers')
          .select('id, name')
          .in('id', userIds)
          .eq('is_active', true)
      ]);

      const nameMap: {[key: string]: string} = {};
      
      if (membersData.data) {
        membersData.data.forEach(member => {
          nameMap[member.id] = member.name;
        });
      }
      
      if (adminsData.data) {
        adminsData.data.forEach(admin => {
          nameMap[admin.id] = admin.name;
        });
      }
      
      if (projectManagersData.data) {
        projectManagersData.data.forEach(pm => {
          nameMap[pm.id] = pm.name;
        });
      }

      return nameMap;
    } catch (error) {
      console.error('Error fetching user names:', error);
      return {};
    }
  };

  const fetchDeletedTasks = async () => {
    try {
      setLoading(true);
      const tasks = await deletedTasksService.getDeletedTasks({ limit: 100 });
      setDeletedTasks(tasks);
      
      // Fetch user names for all unique user IDs
      const userIds = [...new Set([
        ...tasks.map(task => task.user_id),
        ...tasks.map(task => task.created_by),
        ...tasks.map(task => task.deleted_by)
      ])];
      
      const names = await fetchUserNames(userIds);
      setUserNames(names);
    } catch (err) {
      setError('Failed to fetch deleted tasks');
      console.error('Error fetching deleted tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statistics = await deletedTasksService.getDeletedTaskStats();
      setStats(statistics);
    } catch (err) {
      console.error('Error fetching deleted task stats:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskTypeColor = (taskType: string) => {
    return taskType === 'daily' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deleted tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Deleted Tasks</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchDeletedTasks}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trash2 className="w-6 h-6 mr-3 text-red-600" />
              Deleted Tasks
            </h1>
            <p className="text-gray-600 mt-1">View and audit deleted tasks</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Deleted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDeleted}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Deleted Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedToday}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedThisWeek}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedThisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Task Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Task Type Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Regular Tasks</span>
              <Badge variant="secondary" className={getTaskTypeColor('regular')}>
                {stats.byType.regular}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Daily Tasks</span>
              <Badge variant="secondary" className={getTaskTypeColor('daily')}>
                {stats.byType.daily}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Deleted Tasks List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Deleted Tasks</h2>
            <div className="text-sm text-gray-500">
              Total: {deletedTasks.length} deleted tasks
            </div>
          </div>
          
          {deletedTasks.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Deleted Tasks</h3>
              <p className="text-gray-500">No tasks have been deleted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deletion Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {task.task_name}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                              {task.description}
                            </div>
                          )}
                          {task.due_date && (
                            <div className="text-xs text-gray-400 mt-1">
                              {task.task_type === 'daily' ? 'Task Date' : 'Due Date'}: {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <Badge variant="secondary" className={getTaskTypeColor(task.task_type)}>
                            {task.task_type === 'daily' ? 'Daily Task' : 'Regular Task'}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                          )}
                          {task.status && (
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Assigned To:</div>
                          <div className="text-gray-500">{userNames[task.user_id] || task.user_id}</div>
                        </div>
                        <div className="text-sm text-gray-900 mt-1">
                          <div className="font-medium">Created By:</div>
                          <div className="text-gray-500">{userNames[task.created_by] || task.created_by}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Deleted By:</div>
                          <div className="text-gray-500">{userNames[task.deleted_by] || task.deleted_by}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(task.deleted_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Deleted Task Details"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Task Name</label>
              <p className="text-sm text-gray-900 font-medium">{selectedTask.task_name}</p>
            </div>

            {selectedTask.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm text-gray-900">{selectedTask.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Task Type</label>
                <p className="text-sm text-gray-900 capitalize">
                  {selectedTask.task_type === 'daily' ? 'Daily Task' : 'Regular Task'}
                </p>
              </div>
              
              {selectedTask.priority && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedTask.priority}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Assigned To</label>
                <p className="text-sm text-gray-900">{userNames[selectedTask.user_id] || selectedTask.user_id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <p className="text-sm text-gray-900">{userNames[selectedTask.created_by] || selectedTask.created_by}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Deleted By</label>
                <p className="text-sm text-gray-900">{userNames[selectedTask.deleted_by] || selectedTask.deleted_by}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Deleted At</label>
                <p className="text-sm text-gray-900">{formatDate(selectedTask.deleted_at)}</p>
              </div>
            </div>

            {selectedTask.due_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {selectedTask.task_type === 'daily' ? 'Task Date' : 'Due Date'}
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedTask.due_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {selectedTask.tags && selectedTask.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTask.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DeletedTasksPage;
