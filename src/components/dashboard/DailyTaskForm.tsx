import React, { useState, useEffect, useRef } from 'react';
import { DailyTask, Member, Admin, TaskAttachment, Project } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { fileUploadService } from '../../services/fileUpload';
import { authService } from '../../services/auth';
import { projectService } from '../../services/projects';
import { Paperclip, X, Link, File, Upload } from 'lucide-react';

interface DailyTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => Promise<void>;
  task?: DailyTask | null;
  members: Member[];
  admins?: Admin[];
  projectManagers?: any[];
  currentUserId: string;
  isAdmin?: boolean;
}

export const DailyTaskForm: React.FC<DailyTaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  members,
  admins = [],
  projectManagers = [],
  currentUserId,
  isAdmin = false
}) => {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
    tags: [] as string[],
    task_date: new Date().toISOString().split('T')[0],
    project_id: '' as string
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        priority: task.priority,
        user_id: task.user_id,
        tags: task.tags || [],
        task_date: task.task_date,
        project_id: task.project_id || ''
      });
      setAttachments(task.attachments || []);
    } else {
      setFormData({
        task_name: '',
        description: '',
        priority: 'medium',
        user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
        tags: [],
        task_date: new Date().toISOString().split('T')[0],
        project_id: ''
      });
      setAttachments([]);
    }
  }, [task, currentUserId, isAdmin, members, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        task_name: '',
        description: '',
        priority: 'medium',
        user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
        tags: [],
        task_date: new Date().toISOString().split('T')[0],
        project_id: ''
      });
      setAttachments([]);
      setTagInput('');
      setUrlInput('');
      setShowUrlInput(false);
      setIsDragOver(false);
      setIsUploading(false);
    }
  }, [isOpen, currentUserId, isAdmin, members]);

  // Fetch projects when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setProjectsLoading(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Fetch admins when component mounts or when isAdmin changes


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) return;
    
    // Ensure we have a valid user_id
    if (!formData.user_id || formData.user_id === '') {
      console.error('No valid user selected');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        project_id: formData.project_id || null, // Convert empty string to null
        created_by: currentUserId,
        status: 'pending',
        attachments,
        is_active: true
      });
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await uploadFiles(Array.from(files));
    }
  };

  const uploadFiles = async (files: File[]) => {
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
        const uploadedAttachment = await fileUploadService.uploadFile(file, currentUserId);
        
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Daily Task' : 'Create Daily Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name *
          </label>
          <input
            type="text"
            value={formData.task_name}
            onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Member or Admin
            </label>
            {adminsLoading ? (
              <div className="text-sm text-gray-500">Loading members and admins...</div>
            ) : adminsError ? (
              <div className="text-sm text-red-500">{adminsError}</div>
            ) : (members.length === 0 && admins.length === 0) ? (
              <div className="text-sm text-gray-500">No members or admins found.</div>
            ) : (
              <select
                value={formData.user_id}
                onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Member or Admin</option>
                {members.length > 0 && (
                  <optgroup label="Members">
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {admins.length > 0 && (
                  <optgroup label="Admins">
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email}) - Admin
                      </option>
                    ))}
                  </optgroup>
                )}
                {projectManagers.length > 0 && (
                  <optgroup label="Project Managers">
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} ({pm.email}) - Project Manager
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project (Optional)
          </label>
          {projectsLoading ? (
            <div className="text-sm text-gray-500">Loading projects...</div>
          ) : (
            <select
              value={formData.project_id}
              onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a project (optional)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Date (Today Only)
          </label>
          <input
            type="date"
            value={formData.task_date}
            onChange={(e) => setFormData(prev => ({ ...prev, task_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={new Date().toISOString().split('T')[0]}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag and press Enter"
            />
            <Button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📎 Attachments <span className="text-xs text-gray-500">(Optional)</span>
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
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.task_name.trim() || (isAdmin && members.length === 0)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
