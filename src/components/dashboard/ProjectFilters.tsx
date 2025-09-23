import React from 'react';
import { Filter, Search } from 'lucide-react';
import Button from '../ui/Button';

interface ProjectFilters {
  search?: string;
  status?: string;
  client?: string;
  projectManager?: string;
  dateSort?: string;
}

interface ProjectFiltersProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  clients?: string[];
  projectManagers?: Array<{ id: string; name: string }>;
}

const ProjectFiltersComponent: React.FC<ProjectFiltersProps> = ({ 
  filters, 
  onFiltersChange,
  clients = [],
  projectManagers = []
}) => {
  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
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
          <span className="text-sm font-medium text-gray-700">Project Filters</span>
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

      {/* Filters in one line */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="flex items-center space-x-2 min-w-[250px]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="Search projects by name or description..."
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center space-x-2 min-w-[140px]">
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Client filter */}
        {clients.length > 0 && (
          <div className="flex items-center space-x-2 min-w-[150px]">
            <select
              value={filters.client || 'all'}
              onChange={(e) => handleFilterChange('client', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
        )}

        {/* Project Manager filter */}
        {projectManagers.length > 0 && (
          <div className="flex items-center space-x-2 min-w-[180px]">
            <select
              value={filters.projectManager || 'all'}
              onChange={(e) => handleFilterChange('projectManager', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">All Project Managers</option>
              {projectManagers.map(pm => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort by Date */}
        <div className="flex items-center space-x-2 min-w-[180px]">
          <select
            value={filters.dateSort || 'newest'}
            onChange={(e) => handleFilterChange('dateSort', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProjectFiltersComponent;
