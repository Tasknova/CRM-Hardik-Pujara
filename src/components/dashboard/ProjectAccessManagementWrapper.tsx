import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectAccessManagement from './ProjectAccessManagement';

const ProjectAccessManagementWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState<string>('Project');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProjectName = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        
        if (error) throw error;
        setProjectName(data?.name || 'Project');
      } catch (error) {
        console.error('Error fetching project name:', error);
        setProjectName('Project');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectName();
  }, [projectId]);
  
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <ProjectAccessManagement projectId={projectId} projectName={projectName} />;
};

export default ProjectAccessManagementWrapper;
