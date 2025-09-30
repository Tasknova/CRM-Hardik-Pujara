import React from 'react';
import { useParams } from 'react-router-dom';
import ProjectTasksPage from './ProjectTasksPage';

const ProjectTasksPageWrapper: React.FC = () => {
  const { projectId, dealId } = useParams<{ projectId?: string; dealId?: string }>();
  
  // Use dealId if available (for rental/builder deals), otherwise use projectId
  const actualProjectId = dealId || projectId;
  
  if (!actualProjectId) {
    return <div>Project ID not found</div>;
  }

  return <ProjectTasksPage projectId={actualProjectId} />;
};

export default ProjectTasksPageWrapper;
