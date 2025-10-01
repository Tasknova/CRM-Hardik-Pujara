import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, Calendar, User, Building } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { toast } from 'sonner';

interface Task {
  id: string;
  task_name: string;
  description?: string;
  status: string;
  priority: string;
  due_date: string;
  progress: number;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  client_name?: string;
}

interface DealStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_date: string | null;
  actual_date: string | null;
  assigned_to: string | null;
  comments: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

const ProjectAccessTasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const session = localStorage.getItem('projectAccessSession');
    if (!session) {
      navigate('/project-access/login');
      return;
    }

    const parsedSession = JSON.parse(session);
    if (parsedSession.projectId !== projectId) {
      toast.error('Invalid project access');
      navigate('/project-access/login');
      return;
    }

    setSessionData(parsedSession);
    fetchData();
  }, [projectId, navigate]);

  const fetchData = async () => {
    try {
      console.log('🔍 ProjectAccessTasksPage - Fetching data for projectId:', projectId);
      
      // First try to fetch from projects table
      let projectData = null;
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectsData && !projectsError) {
        console.log('🔍 ProjectAccessTasksPage - Found in projects table:', projectsData);
        projectData = projectsData;
      } else {
        console.log('🔍 ProjectAccessTasksPage - Not found in projects table, checking rental deals...');
        
        // Check rental deals
        const { data: rentalDeal, error: rentalError } = await supabase
          .from('rental_deals')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (rentalDeal && !rentalError) {
          console.log('🔍 ProjectAccessTasksPage - Found rental deal:', rentalDeal);
          projectData = {
            id: rentalDeal.project_id,
            name: rentalDeal.project_name,
            description: `Rental Deal: ${rentalDeal.deal_type}`,
            status: 'active',
            client_name: rentalDeal.client_name,
            start_date: rentalDeal.start_date,
            expected_end_date: rentalDeal.end_date
          };
        } else {
          console.log('🔍 ProjectAccessTasksPage - Not found in rental deals, checking builder deals...');
          
          // Check builder deals
          const { data: builderDeal, error: builderError } = await supabase
            .from('builder_deals')
            .select('*')
            .eq('project_id', projectId)
            .single();

          if (builderDeal && !builderError) {
            console.log('🔍 ProjectAccessTasksPage - Found builder deal:', builderDeal);
            projectData = {
              id: builderDeal.project_id,
              name: builderDeal.project_name,
              description: `Builder Deal: ${builderDeal.deal_type}`,
              status: 'active',
              client_name: builderDeal.client_name,
              start_date: builderDeal.start_date,
              expected_end_date: builderDeal.end_date
            };
          }
        }
      }

      if (!projectData) {
        throw new Error('Project not found');
      }

      setProject(projectData);

      // Fetch project tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.log('🔍 ProjectAccessTasksPage - Tasks error:', tasksError);
        setTasks([]);
      } else {
        console.log('🔍 ProjectAccessTasksPage - Found tasks:', tasksData);
        setTasks(tasksData || []);
      }

      // Fetch timeline stages - check if it's a rental or builder deal
      let stagesData = [];
      
      // Check rental deals first
      const { data: rentalDeal, error: rentalError } = await supabase
        .from('rental_deals')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (rentalDeal && !rentalError) {
        console.log('🔍 ProjectAccessTasksPage - Found rental deal, fetching stages:', rentalDeal.id);
        const { data: rentalStages, error: rentalStagesError } = await supabase
          .from('rental_deal_stages')
          .select('*')
          .eq('deal_id', rentalDeal.id)
          .order('stage_order', { ascending: true });

        if (!rentalStagesError && rentalStages) {
          console.log('🔍 ProjectAccessTasksPage - Found rental stages:', rentalStages);
          stagesData = rentalStages;
        }
      } else {
        // Check builder deals
        const { data: builderDeal, error: builderError } = await supabase
          .from('builder_deals')
          .select('id')
          .eq('project_id', projectId)
          .single();

        if (builderDeal && !builderError) {
          console.log('🔍 ProjectAccessTasksPage - Found builder deal, fetching stages:', builderDeal.id);
          const { data: builderStages, error: builderStagesError } = await supabase
            .from('builder_deal_stages')
            .select('*')
            .eq('deal_id', builderDeal.id)
            .order('stage_order', { ascending: true });

          if (!builderStagesError && builderStages) {
            console.log('🔍 ProjectAccessTasksPage - Found builder stages:', builderStages);
            stagesData = builderStages;
          }
        }
      }

      setStages(stagesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'skipped': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5" />;
      case 'in_progress': return <Clock className="w-5 h-5" />;
      case 'pending': return <AlertCircle className="w-5 h-5" />;
      case 'skipped': return <AlertCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(`/project-access/dashboard/${projectId}`)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const inProgressStages = stages.filter(stage => stage.status === 'in_progress').length;
  const pendingStages = stages.filter(stage => stage.status === 'pending').length;
  const totalStages = stages.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/project-access/dashboard/${projectId}`)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600">Project Tasks</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Access as:</span> {sessionData?.entityName} ({sessionData?.accessType})
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stages</p>
                <p className="text-2xl font-bold text-gray-900">{totalStages}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedStages}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressStages}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingStages}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Timeline Stages */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
            <div className="text-sm text-gray-600">
              {totalStages} stage{totalStages !== 1 ? 's' : ''} total
            </div>
          </div>

          {stages.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timeline stages found</h3>
              <p className="text-gray-600">There are no timeline stages for this project yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div key={stage.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">#{stage.stage_order}</span>
                          <h4 className="text-lg font-medium text-gray-900">{stage.stage_name}</h4>
                        </div>
                        <Badge className={getStageStatusColor(stage.status)}>
                          <div className="flex items-center space-x-1">
                            {getStageStatusIcon(stage.status)}
                            <span>{stage.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                        {stage.priority && (
                          <Badge className={getPriorityColor(stage.priority)}>
                            {stage.priority}
                          </Badge>
                        )}
                      </div>
                      
                      {stage.comments && (
                        <p className="text-gray-600 mb-3">{stage.comments}</p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        {stage.estimated_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Estimated: {new Date(stage.estimated_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {stage.actual_date && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Completed: {new Date(stage.actual_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline connector line */}
                  {index < stages.length - 1 && (
                    <div className="mt-4 flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="flex-1 h-px bg-gray-200 ml-2"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectAccessTasksPage;
