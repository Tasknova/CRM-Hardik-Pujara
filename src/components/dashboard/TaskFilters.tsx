import React from 'react';
import { Filter } from 'lucide-react';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  showMemberFilter?: boolean;
  members?: { id: string; name: string }[];
  admins?: { id: string; name: string }[];
  projectManagers?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const TaskFiltersComponent: React.FC<TaskFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  showMemberFilter = false,
  members = [],
  admins = [],
  projectManagers = [],
  projects = [],
}) => {
  const handleFilterChange = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        {Object.keys(filters).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({})}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filters in responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
        {/* Search input */}
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">Search:</span>
          <input
            type="text"
            value={filters.search || ''}
            onChange={e => handleFilterChange('search', e.target.value)}
            placeholder="Search tasks..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          />
        </div>

        {/* Assigned To filter */}
        {showMemberFilter && (
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-gray-600">Assigned To:</span>
            <select
              value={filters.assignedTo || 'all'}
              onChange={e => handleFilterChange('assignedTo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">All Users</option>
              {members.length > 0 && (
                <optgroup label="Members">
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </optgroup>
              )}
              {admins.length > 0 && (
                <optgroup label="Admins">
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </optgroup>
              )}
              {projectManagers.length > 0 && (
                <optgroup label="Project Managers">
                  {projectManagers.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Project filter */}
        {projects && projects.length > 0 && (
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-gray-600">Project:</span>
            <select
              value={filters.project || 'all'}
              onChange={e => handleFilterChange('project', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status filter */}
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">Status:</span>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Priority filter */}
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">Priority:</span>
          <select
            value={filters.priority || 'all'}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Sort by Date */}
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">Sort by Due Date:</span>
          <select
            value={filters.dueDateSort || 'asc'}
            onChange={(e) => handleFilterChange('dueDateSort', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="asc">Due Date (Ascending)</option>
            <option value="desc">Due Date (Descending)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default TaskFiltersComponent;