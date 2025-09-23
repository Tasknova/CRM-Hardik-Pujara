import React from 'react';
import { AlertTriangle, Trash2, User, Calendar, Tag } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName: string;
  taskDescription?: string;
  assignedTo?: string;
  projectName?: string;
  priority?: string;
  dueDate?: string;
  taskType?: 'regular' | 'daily';
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskName,
  taskDescription,
  assignedTo,
  projectName,
  priority,
  dueDate,
  taskType = 'regular',
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Task Deletion">
      <div className="space-y-6">
        {/* Warning Header */}
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Are you sure you want to delete this task?
            </h3>
            <p className="text-sm text-red-700 mt-1">
              This action cannot be undone. The task will be permanently removed from the system.
            </p>
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Trash2 className="w-4 h-4 mr-2" />
            Task Details
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Task Name</label>
              <p className="text-sm text-gray-900 font-medium">{taskName}</p>
            </div>

            {taskDescription && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm text-gray-900">{taskDescription}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedTo && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    Assigned To
                  </label>
                  <p className="text-sm text-gray-900">{assignedTo}</p>
                </div>
              )}

              {projectName && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Project</label>
                  <p className="text-sm text-gray-900">{projectName}</p>
                </div>
              )}

              {priority && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Tag className="w-3 h-3 mr-1" />
                    Priority
                  </label>
                  <p className="text-sm text-gray-900 capitalize">{priority}</p>
                </div>
              )}

              {dueDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {taskType === 'daily' ? 'Task Date' : 'Due Date'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Task Type</label>
              <p className="text-sm text-gray-900 capitalize">
                {taskType === 'daily' ? 'Daily Task' : 'Regular Task'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Task</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
