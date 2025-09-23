import React, { useState } from 'react';
import { Task } from '../../types';
import { useDeleteConfirmation } from '../../hooks/useDeleteConfirmation';
import { Calendar, User, CheckCircle2, AlertCircle, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';

interface TaskListViewProps {
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

const TaskListView: React.FC<TaskListViewProps> = ({
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { 
    isOpen: isDeleteModalOpen, 
    task: taskToDelete, 
    taskType, 
    showDeleteConfirmation, 
    hideDeleteConfirmation, 
    confirmDelete 
  } = useDeleteConfirmation();

  const getStatusVariant = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'pending';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <>
      {/* Scroll indicator */}
      <div className="mb-2 text-center">
        <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
          <span>📋</span>
          <span className="ml-1">Scroll to see all tasks</span>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                {showUser && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => handleTaskClick(task)}>
                  <td className="px-4 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.task_name}
                        </p>
                        {task.description && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {showUser && (
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {getUserName(task.user_id)}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900">
                      {task.project_id ? getProjectName(task.project_id) : 'No Project'}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <Badge variant={getStatusVariant(task.status)}>
                      {task.status}
                    </Badge>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {formatDate(task.due_date)}
                      </span>
                      {isOverdue(task.due_date, task.status) && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      {!isOverdue(task.due_date, task.status) && (
                        <span className="text-sm text-gray-600 w-8">
                          {task.progress}%
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(task)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(task)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => showDeleteConfirmation(task, 'regular', () => onDelete(task.id))}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">No tasks match your current filters.</p>
          </div>
        )}
      </Card>

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
                <Badge variant={getStatusVariant(selectedTask.status)}>
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
                <p className="text-gray-900">{formatDate(selectedTask.due_date)}</p>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={hideDeleteConfirmation}
        onConfirm={confirmDelete}
        taskName={taskToDelete?.task_name || ''}
        taskDescription={taskToDelete?.description}
        assignedTo={taskToDelete?.user?.name}
        projectName={taskToDelete?.project?.name}
        priority={taskToDelete?.priority}
        dueDate={taskToDelete?.due_date}
        taskType={taskType}
      />
    </>
  );
};

export default TaskListView;
