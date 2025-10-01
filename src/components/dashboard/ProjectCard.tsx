import React from 'react';
import { Project, Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Edit2, Trash2, Calendar, Building, Eye, CheckCircle2, Play, Clock, CheckSquare, FileText, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { projectService } from '../../services/projects';

interface ProjectCardProps {
  project: Project;
  isAdmin?: boolean;
  tasks?: Task[];
  onDelete?: (id: string) => void;
  onEdit?: (project: Project) => void;
  onProjectUpdate?: (project: Project) => void;
  onTabChange?: (tab: string) => void; // Add this for PM dashboard
  onProjectSelect?: (project: Project, type: 'regular' | 'rental' | 'builder') => void; // Add this for PM dashboard
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, isAdmin, tasks = [], onDelete, onEdit, onProjectUpdate, onTabChange, onProjectSelect }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin or project manager
  const canManageProjects = user?.role === 'admin' || user?.role === 'project_manager';

  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate project status - use database status if available, otherwise calculate from tasks
  const getProjectStatus = () => {
    if (project.status) return project.status;
    if (completedTasks === totalTasks && totalTasks > 0) return 'completed';
    if (inProgressTasks > 0) return 'in_progress';
    return 'pending';
  };

  const projectStatus = getProjectStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'on_hold': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <Trash2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleMarkAsComplete = async () => {
    try {
      const updatedProject = await projectService.markProjectAsComplete(project.id);
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
    } catch (error) {
      console.error('Failed to mark project as complete:', error);
    }
  };

  return (
    <Card className="relative bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      {/* Action buttons - always visible at top right */}
      {canManageProjects && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            title="Edit Project"
            className="p-1.5 rounded-md bg-white shadow-sm hover:bg-gray-50 transition-colors border border-gray-200 hover:border-gray-300"
            onClick={() => onEdit && onEdit(project)}
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            title="Delete Project"
            className="p-1.5 rounded-md bg-white shadow-sm hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-300"
            onClick={() => onDelete && onDelete(project.id)}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
          </button>
          {project.status !== 'completed' && (
            <button
              title="Mark as Complete"
              className="p-1.5 rounded-md bg-white shadow-sm hover:bg-green-50 transition-colors border border-gray-200 hover:border-green-300"
              onClick={handleMarkAsComplete}
            >
              <CheckSquare className="w-3.5 h-3.5 text-green-600" />
            </button>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 pr-12 line-clamp-2">
              {project.name}
            </h3>
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(projectStatus)} flex items-center gap-1 text-xs font-medium`}
            >
              {getStatusIcon(projectStatus)}
              {projectStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            {project.client_name && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span className="truncate">{project.client_name}</span>
              </div>
            )}
            {project.project_type && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  project.project_type === 'rental' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  project.project_type === 'builder' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {project.project_type === 'rental' ? 'Rental Deal' :
                 project.project_type === 'builder' ? 'Builder Deal' :
                 'Regular Project'}
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>
        )}

        {/* Dates - Simplified */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Start: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>End: {project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'Not set'}</span>
          </div>
        </div>

        {/* Progress - Simplified */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Progress</span>
            <span className="text-xs font-semibold text-gray-900">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Task Statistics - Simplified */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <span className="text-gray-600">Tasks: {totalTasks}</span>
          <div className="flex gap-2">
            <span className="text-green-600">✓ {completedTasks}</span>
            <span className="text-blue-600">⟳ {inProgressTasks}</span>
          </div>
        </div>

        {/* Action Buttons - at bottom */}
        <div className="flex gap-2">
          {/* View Tasks Button - Different navigation for different project types */}
          <Button
            className="flex-1 text-sm py-2"
            variant="primary"
            onClick={() => {
              if (onTabChange && onProjectSelect) {
                // PM Dashboard - use internal routing
                onProjectSelect(project, project.project_type || 'regular');
                onTabChange('tasks');
              } else {
                // Admin Dashboard - use external routing
                if (project.project_type === 'rental') {
                  // For rental deals, use deal_id_for_navigation if available, otherwise project.id
                  const dealId = (project as any).deal_id_for_navigation || project.id;
                  navigate(`/rental-deals/${dealId}/tasks`);
                } else if (project.project_type === 'builder') {
                  // For builder deals, use deal_id_for_navigation if available, otherwise project.id
                  const dealId = (project as any).deal_id_for_navigation || project.id;
                  navigate(`/builder-deals/${dealId}/tasks`);
                } else {
                  navigate(`/projects/${project.id}/tasks`);
                }
              }
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Tasks
          </Button>
          
          {/* Timeline Button - Only for rental/builder deals */}
          {(project.project_type === 'rental' || project.project_type === 'builder') && (
            <Button
              className="flex-1 text-sm py-2"
              variant="outline"
              onClick={() => {
                if (onTabChange && onProjectSelect) {
                  // PM Dashboard - use internal routing
                  onProjectSelect(project, project.project_type || 'regular');
                  onTabChange('timeline'); // Go to timeline
                } else {
                  // Admin Dashboard - use external routing
                  if (project.project_type === 'rental') {
                    // For rental deals, use deal_id_for_navigation if available, otherwise project.id
                    const dealId = (project as any).deal_id_for_navigation || project.id;
                    navigate(`/rental-deals/${dealId}/timeline`);
                  } else if (project.project_type === 'builder') {
                    // For builder deals, use deal_id_for_navigation if available, otherwise project.id
                    const dealId = (project as any).deal_id_for_navigation || project.id;
                    navigate(`/builder-deals/${dealId}/timeline`);
                  }
                }
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Timeline
            </Button>
          )}
          
          {/* Documents Button - Different navigation for different project types */}
          <Button
            className="flex-1 text-sm py-2"
            variant="outline"
            onClick={() => {
              console.log('🔍 ProjectCard - Documents button clicked');
              console.log('🔍 ProjectCard - Project:', project.name, 'Type:', project.project_type);
              console.log('🔍 ProjectCard - Project ID:', project.id);
              console.log('🔍 ProjectCard - Deal ID for navigation:', (project as any).deal_id_for_navigation);
              console.log('🔍 ProjectCard - onTabChange available:', !!onTabChange);
              console.log('🔍 ProjectCard - onProjectSelect available:', !!onProjectSelect);
              
              if (onTabChange && onProjectSelect) {
                // PM Dashboard - use internal routing
                console.log('🔍 ProjectCard - Using internal routing (PM Dashboard)');
                onProjectSelect(project, project.project_type || 'regular');
                onTabChange('documents');
              } else {
                // Admin Dashboard - use external routing
                console.log('🔍 ProjectCard - Using external routing (Admin Dashboard)');
                if (project.project_type === 'rental') {
                  // For rental deals, use deal_id_for_navigation if available, otherwise project.id
                  const dealId = (project as any).deal_id_for_navigation || project.id;
                  const path = `/rental-deals/${dealId}/documents`;
                  console.log('🔍 ProjectCard - Navigating to rental documents:', path);
                  navigate(path);
                } else if (project.project_type === 'builder') {
                  // For builder deals, use deal_id_for_navigation if available, otherwise project.id
                  const dealId = (project as any).deal_id_for_navigation || project.id;
                  const path = `/builder-deals/${dealId}/documents`;
                  console.log('🔍 ProjectCard - Navigating to builder documents:', path);
                  navigate(path);
                } else {
                  const path = `/projects/${project.id}/documents`;
                  console.log('🔍 ProjectCard - Navigating to regular documents:', path);
                  navigate(path);
                }
              }
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </Button>
          
          {/* Project Access Button - Only for admins */}
          {user?.role === 'admin' && (
            <Button
              className="flex-1 text-sm py-2"
              variant="outline"
              onClick={() => {
                navigate(`/project-access/${project.id}`);
              }}
            >
              <Key className="w-4 h-4 mr-2" />
              Project Access
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard; 