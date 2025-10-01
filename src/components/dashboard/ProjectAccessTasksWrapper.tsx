import React from 'react';
import { useParams } from 'react-router-dom';
import ProjectAccessTasksPage from './ProjectAccessTasksPage';

const ProjectAccessTasksWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  console.log('🔍 ProjectAccessTasksWrapper - projectId:', projectId);
  console.log('🔍 ProjectAccessTasksWrapper - URL:', window.location.href);
  
  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600">The project ID is missing from the URL.</p>
        </div>
      </div>
    );
  }

  return <ProjectAccessTasksPage />;
};

export default ProjectAccessTasksWrapper;
