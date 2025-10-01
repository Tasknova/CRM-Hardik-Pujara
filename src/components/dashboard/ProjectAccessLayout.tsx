import React from 'react';

interface ProjectAccessLayoutProps {
  children: React.ReactNode;
}

const ProjectAccessLayout: React.FC<ProjectAccessLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
};

export default ProjectAccessLayout;
