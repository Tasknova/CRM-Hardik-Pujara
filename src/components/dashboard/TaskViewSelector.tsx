import React from 'react';
import { Grid3X3, List, Calendar } from 'lucide-react';
import Button from '../ui/Button';

export type TaskViewType = 'grid' | 'list' | 'calendar';

interface TaskViewSelectorProps {
  currentView: TaskViewType;
  onViewChange: (view: TaskViewType) => void;
}

const TaskViewSelector: React.FC<TaskViewSelectorProps> = ({ currentView, onViewChange }) => {
  const views = [
    {
      type: 'grid' as TaskViewType,
      icon: Grid3X3,
      label: 'Grid View',
      description: 'Card-based layout'
    },
    {
      type: 'list' as TaskViewType,
      icon: List,
      label: 'List View',
      description: 'Compact table layout'
    },
    {
      type: 'calendar' as TaskViewType,
      icon: Calendar,
      label: 'Calendar View',
      description: 'Timeline-based layout'
    }
  ];

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.type;
        
        return (
          <button
            key={view.type}
            onClick={() => onViewChange(view.type)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
              isActive 
                ? 'bg-white text-blue-600 shadow-sm border border-blue-200' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
            title={`${view.label}: ${view.description}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TaskViewSelector;
