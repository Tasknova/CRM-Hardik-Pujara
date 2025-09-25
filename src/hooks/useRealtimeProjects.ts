import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projects';
import { supabase } from '../lib/supabase';

export function useRealtimeProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      setError('Failed to create project');
      throw err;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updated = await projectService.updateProject(id, updates);
      setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
    } catch (err) {
      setError('Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  // Real-time subscription for projects
  useEffect(() => {
    fetchProjects();

    const projectsSubscription = supabase
      .channel('projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Projects real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New project created - add to list
            const newProject = payload.new as Project;
            setProjects(prev => [newProject, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Project updated - update in list
            const updatedProject = payload.new as Project;
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
          } else if (payload.eventType === 'DELETE') {
            // Project deleted - remove from list
            const deletedProject = payload.old as Project;
            setProjects(prev => prev.filter(p => p.id !== deletedProject.id));
          }
        }
      )
      .subscribe();

    return () => {
      projectsSubscription.unsubscribe();
    };
  }, []);

  return { projects, loading, error, addProject, updateProject, deleteProject, fetchProjects };
}
