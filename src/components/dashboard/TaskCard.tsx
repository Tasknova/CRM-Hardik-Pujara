import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { Task, Project } from '../../types';
import { 
  Calendar, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Eye,
  Play,
  Square,
  X
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  projects?: Project[];
  taskType?: 'regular' | 'daily';
  members?: { id: string; name: string }[];
  admins?: { id: string; name: string }[];
  projectManagers?: { id: string; name: string }[];
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDelete, 
  onStatusChange, 
  onUpdate,
  projects = [],
  taskType = 'regular',
  members = [],
  admins = [],
  projectManagers = []
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editData, setEditData] = useState({
    task_name: task.task_name,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    progress: task.progress || 0,
    project_id: task.project_id || '',
    assigned_user_ids: task.assigned_user_ids || []
  });
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCardBackgroundColor = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < today && status !== 'completed';
    
    if (isOverdue) return 'bg-red-100 border-red-300';
    
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'in_progress': 
      case 'pending': return 'bg-yellow-100 border-yellow-300';
      case 'not_started': return 'bg-orange-100 border-orange-300';
      case 'blocked': return 'bg-red-100 border-red-300';
      case 'cancelled': return 'bg-gray-100 border-gray-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getUrgencyIndicator = (dueDate: string, status: string) => {
    if (status === 'completed') return null;
    
    const today = new Date();
    const due = new Date(dueDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (due < today) {
      return { type: 'overdue', icon: '⚠️', color: 'text-red-600', bg: 'bg-red-100' };
    } else if (due.getTime() === today.getTime()) {
      return { type: 'due-today', icon: '⚡', color: 'text-orange-600', bg: 'bg-orange-100' };
    } else if (due.getTime() === tomorrow.getTime()) {
      return { type: 'due-tomorrow', icon: '⏰', color: 'text-blue-600', bg: 'bg-blue-100' };
    }
    
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-3 h-3" />;
      case 'medium': return <Clock className="w-3 h-3" />;
      case 'low': return <CheckCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: name === 'progress' ? parseInt(value) || 0 : value
    }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(task.id, editData);
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete.id);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const showDeleteConfirmation = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const hideDeleteConfirmation = () => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const confirmDelete = () => {
    handleDelete();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'not_started': return <Square className="w-4 h-4" />;
      case 'blocked': return <X className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusButtonText = (status: string) => {
    switch (status) {
      case 'pending': return 'Start Task';
      case 'in_progress': return 'Complete Task';
      case 'completed': return 'Reopen Task';
      case 'not_started': return 'Start Task';
      case 'blocked': return 'Unblock Task';
      case 'cancelled': return 'Restart Task';
      default: return 'Update Status';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'pending';
      case 'not_started': return 'in_progress';
      case 'blocked': return 'in_progress';
      case 'cancelled': return 'pending';
      default: return 'in_progress';
    }
  };

  const handleStatusChange = () => {
    const newStatus = getNextStatus(task.status);
    onStatusChange(task.id, newStatus);
  };

  const handleReopen = () => {
    if (newDueDate) {
      onUpdate(task.id, {
        status: 'pending',
        due_date: newDueDate,
        progress: 0
      });
      setIsReopenOpen(false);
      setNewDueDate('');
    }
  };

  // Get assigned users from assignments array only
  const getAssignedUsers = () => {
    if (task.assignments && task.assignments.length > 0) {
      return task.assignments.map(assignment => assignment.member_name || 'Unknown');
    }
    return [];
  };

  const assignedUsers = getAssignedUsers();
  const urgencyIndicator = getUrgencyIndicator(task.due_date, task.status);

  return (
    <>
      <Card className={`p-6 hover:shadow-lg transition-shadow duration-200 border-2 h-full w-full flex flex-col relative ${getCardBackgroundColor(task.status, task.due_date)}`}>
        {/* Urgency Indicator - Top Right */}
        {urgencyIndicator && (
          <div className={`absolute top-2 right-2 ${urgencyIndicator.bg} ${urgencyIndicator.color} px-2 py-1 rounded-full text-sm font-medium`}>
            <span>{urgencyIndicator.icon}</span>
          </div>
        )}

        {/* Top Icons - Centered */}
        <div className="flex justify-center items-center mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsViewOpen(true)}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors duration-200"
              title="View Task"
            >
              <Eye className="w-5 h-5" />
            </button>
            {task.status !== 'completed' && (
                <button
                onClick={() => setIsEditOpen(true)}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-colors duration-200"
                title="Edit Task"
              >
                <Edit className="w-5 h-5" />
                </button>
              )}
            {task.status === 'completed' && (
              <button
                onClick={() => setIsReopenOpen(true)}
                className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-full transition-colors duration-200"
                title="Reopen Task"
              >
                <Play className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => showDeleteConfirmation(task)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors duration-200"
              title="Delete Task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
        </div>
        </div>

        {/* Title - Bold */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 overflow-hidden">
            {task.task_name}
          </h3>
            </div>

        {/* Description - Small size */}
        {task.description && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 line-clamp-2 overflow-hidden">
              {task.description}
            </p>
          </div>
        )}

        {/* Main Content - Flex grow to fill space */}
        <div className="flex-grow flex flex-col justify-between">
          {/* Due Date and Assigned To */}
          <div className="space-y-3">
            {/* Due Date */}
            <div className="flex items-center justify-center">
              <Calendar className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">{formatDate(task.due_date)}</span>
            </div>

            {/* Assigned To - Only from assignments array */}
            <div className="flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500 mr-2" />
              <div className="flex flex-wrap gap-1 justify-center">
                {assignedUsers.length > 0 ? (
                  assignedUsers.map((userName, index) => (
                    <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {userName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    Unassigned
                  </span>
          )}
      </div>
            </div>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex justify-center items-center space-x-2 mt-2">
            <Badge className={`${getStatusColor(task.status)} px-2 py-1 text-xs font-medium`}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(task.status)}
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>
            </Badge>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              <div className="flex items-center space-x-1">
                {getPriorityIcon(task.priority)}
                <span className="capitalize">{task.priority}</span>
          </div>
            </span>
            </div>
 
          {/* Progress Bar - Only show for in_progress tasks */}
          {task.status === 'in_progress' && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Progress</span>
                <span className="text-xs text-gray-600">{task.progress}%</span>
            </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>
          )}
      </div>

        {/* Action Buttons - Always at bottom */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-center space-x-2">
            {task.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(task.id, 'completed')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Complete</span>
              </button>
            )}
            <button
              onClick={handleStatusChange}
              className={`${
                task.status === 'completed' 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center space-x-1`}
            >
              <span>{getStatusButtonText(task.status)}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task" size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
              <input
                type="text"
                name="task_name"
                value={editData.task_name}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={editData.description}
                onChange={handleEditChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={editData.status}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="not_started">Not Started</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={editData.priority}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={editData.due_date}
                   onChange={handleEditChange}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   required
                />
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                <input
                  type="number"
                  name="progress"
                  value={editData.progress}
                  onChange={handleEditChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  name="project_id"
                  value={editData.project_id}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

            {/* Assignment Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {/* Members */}
                {members && members.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Members</h4>
                    <div className="space-y-1">
                      {members.map(member => (
                        <label key={member.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editData.assigned_user_ids.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, member.id]
                                }));
                              } else {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== member.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{member.name}</span>
              </label>
                      ))}
                    </div>
              </div>
                )}

                {/* Admins */}
                {admins && admins.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Admins</h4>
                    <div className="space-y-1">
                      {admins.map(admin => (
                        <label key={admin.id} className="flex items-center space-x-2">
              <input
                            type="checkbox"
                            checked={editData.assigned_user_ids.includes(admin.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, admin.id]
                                }));
                              } else {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== admin.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{admin.name}</span>
                        </label>
                      ))}
                    </div>
                </div>
              )}

                {/* Project Managers */}
                {projectManagers && projectManagers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Project Managers</h4>
                    <div className="space-y-1">
                      {projectManagers.map(pm => (
                        <label key={pm.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editData.assigned_user_ids.includes(pm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, pm.id]
                                }));
                              } else {
                                setEditData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== pm.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{pm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              {editData.assigned_user_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {editData.assigned_user_ids.length} user(s) selected
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Task
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {isViewOpen && (
        <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Task Details" size="lg">
          <div className="space-y-6">
            {/* Task Header */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{task.task_name}</h2>
              <p className="text-gray-600">{task.description}</p>
            </div>

            {/* Task Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Due Date</p>
                    <p className="text-sm text-gray-900">{formatDate(task.due_date)}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Assigned To</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignedUsers.length > 0 ? (
                        assignedUsers.map((userName, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {userName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                                 {task.project_id && projects && projects.length > 0 && (
                   <div className="flex items-center">
                     <div className="w-5 h-5 bg-blue-100 rounded mr-3 flex items-center justify-center">
                       <span className="text-xs text-blue-600 font-bold">P</span>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-700">Project</p>
                      <p className="text-sm text-gray-900">
                        {projects.find(p => p.id === task.project_id)?.name || 'Unknown Project'}
                      </p>
                     </div>
                   </div>
                 )}
              </div>

              <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                  <Badge className={`${getStatusColor(task.status)} px-2 py-1 text-xs font-medium mt-1`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status.replace('_', ' ')}</span>
                    </div>
                    </Badge>
                </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Priority</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)} mt-1`}>
                    <div className="flex items-center space-x-1">
                      {getPriorityIcon(task.priority)}
                      <span className="capitalize">{task.priority}</span>
                  </div>
                  </span>
                </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Progress</p>
                  <div className="mt-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{task.progress}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Metadata */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Created</p>
                  <p className="text-gray-900">{formatDate(task.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900">{formatDate(task.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewOpen(false);
                  setIsEditOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                  Edit Task
                </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reopen Modal */}
      {isReopenOpen && (
        <Modal isOpen={isReopenOpen} onClose={() => setIsReopenOpen(false)} title="Reopen Task">
          <div className="space-y-4">
            <p className="text-gray-700">
              This task will be reopened and set to "Pending" status. Please set a new due date.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReopenOpen(false);
                  setNewDueDate('');
                }}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReopen}
                disabled={!newDueDate}
                className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
              >
                Reopen Task
              </Button>
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
        assignedTo={assignedUsers.length > 0 ? assignedUsers.join(', ') : 'Unassigned'}
        projectName={taskToDelete?.project_id ? projects.find(p => p.id === taskToDelete?.project_id)?.name : 'No Project'}
        priority={taskToDelete?.priority}
        dueDate={taskToDelete?.due_date}
        taskType={taskType}
      />
     </>
  );
};

export default TaskCard;