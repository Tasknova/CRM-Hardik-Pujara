import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, CheckCircle, Clock, AlertCircle, Paperclip, Plus, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import FileUpload from '../ui/FileUpload';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface DealInfo {
  id: string;
  project_name: string;
  deal_type: string;
  property_type: string;
  property_address: string;
  builder_name: string;
  builder_location: string;
  client_name: string;
  start_date: string;
  end_date: string;
  project_id?: string;
}

interface DealStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  priority?: string;
  comments?: string;
  attachments?: any[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

interface StageAssignment {
  id: string;
  stage_id: string;
  member_id: string;
  task_id?: string;
  priority: string;
  attachments?: any[];
  members: TeamMember;
  // Task details
  task_name?: string;
  task_status?: string;
  task_priority?: string;
  task_due_date?: string;
  task_description?: string;
  task_progress?: number;
  task_assigned_user_ids?: string[];
}

interface BuilderDealTimelineProps {
  dealId: string;
  onBack: () => void;
}

const BuilderDealTimeline: React.FC<BuilderDealTimelineProps> = ({ dealId, onBack }) => {
  const { user } = useAuth();
  const [dealInfo, setDealInfo] = useState<DealInfo | null>(null);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dealTeamMembers, setDealTeamMembers] = useState<TeamMember[]>([]);
  const [stageAssignments, setStageAssignments] = useState<Record<string, StageAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    estimated_date: '',
    assigned_to: '',
    assigned_members: [] as string[],
    priority: 'medium',
    comments: '',
    attachments: [] as any[]
  });

  useEffect(() => {
    fetchDealData();
    fetchTeamMembers();
  }, [dealId]);

  // Function to check and update stage completion status
  const checkAndUpdateStageCompletion = async (stageId: string) => {
    try {
      // Get all tasks for this stage
      const { data: stageTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', dealInfo?.project_id)
        .contains('tags', [`builder-deal-${stageId}`]);

      if (tasksError) {
        console.error('Error fetching stage tasks:', tasksError);
        return;
      }

      if (!stageTasks || stageTasks.length === 0) {
        return; // No tasks for this stage
      }

      // Check if all tasks are completed
      const allCompleted = stageTasks.every(task => task.status === 'completed');
      
      if (allCompleted) {
        // Update stage status to completed
        const { error: stageError } = await supabase
          .from('builder_deal_stages')
          .update({
            status: 'completed',
            actual_end_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', stageId);

        if (stageError) {
          console.error('Error updating stage status:', stageError);
        } else {
          toast.success('Stage completed! All tasks are finished.');
          fetchDealData(); // Refresh data
        }
      }
    } catch (error) {
      console.error('Error checking stage completion:', error);
    }
  };

  // Real-time subscription for task status changes
  useEffect(() => {
    if (!dealInfo?.project_id) return;

    const channel = supabase
      .channel('task-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${dealInfo.project_id}`
        },
        (payload) => {
          console.log('Task status changed:', payload);
          // Check all stages for completion when any task status changes
          stages.forEach(stage => {
            checkAndUpdateStageCompletion(stage.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealInfo?.project_id, stages]);

  const fetchDealData = async () => {
    try {
      // Fetch deal info
      const { data: dealData, error: dealError } = await supabase
        .from('builder_deals')
        .select('id, project_name, deal_type, property_type, property_address, builder_name, builder_location, client_name, start_date, end_date, project_id')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      setDealInfo(dealData);

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('builder_deal_stages')
        .select('*')
        .eq('deal_id', dealId)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Fetch deal team members
      const { data: dealTeamData, error: dealTeamError } = await supabase
        .from('builder_deal_team_members')
        .select(`
          member_id,
          members!builder_deal_team_members_member_id_fkey (id, name, email, role, department)
        `)
        .eq('deal_id', dealId);

      if (dealTeamError) throw dealTeamError;
      
      const teamMembers = (dealTeamData || []).map(item => item.members).filter(Boolean);
      setDealTeamMembers(teamMembers);

      // Fetch stage assignments
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('builder_stage_assignments')
          .select(`
            *,
            members!builder_stage_assignments_member_id_fkey (id, name, email, role, department),
            tasks!builder_stage_assignments_task_id_fkey(
              id,
              task_name,
              status,
              priority,
              due_date,
              description,
              progress,
              assigned_user_ids
            )
          `)
          .in('stage_id', (stagesData || []).map(s => s.id));

        if (assignmentsError) {
          console.warn('Stage assignments table may not exist:', assignmentsError);
        } else {
          const assignmentsByStage = (assignmentsData || []).reduce((acc, assignment) => {
            const stageId = assignment.stage_id;
            if (!acc[stageId]) acc[stageId] = [];
            acc[stageId].push(assignment);
            return acc;
          }, {} as Record<string, StageAssignment[]>);
          setStageAssignments(assignmentsByStage);
        }
      } catch (error) {
        console.warn('Error fetching stage assignments:', error);
      }

    } catch (error) {
      console.error('Error fetching deal data:', error);
      toast.error('Failed to fetch deal data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email, role, department, phone')
        .in('role', ['admin', 'project_manager', 'member'])
        .order('name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to fetch team members');
    }
  };

  const calculateStageDates = (startDate: string, endDate: string, totalStages: number): string[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerStage = Math.floor(totalDays / totalStages);
    
    const stageDates: string[] = [];
    for (let i = 0; i < totalStages; i++) {
      const stageDate = addDays(start, i * daysPerStage);
      stageDates.push(stageDate.toISOString().split('T')[0]);
    }
    
    return stageDates;
  };

  const handleEditStage = (stage: DealStage) => {
    setEditingStage(stage.id);
    const assignments = stageAssignments[stage.id] || [];
    setEditForm({
      estimated_date: stage.estimated_date || '',
      assigned_to: '',
      assigned_members: assignments.map(a => a.member_id),
      priority: stage.priority || 'medium',
      comments: stage.comments || '',
      attachments: stage.attachments || []
    });
  };

  const handleQuickDateSave = async (stageId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('builder_deal_stages')
        .update({
          estimated_date: newDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (error) throw error;

      toast.success('Date updated successfully');
      setEditingDate(null);
      fetchDealData(); // Refresh data
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleSaveStage = async (stageId: string) => {
    try {
      // Update the stage
      const { error: stageError } = await supabase
        .from('builder_deal_stages')
        .update({
          estimated_date: editForm.estimated_date || null,
          priority: editForm.priority,
          comments: editForm.comments,
          attachments: editForm.attachments,
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (stageError) throw stageError;

      // Handle member assignments
      const currentAssignments = stageAssignments[stageId] || [];
      const currentMemberIds = currentAssignments.map(a => a.member_id);
      const newMemberIds = editForm.assigned_members;
      
      // Remove ALL existing assignments for this stage
      if (currentAssignments.length > 0) {
        await supabase
          .from('builder_stage_assignments')
          .delete()
          .eq('stage_id', stageId);
      }

      // Create a single task for all selected members (if any members selected)
      if (newMemberIds.length > 0) {
        const stage = stages.find(s => s.id === stageId);
        
        if (stage && dealInfo) {
          console.log('Creating task for members:', newMemberIds);

          // Create task with all selected members
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .insert([{
              user_id: newMemberIds[0], // Use first member as primary assignee (required by trigger)
              assigned_user_ids: newMemberIds, // All selected members as JSON array
              created_by: newMemberIds[0], // Use first member as creator (required by trigger)
              task_name: `${dealInfo.project_name} - ${stage.stage_name}`,
              description: `Complete ${stage.stage_name} for ${dealInfo.deal_type} builder purchase deal: ${dealInfo.project_name}.\n\nBuilder: ${dealInfo.builder_name}\nClient: ${dealInfo.client_name}\nProperty: ${dealInfo.property_address}\n\nStage Details: ${stage.stage_name}`,
              due_date: editForm.estimated_date || null,
              priority: editForm.priority as 'low' | 'medium' | 'high' | 'urgent',
              status: 'pending',
              project_id: dealInfo.project_id || null,
              tags: ['builder-deal', dealInfo.deal_type, stage.stage_name.toLowerCase().replace(/\s+/g, '-')],
              estimated_hours: 4,
              attachments: editForm.attachments
            }])
            .select()
            .single();

          if (taskError) {
            console.error('Error creating task:', taskError);
            toast.error(`Failed to create task: ${taskError.message}`);
          } else {
            console.log('Task created successfully:', taskData);
            
            // Create ONE stage assignment for the primary member (to avoid duplicate tasks)
            const assignment = {
              stage_id: stageId,
              member_id: newMemberIds[0], // Use first member as primary
              task_id: taskData.id,
              priority: editForm.priority,
              attachments: editForm.attachments
            };

            const { error: assignmentError } = await supabase
              .from('builder_stage_assignments')
              .insert([assignment]);

            if (assignmentError) {
              console.error('Error creating assignments:', assignmentError);
              toast.error('Failed to create stage assignments');
            }
          }
        }
      }

      toast.success('Stage updated successfully');
      setEditingStage(null);
      fetchDealData(); // Refresh data
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Failed to save stage');
    }
  };

  const handleCompleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('builder_deal_stages')
        .update({
          status: 'completed',
          actual_end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (error) throw error;

      toast.success('Stage marked as completed');
      fetchDealData();
    } catch (error) {
      console.error('Error completing stage:', error);
      toast.error('Failed to complete stage');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dealInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Deal not found</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deals
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deals
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{dealInfo.project_name}</h1>
      </div>

      {/* Deal Info */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Property Details</h3>
            <p className="text-sm text-gray-600">{dealInfo.property_type}</p>
            <p className="text-sm text-gray-600 mt-1">{dealInfo.property_address}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Builder</h3>
            <p className="text-sm text-gray-600">{dealInfo.builder_name}</p>
            <p className="text-sm text-gray-600 mt-1">{dealInfo.builder_location}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
            <p className="text-sm text-gray-600">{dealInfo.client_name}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(dealInfo.start_date), 'MMM dd, yyyy')} - {format(new Date(dealInfo.end_date), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Deal Timeline</h3>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          
          {stages.map((stage, index) => {
            const stageDates = dealInfo?.start_date && dealInfo?.end_date 
              ? calculateStageDates(dealInfo.start_date, dealInfo.end_date, stages.length)
              : [];
            const calculatedDate = stageDates[index];
            
            return (
              <div key={stage.id} className="relative flex items-start mb-8">
                {/* Timeline node */}
                <div className={`absolute left-6 w-4 h-4 rounded-full border-4 ${
                  stage.status === 'completed' ? 'bg-green-500 border-green-200' :
                  stage.status === 'in_progress' ? 'bg-blue-500 border-blue-200' :
                  'bg-gray-300 border-gray-200'
                } z-10`}></div>
                
                {/* Date Column */}
                <div className="w-32 text-right pr-6 flex flex-col items-end justify-center min-h-[60px]">
                  {editingDate === stage.id ? (
                    <div className="flex flex-col space-y-1">
                      <input
                        type="date"
                        defaultValue={stage.estimated_date || calculatedDate || ''}
                        min={new Date().toISOString().split('T')[0]}
                        onBlur={(e) => {
                          if (e.target.value !== (stage.estimated_date || calculatedDate)) {
                            handleQuickDateSave(stage.id, e.target.value);
                          } else {
                            setEditingDate(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickDateSave(stage.id, e.currentTarget.value);
                          } else if (e.key === 'Escape') {
                            setEditingDate(null);
                          }
                        }}
                        className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <div className="text-xs text-gray-500">Press Enter to save</div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                      onClick={() => setEditingDate(stage.id)}
                      title="Click to edit date"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {stage.estimated_date 
                          ? format(new Date(stage.estimated_date), 'MMM dd')
                          : calculatedDate 
                          ? format(new Date(calculatedDate), 'MMM dd')
                          : `Stage ${stage.stage_order}`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {stage.estimated_date 
                          ? format(new Date(stage.estimated_date), 'yyyy')
                          : calculatedDate 
                          ? format(new Date(calculatedDate), 'yyyy')
                          : 'Click to set date'
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Content Card */}
                <div className="flex-1 ml-8">
                  <Card className={`p-4 ${stage.status === 'in_progress' ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(stage.status)}
                          <h4 className="text-lg font-medium text-gray-900">
                            {stage.stage_name}
                          </h4>
                          <Badge className={getStatusColor(stage.status)}>
                            {stage.status.replace('_', ' ')}
                          </Badge>
                          {stage.priority && (
                            <Badge className={`
                              ${stage.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                stage.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                stage.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'}
                            `}>
                              {stage.priority}
                            </Badge>
                          )}
                        </div>

                        {/* Assignments */}
                        {stageAssignments[stage.id] && stageAssignments[stage.id].length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Assigned to:</p>
                            <div className="flex flex-wrap gap-2">
                              {stageAssignments[stage.id].map(assignment => (
                                <Badge key={assignment.id} className="bg-blue-100 text-blue-800">
                                  {assignment.members.name}
                                  {assignment.task_id && (
                                    <span className="ml-1 text-green-600" title="Task created">✓</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Details */}
                        {stageAssignments[stage.id] && stageAssignments[stage.id].some(a => a.task_id) && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 mb-2">Associated Tasks:</div>
                            <div className="space-y-2">
                              {(() => {
                                // Get unique tasks from stage assignments to avoid duplicates
                                const uniqueTasks = new Map();
                                
                                stageAssignments[stage.id]
                                  .filter(assignment => assignment.task_id)
                                  .forEach(assignment => {
                                    if (!uniqueTasks.has(assignment.task_id)) {
                                      uniqueTasks.set(assignment.task_id, assignment);
                                    }
                                  });
                                
                                return Array.from(uniqueTasks.values()).map(assignment => (
                                  <div key={assignment.task_id} className="p-3 bg-white rounded border">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                          assignment.task_status === 'completed' ? 'bg-green-500' :
                                          assignment.task_status === 'in_progress' ? 'bg-blue-500' :
                                          'bg-gray-400'
                                        }`}></div>
                                        <span className="text-sm font-medium text-gray-900">
                                          {assignment.task_name || `Task for ${assignment.members.name}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          assignment.task_status === 'completed' ? 'bg-green-100 text-green-800' :
                                          assignment.task_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {assignment.task_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Show all assigned members from the task */}
                                    <div className="mb-2">
                                      <span className="text-xs font-medium text-gray-600">Assigned to:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {assignment.tasks?.assigned_user_ids && assignment.tasks.assigned_user_ids.length > 0 ? (
                                          assignment.tasks.assigned_user_ids.map((userId: string) => {
                                            const member = dealTeamMembers.find(m => m.id === userId);
                                            return (
                                              <span
                                                key={userId}
                                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                              >
                                                <User className="w-3 h-3 mr-1" />
                                                {member?.name || 'Unknown'}
                                                <span className="ml-1 text-green-600">✓</span>
                                              </span>
                                            );
                                          })
                                        ) : (
                                          <span className="text-xs text-gray-500">No members assigned</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium">Priority:</span>
                                        <span className={`px-1 py-0.5 rounded text-xs ${
                                          assignment.task_priority === 'high' ? 'bg-red-100 text-red-800' :
                                          assignment.task_priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-green-100 text-green-800'
                                        }`}>
                                          {assignment.task_priority?.toUpperCase() || 'LOW'}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <span className="font-medium">Due:</span>
                                        <span>{assignment.task_due_date ? 
                                          new Date(assignment.task_due_date).toLocaleDateString() : 
                                          'No due date'
                                        }</span>
                                      </div>
                                    </div>
                                    
                                    {assignment.task_description && (
                                      <div className="mt-2 text-xs text-gray-600">
                                        <span className="font-medium">Description:</span>
                                        <p className="mt-1 line-clamp-2">{assignment.task_description}</p>
                                      </div>
                                    )}
                                    
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Comments */}
                        {stage.comments && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Comments:</p>
                            <p className="text-sm text-gray-600">{stage.comments}</p>
                          </div>
                        )}

                        {/* Attachments */}
                        {stage.attachments && stage.attachments.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Attachments:</p>
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {stage.attachments.length} file(s)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Edit Form */}
                        {editingStage === stage.id && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Estimated Date
                                </label>
                                <input
                                  type="date"
                                  value={editForm.estimated_date}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, estimated_date: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Priority
                                </label>
                                <select
                                  value={editForm.priority}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assign to Team Members
                              </label>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {teamMembers.length > 0 ? (
                                  teamMembers.map(member => (
                                    <label key={member.id} className="flex items-center space-x-3">
                                      <input
                                        type="checkbox"
                                        checked={editForm.assigned_members.includes(member.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditForm(prev => ({
                                              ...prev,
                                              assigned_members: [...prev.assigned_members, member.id]
                                            }));
                                          } else {
                                            setEditForm(prev => ({
                                              ...prev,
                                              assigned_members: prev.assigned_members.filter(id => id !== member.id)
                                            }));
                                          }
                                        }}
                                        className="rounded"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {member.name} ({member.department || member.role})
                                      </span>
                                    </label>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500 p-2">
                                    No team members available. Please add team members first.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Comments
                              </label>
                              <textarea
                                value={editForm.comments}
                                onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Add comments or notes for this stage..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Attachments
                              </label>
                              <FileUpload
                                onFilesChange={(files) => setEditForm(prev => ({ ...prev, attachments: files }))}
                                existingFiles={editForm.attachments}
                              />
                            </div>

                            <div className="flex justify-end space-x-3">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setEditingStage(null)}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleSaveStage(stage.id)}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {editingStage !== stage.id && (
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditStage(stage)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {stage.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteStage(stage.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default BuilderDealTimeline;
