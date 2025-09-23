import { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projects';

export function useProjects() {
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

  useEffect(() => {
    fetchProjects();
  }, []);

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

  return { projects, loading, error, addProject, updateProject, deleteProject, fetchProjects };
} 