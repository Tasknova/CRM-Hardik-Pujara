import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Task, Member, Admin, TaskAttachment } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { authService } from '../../services/auth';
import { useProjects } from '../../hooks/useProjects';
import { Paperclip, X, Link, File, Upload } from 'lucide-react';
import { fileUploadService } from '../../services/fileUpload';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  initialProjectId?: string;
  availableProjects?: { id: string; name: string }[];
  isMyTasksPage?: boolean; // New prop to distinguish My Tasks vs All Tasks
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSubmit, initialProjectId, availableProjects, isMyTasksPage = false }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    due_date: '',
    user_id: user?.id || '',
    assigned_user_ids: (isMyTasksPage && user?.id) ? [user.id] : [] as string[],
    project_id: initialProjectId || '',
    priority: (user?.role === 'member') ? 'medium' as Task['priority'] : '' as Task['priority'],
    status: '' as Task['status'],
    progress: 0,
  });
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const { projects, loading: projectsLoading } = useProjects();
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'project_manager') {
      setMembersLoading(true);
      setMembersError('');
      
      // Fetch members, admins, and project managers
      Promise.all([
        authService.getMembers(),
        authService.getAdmins(),
        authService.getProjectManagers()
      ])
        .then(([membersData, adminsData, projectManagersData]) => {
          setMembers(membersData);
          setAdmins(adminsData);
          setProjectManagers(projectManagersData);
          // If modal is open and user_id is empty, set to first member's ID
          if (isOpen && membersData.length > 0 && !formData.user_id) {
            setFormData(prev => ({ ...prev, user_id: membersData[0].id }));
          }
          console.log('Fetched members:', membersData);
          console.log('Fetched admins:', adminsData);
        })
        .catch(err => {
          setMembersError('Failed to load members');
          setMembers([]);
          setAdmins([]);
        })
        .finally(() => setMembersLoading(false));
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && user?.role === 'member') {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && initialProjectId) {
      setFormData(prev => ({ ...prev, project_id: initialProjectId }));
    }
  }, [isOpen, initialProjectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        task_name: '',
        description: '',
        due_date: '',
        user_id: user?.id || '',
        assigned_user_ids: (isMyTasksPage && user?.id) ? [user.id] : [],
        project_id: initialProjectId || '',
        priority: (user?.role === 'member') ? 'medium' as Task['priority'] : '' as Task['priority'],
        status: '' as Task['status'],
        progress: 0
      });
      setAttachments([]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [isOpen, user?.id, initialProjectId, isMyTasksPage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseTask = {
      ...formData,
      created_by: user?.id || '',
      attachments,
      assigned_user_ids: formData.assigned_user_ids, // Include the assigned user IDs
    };
    onSubmit(baseTask);
    // Reset form after submission
    setFormData({ 
      task_name: '', 
      description: '', 
      due_date: '', 
      user_id: user?.id || '', 
      assigned_user_ids: (isMyTasksPage && user?.id) ? [user.id] : [],
      project_id: initialProjectId || '', 
      priority: (user?.role === 'member') ? 'medium' as Task['priority'] : '' as Task['priority'], 
      status: '' as Task['status'], 
      progress: 0 
    });
    setAttachments([]);
    setUrlInput('');
    setShowUrlInput(false);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && user) {
      await uploadFiles(Array.from(files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!user) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      let tempAttachment: TaskAttachment | null = null;
      try {
        // Validate file
        const validation = fileUploadService.validateFile(file);
        if (!validation.isValid) {
          alert(validation.error);
          continue;
        }

        // Show loading state
        tempAttachment = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: URL.createObjectURL(file), // Temporary URL for preview
          type: 'file',
          file_type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString()
        };
        setAttachments(prev => [...prev, tempAttachment!]);

        // Upload to Supabase Storage
        const uploadedAttachment = await fileUploadService.uploadFile(file, user.id);
        
        // Replace temporary attachment with real one
        setAttachments(prev => prev.map(att => 
          att.id === tempAttachment!.id ? uploadedAttachment : att
        ));
      } catch (error) {
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Remove temporary attachment if upload failed
        if (tempAttachment) {
          setAttachments(prev => prev.filter(att => att.id !== tempAttachment!.id));
        }
      }
    }
    
    setIsUploading(false);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleUrlAdd = () => {
    if (urlInput.trim()) {
      const attachment = fileUploadService.createUrlAttachment(urlInput.trim());
      setAttachments(prev => [...prev, attachment]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeAttachment = async (id: string) => {
    const attachment = attachments.find(att => att.id === id);
    if (attachment && attachment.type === 'file') {
      try {
        // Delete from Supabase Storage
        await fileUploadService.deleteFile(attachment.url);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Continue with removal even if storage deletion fails
      }
    }
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name
          </label>
                     <input
             type="text"
             name="task_name"
             value={formData.task_name}
             onChange={handleChange}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             required
             placeholder="Enter task name..."
           />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
                     <textarea
             name="description"
             value={formData.description}
             onChange={handleChange}
             rows={3}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             required
             placeholder="Enter task description..."
           />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
                     <input
             type="date"
             name="due_date"
             value={formData.due_date}
             onChange={handleChange}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             required
             min={todayStr}
             placeholder="Select due date..."
           />
        </div>

        {(user?.role === 'admin' || user?.role === 'project_manager') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
                       <select
               name="priority"
               value={formData.priority}
               onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
               required
             >
               <option value="">Select Priority</option>
               <option value="low">Low</option>
               <option value="medium">Medium</option>
               <option value="high">High</option>
               <option value="urgent">Urgent</option>
             </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
                     <select
             name="status"
             value={formData.status}
             onChange={handleChange}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             required
           >
             <option value="">Select Status</option>
             <option value="pending">Pending</option>
             <option value="in_progress">In Progress</option>
             <option value="completed">Completed</option>
           </select>
        </div>

        {(user?.role === 'admin' || user?.role === 'project_manager') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            {membersLoading ? (
              <div className="text-sm text-gray-500">Loading members and admins...</div>
            ) : membersError ? (
              <div className="text-sm text-red-500">{membersError}</div>
            ) : (members.length === 0 && admins.length === 0 && projectManagers.length === 0) ? (
              <div className="text-sm text-gray-500">No members, admins, or project managers found. Please add users first.</div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                {members.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Members</h4>
                    <div className="space-y-2">
                    {members.map(member => {
                      const isCurrentUser = member.id === user?.id;
                      const shouldDisableCurrentUser = isCurrentUser && isMyTasksPage;
                      return (
                        <label key={member.id} className={`flex items-center space-x-3 p-2 rounded ${shouldDisableCurrentUser ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={formData.assigned_user_ids.includes(member.id)}
                            disabled={shouldDisableCurrentUser}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, member.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== member.id)
                                }));
                              }
                            }}
                            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${shouldDisableCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${shouldDisableCurrentUser ? 'text-gray-500' : 'text-gray-900'}`}>
                              {member.name}
                              {shouldDisableCurrentUser && ' (You)'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({member.email})</span>
                          </div>
                        </label>
                      );
                    })}
                    </div>
                  </div>
                )}
                
                {admins.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Admins</h4>
                    <div className="space-y-2">
                    {admins.map(admin => {
                      const isCurrentUser = admin.id === user?.id;
                      const shouldDisableCurrentUser = isCurrentUser && isMyTasksPage;
                      return (
                        <label key={admin.id} className={`flex items-center space-x-3 p-2 rounded ${shouldDisableCurrentUser ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={formData.assigned_user_ids.includes(admin.id)}
                            disabled={shouldDisableCurrentUser}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, admin.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== admin.id)
                                }));
                              }
                            }}
                            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${shouldDisableCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${shouldDisableCurrentUser ? 'text-gray-500' : 'text-gray-900'}`}>
                              {admin.name}
                              {shouldDisableCurrentUser && ' (You)'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({admin.email}) - Admin</span>
                          </div>
                        </label>
                      );
                    })}
                    </div>
                  </div>
                )}
                
                {projectManagers.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Project Managers</h4>
                    <div className="space-y-2">
                    {projectManagers.map(pm => {
                      const isCurrentUser = pm.id === user?.id;
                      const shouldDisableCurrentUser = isCurrentUser && isMyTasksPage;
                      return (
                        <label key={pm.id} className={`flex items-center space-x-3 p-2 rounded ${shouldDisableCurrentUser ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={formData.assigned_user_ids.includes(pm.id)}
                            disabled={shouldDisableCurrentUser}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: [...prev.assigned_user_ids, pm.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_user_ids: prev.assigned_user_ids.filter(id => id !== pm.id)
                                }));
                              }
                            }}
                            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${shouldDisableCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${shouldDisableCurrentUser ? 'text-gray-500' : 'text-gray-900'}`}>
                              {pm.name}
                              {shouldDisableCurrentUser && ' (You)'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({pm.email}) - Project Manager</span>
                          </div>
                        </label>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {formData.assigned_user_ids.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {formData.assigned_user_ids.length} user(s)
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          {projectsLoading ? (
            <div className="text-sm text-gray-500">Loading projects...</div>
          ) : (
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!initialProjectId}
            >
              <option value="">Select Project</option>
              {(availableProjects || projects).map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )}
        </div>


        {/* Attachments Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
              {isDragOver ? 'Drop files here' : 'Drag and drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports images, PDFs, documents, and spreadsheets (max 50MB)
            </p>
            {isUploading && (
              <div className="mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-1">Uploading...</p>
              </div>
            )}
          </div>
          
          {/* Attachment Controls */}
          <div className="flex space-x-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1"
              disabled={isUploading}
            >
              <Paperclip className="w-4 h-4" />
              <span>Browse Files</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex items-center space-x-1"
              disabled={isUploading}
            >
              <Link className="w-4 h-4" />
              <span>Add URL</span>
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          />

          {/* URL Input */}
          {showUrlInput && (
            <div className="flex space-x-2 mb-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL (e.g., https://example.com/document.pdf)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleUrlAdd}
                disabled={!urlInput.trim()}
              >
                Add
              </Button>
            </div>
          )}

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Attached Files:</p>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {attachment.type === 'file' ? (
                      <File className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Link className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm text-gray-700 truncate">
                      {attachment.name}
                    </span>
                    {attachment.size && (
                      <span className="text-xs text-gray-500">
                        ({(attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskForm;