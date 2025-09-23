import React, { useState } from 'react';
import { DailyTask } from '../../types';
import { useDeleteConfirmation } from '../../hooks/useDeleteConfirmation';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { Eye, Calendar, User, AlertCircle, CheckCircle2, File, Link, Trash2 } from 'lucide-react';

interface DailyTaskCardProps {
  task: DailyTask;
  onStatusChange: (id: string, status: 'pending' | 'completed' | 'skipped') => void;
  onEdit?: (task: DailyTask) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'skipped':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-blue-500 text-white';
    case 'low':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const DailyTaskCard: React.FC<DailyTaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { 
    isOpen: isDeleteModalOpen, 
    task: taskToDelete, 
    taskType, 
    showDeleteConfirmation, 
    hideDeleteConfirmation, 
    confirmDelete 
  } = useDeleteConfirmation();

  const handleStatusChange = (newStatus: 'pending' | 'completed' | 'skipped') => {
    onStatusChange(task.id, newStatus);
  };

  const getPriorityVariant = (priority: DailyTask['priority']) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: DailyTask['priority']) => {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'high': return AlertCircle;
      case 'medium': return Calendar;
      case 'low': return CheckCircle2;
      default: return Calendar;
    }
  };

  const getStatusVariant = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'skipped': return 'danger';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'skipped': return AlertCircle;
      case 'pending': return Calendar;
      default: return Calendar;
    }
  };

  const StatusIcon = getStatusIcon(task.status);
  const PriorityIcon = getPriorityIcon(task.priority);

  const getStatusBgColor = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'skipped':
        return 'bg-red-50 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <>
      <Card className={`transition-all duration-200 hover:shadow-md ${
        task.status === 'completed' ? 'opacity-75' : ''
      } ${getStatusBgColor(task.status)}`}>
        <div className="p-4">
        {/* Action buttons and badges on top */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {/* View button */}
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => setIsViewOpen(true)}
              className="text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-gray-200 rounded-full"
              title="View task details"
            />
          </div>
        </div>

        {/* Task title and description */}
        <div className="mb-3">
          <h3 className={`font-semibold text-lg mb-1 ${
            task.status === 'completed' ? 'line-through text-gray-600' : 'text-gray-900'
          }`}>
            {task.task_name}
          </h3>
          {task.description && (
            <p className={`text-sm mb-2 ${
              task.status === 'completed' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div>
            <span className="font-medium">Assigned to:</span> {task.user?.name || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Date:</span> {new Date(task.task_date).toLocaleDateString()}
          </div>
        </div>

        {task.project && (
          <div className="text-sm text-gray-500 mb-3">
            <span className="font-medium">Project:</span> {task.project.name}
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="mb-3">
            <div className="text-sm text-gray-700 mb-1">
              <span className="font-semibold">Attachments:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {task.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => window.open(attachment.url, '_blank')}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-xs"
                >
                  {attachment.type === 'file' ? (
                    <File className="w-3 h-3" />
                  ) : (
                    <Link className="w-3 h-3" />
                  )}
                  <span className="truncate max-w-20">{attachment.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {task.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('skipped')}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Skip
                </Button>
              </>
            )}
            {task.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              >
                Mark Pending
              </Button>
            )}
            {task.status === 'skipped' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              >
                Mark Pending
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(task)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => showDeleteConfirmation(task, 'daily', () => onDelete && onDelete(task.id))}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {task.completed_at && (
          <div className="mt-2 text-xs text-gray-500">
            Completed at: {new Date(task.completed_at).toLocaleString()}
          </div>
        )}
        </div>
      </Card>

      {/* View Modal */}
      {isViewOpen && (
        <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Daily Task Details" size="lg">
          <div className="space-y-6">
            {/* Task Header */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{task.task_name}</h2>
              {task.description && (
                <p className="text-gray-600">{task.description}</p>
              )}
            </div>

            {/* Task Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Task Date</p>
                    <p className="text-sm text-gray-900">{new Date(task.task_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Assigned To</p>
                    <p className="text-sm text-gray-900">{task.user?.name || 'Unknown'}</p>
                  </div>
                </div>

                {task.created_by_user && (
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created By</p>
                      <p className="text-sm text-gray-900">{task.created_by_user.name}</p>
                    </div>
                  </div>
                )}

                {task.project && (
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-blue-100 rounded mr-3 flex items-center justify-center">
                      <span className="text-xs text-blue-600 font-bold">P</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Project</p>
                      <p className="text-sm text-gray-900">{task.project.name}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 flex items-center justify-center">
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <Badge variant={getStatusVariant(task.status)} className="mt-1">
                      {task.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 flex items-center justify-center">
                    <PriorityIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Priority</p>
                    <Badge variant={getPriorityVariant(task.priority)} className="mt-1">
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-5 h-5 bg-gray-100 rounded mr-3 flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-bold">A</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active</p>
                    <p className="text-sm text-gray-900">{task.is_active ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Attachments</p>
                <div className="space-y-2">
                  {task.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {attachment.type === 'file' ? (
                          <File className="w-5 h-5 text-gray-500" />
                        ) : (
                          <Link className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          {attachment.type === 'file' && attachment.file_type && (
                            <p className="text-xs text-gray-500">{attachment.file_type}</p>
                          )}
                          {attachment.type === 'file' && attachment.size && (
                            <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => window.open(attachment.url, '_blank')}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Created</p>
                  <p className="text-gray-900">{new Date(task.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900">{new Date(task.updated_at).toLocaleString()}</p>
                </div>
                {task.completed_at && (
                  <>
                    <div>
                      <p className="font-medium text-gray-700">Completed</p>
                      <p className="text-gray-900">{new Date(task.completed_at).toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              {isAdmin && onEdit && (
                <Button onClick={() => {
                  setIsViewOpen(false);
                  onEdit(task);
                }}>
                  Edit Task
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
        dueDate={taskToDelete?.task_date}
        taskType={taskType}
      />
    </>
  );
};
