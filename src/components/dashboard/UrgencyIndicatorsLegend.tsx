import React from 'react';

const UrgencyIndicatorsLegend: React.FC = () => {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Urgency Indicators</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <div className="bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center space-x-1">
            <span>⚠️</span>
          </div>
          <span className="text-gray-600">Overdue - Past due date</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full flex items-center space-x-1">
            <span>⚡</span>
          </div>
          <span className="text-gray-600">Due Today - Due today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex items-center space-x-1">
            <span>⏰</span>
          </div>
          <span className="text-gray-600">Due Tomorrow - Due tomorrow</span>
        </div>
      </div>
    </div>
  );
};

export default UrgencyIndicatorsLegend;
