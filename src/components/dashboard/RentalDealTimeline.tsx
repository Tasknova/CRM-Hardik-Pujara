import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, CheckCircle, Clock, MessageSquare, Edit2, Save, X, UserPlus, Star, Paperclip } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FileUpload from '../ui/FileUpload';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface RentalDealTimelineProps {
  dealId: string;
  dealType: 'residential' | 'commercial';
  onBack: () => void;
}

interface DealStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_date: string | null;
  actual_date: string | null;
  assigned_to: string | null;
  assigned_member_name?: string;
  assigned_members?: string[];
  comments: string | null;
  priority?: string;
  attachments?: any[];
  created_at: string;
  updated_at: string;
}

interface StageAssignment {
  id: string;
  stage_id: string;
  member_id: string;
  member_name: string;
  task_id?: string;
  priority: string;
  attachments: any[];
  assigned_at: string;
  // Task details
  task_name?: string;
  task_status?: string;
  task_priority?: string;
  task_due_date?: string;
  task_description?: string;
  task_progress?: number;
}

interface DealInfo {
  id: string;
  project_name: string;
  deal_type: string;
  client_name: string;
  property_address: string;
  current_stage: number;
  project_id?: string;
  start_date: string | null;
  end_date: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const RentalDealTimeline: React.FC<RentalDealTimelineProps> = ({ dealId, dealType, onBack }) => {
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
      const { data: deal, error: dealError } = await supabase
        .from('rental_deals')
        .select('id, project_name, deal_type, client_name, property_address, current_stage, project_id, start_date, end_date')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      setDealInfo(deal);

      // Fetch deal team members (only those selected during deal creation)
      const { data: dealTeamData, error: dealTeamError } = await supabase
        .from('rental_deal_team_members')
        .select(`
          member_id,
          members!rental_deal_team_members_member_id_fkey(id, name, email, role, department)
        `)
        .eq('deal_id', dealId);

      if (dealTeamError) throw dealTeamError;
      
      const dealTeamMembersFormatted = dealTeamData.map(item => ({
        id: item.members.id,
        name: item.members.name,
        email: item.members.email,
        role: item.members.department || item.members.role || 'Team Member'
      }));
      
      setDealTeamMembers(dealTeamMembersFormatted);

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('rental_deal_stages')
        .select('*')
        .eq('deal_id', dealId)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData);

      // Fetch stage assignments (handle if table is empty or doesn't exist yet)
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('rental_stage_assignments')
          .select(`
            id,
            stage_id,
            member_id,
            task_id,
            priority,
            attachments,
            assigned_at,
            members!rental_stage_assignments_member_id_fkey(name),
            tasks!rental_stage_assignments_task_id_fkey(
              id,
              task_name,
              status,
              priority,
              due_date,
              description,
              progress
            )
          `)
          .in('stage_id', stagesData.map(s => s.id));

        if (assignmentsError) {
          console.warn('Stage assignments not available:', assignmentsError);
          setStageAssignments({});
        } else {
          // Group assignments by stage
          const assignmentsByStage: Record<string, StageAssignment[]> = {};
          (assignmentsData || []).forEach(assignment => {
            if (!assignmentsByStage[assignment.stage_id]) {
              assignmentsByStage[assignment.stage_id] = [];
            }
            assignmentsByStage[assignment.stage_id].push({
              id: assignment.id,
              stage_id: assignment.stage_id,
              member_id: assignment.member_id,
              member_name: assignment.members?.name || 'Unknown',
              task_id: assignment.task_id,
              priority: assignment.priority,
              attachments: assignment.attachments || [],
              assigned_at: assignment.assigned_at,
              // Task details
              task_name: assignment.tasks?.task_name,
              task_status: assignment.tasks?.status,
              task_priority: assignment.tasks?.priority,
              task_due_date: assignment.tasks?.due_date,
              task_description: assignment.tasks?.description,
              task_progress: assignment.tasks?.progress
            });
          });
          
          setStageAssignments(assignmentsByStage);
        }
      } catch (error) {
        console.warn('Stage assignments feature not available:', error);
        setStageAssignments({});
      }
    } catch (error) {
      console.error('Error fetching deal data:', error);
      toast.error('Failed to load deal information');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, email, role, department, phone')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to match our expected interface
      const transformedData = (data || []).map(member => ({
        ...member,
        role: member.department || member.role || 'Team Member' // Use department or role
      }));
      
      setTeamMembers(transformedData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Function to calculate stage dates between start and end dates
  const calculateStageDates = (startDate: string, endDate: string, totalStages: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerStage = Math.ceil(totalDays / totalStages);
    
    const stageDates: string[] = [];
    for (let i = 0; i < totalStages; i++) {
      const stageDate = new Date(start);
      stageDate.setDate(start.getDate() + (i * daysPerStage));
      stageDates.push(stageDate.toISOString().split('T')[0]);
    }
    
    return stageDates;
  };

  const handleEditStage = (stage: DealStage) => {
    setEditingStage(stage.id);
    const assignments = stageAssignments[stage.id] || [];
    setEditForm({
      estimated_date: stage.estimated_date || '',
      assigned_to: stage.assigned_to || '',
      assigned_members: assignments.map(a => a.member_id),
      priority: stage.priority || 'medium',
      comments: stage.comments || '',
      attachments: stage.attachments || []
    });
  };

  const handleQuickDateSave = async (stageId: string, newDate: string) => {
    try {
      const { error } = await supabase
        .from('rental_deal_stages')
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

  // Function to check and update stage completion status
  const checkAndUpdateStageCompletion = async (stageId: string) => {
    try {
      // Get all tasks for this stage
      const { data: stageTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', dealInfo?.project_id)
        .contains('tags', [`rental-deal-${stageId}`]);

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
          .from('rental_deal_stages')
          .update({
            status: 'completed',
            actual_date: new Date().toISOString(),
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

  const handleSaveStage = async (stageId: string) => {
    try {
      // Update the stage
      const { error: stageError } = await supabase
        .from('rental_deal_stages')
        .update({
          estimated_date: editForm.estimated_date || null,
          priority: editForm.priority,
          attachments: editForm.attachments,
          comments: editForm.comments || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (stageError) throw stageError;

      // Get current assignments
      const currentAssignments = stageAssignments[stageId] || [];
      const currentMemberIds = currentAssignments.map(a => a.member_id);
      const newMemberIds = editForm.assigned_members;

      // Find members to add and remove
      const membersToAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
      const membersToRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

      // Remove old assignments
      if (membersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('rental_stage_assignments')
          .delete()
          .eq('stage_id', stageId)
          .in('member_id', membersToRemove);

        if (removeError) throw removeError;
      }

      // Create a single task for all selected members
      if (membersToAdd.length > 0) {
        const stage = stages.find(s => s.id === stageId);
        
        if (stage && dealInfo) {
          console.log('Creating task for members:', membersToAdd);

          // Create task with all selected members
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .insert([{
              user_id: membersToAdd[0], // Use first member as primary assignee (required by trigger)
              assigned_user_ids: membersToAdd, // All selected members as JSON array
              created_by: membersToAdd[0], // Use first member as creator (required by trigger)
              task_name: `${dealInfo.project_name} - ${stage.stage_name}`,
              description: `Complete ${stage.stage_name} for ${dealInfo.deal_type} rental deal: ${dealInfo.project_name}.\n\nClient: ${dealInfo.client_name}\nProperty: ${dealInfo.property_address}\n\nStage Details: ${stage.stage_name}`,
              due_date: editForm.estimated_date || null,
              priority: editForm.priority as 'low' | 'medium' | 'high' | 'urgent',
              status: 'pending',
              project_id: dealInfo.project_id || null,
              tags: ['rental-deal', dealInfo.deal_type, stage.stage_name.toLowerCase().replace(/\s+/g, '-')],
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
            
            // Create ONE stage assignment for the stage (not per member)
            const assignment = {
              stage_id: stageId,
              member_id: membersToAdd[0], // Use first member as primary
              task_id: taskData.id,
              priority: editForm.priority,
              attachments: editForm.attachments
            };

            const { error: assignmentError } = await supabase
              .from('rental_stage_assignments')
              .insert([assignment]);

            if (assignmentError) {
              console.error('Error creating assignments:', assignmentError);
              toast.error('Failed to create stage assignments');
            }
          }
        }
      }

      toast.success(`Stage updated successfully. ${membersToAdd.length} task(s) created.`);
      setEditingStage(null);
      fetchDealData(); // Refresh data
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  const handleMarkComplete = async (stageId: string, stageOrder: number) => {
    try {
      // Update the stage to completed
      const { error: stageError } = await supabase
        .from('rental_deal_stages')
        .update({
          status: 'completed',
          actual_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (stageError) throw stageError;

      // Update the next stage to in_progress if it exists
      const nextStage = stages.find(s => s.stage_order === stageOrder + 1);
      if (nextStage && nextStage.status === 'pending') {
        const { error: nextStageError } = await supabase
          .from('rental_deal_stages')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', nextStage.id);

        if (nextStageError) throw nextStageError;

        // Update current_stage in the deal
        const { error: dealError } = await supabase
          .from('rental_deals')
          .update({ current_stage: stageOrder + 1 })
          .eq('id', dealId);

        if (dealError) throw dealError;
      }

      toast.success('Stage marked as complete');
      fetchDealData(); // Refresh data
    } catch (error) {
      console.error('Error marking stage complete:', error);
      toast.error('Failed to mark stage as complete');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal timeline...</p>
        </div>
      </div>
    );
  }

  if (!dealInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Deal not found</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dealInfo.project_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {dealInfo.client_name} • {dealInfo.property_address}
            </p>
          </div>
        </div>

        {/* Deal Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {dealInfo.deal_type} Rental Deal
              </h2>
              <p className="text-gray-600">
                Current Stage: {dealInfo.current_stage} of {stages.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((dealInfo.current_stage / stages.length) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(dealInfo.current_stage / stages.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Project Timeline</h2>
          
          {/* Timeline Container */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {stages.map((stage, index) => {
              // Calculate stage date if deal has start and end dates
              const stageDates = dealInfo?.start_date && dealInfo?.end_date 
                ? calculateStageDates(dealInfo.start_date, dealInfo.end_date, stages.length)
                : [];
              const calculatedDate = stageDates[index];
              
              return (
                <div key={stage.id} className="relative flex items-start mb-8">
                  {/* Timeline Node */}
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {stage.stage_name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(stage.status)}`}>
                              {stage.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                    {editingStage === stage.id ? (
                      <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Date
                            </label>
                            <input
                              type="date"
                              value={editForm.estimated_date}
                              onChange={(e) => setEditForm(prev => ({ ...prev, estimated_date: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={editForm.priority}
                              onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign to Team Members (Multiple Selection)
                          </label>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            {dealTeamMembers.map(member => (
                              <label key={member.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
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
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                  {member.name} ({member.role})
                                </span>
                              </label>
                            ))}
                          </div>
                          {editForm.assigned_members.length > 0 && (
                            <p className="text-xs text-gray-600 mt-1">
                              {editForm.assigned_members.length} member(s) selected. Tasks will be created for each.
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comments
                          </label>
                          <textarea
                            value={editForm.comments}
                            onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Add comments or notes for this stage..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Attachments
                          </label>
                          <FileUpload
                            files={editForm.attachments}
                            onChange={(files) => setEditForm(prev => ({ ...prev, attachments: files }))}
                            maxFiles={3}
                            maxSize={5}
                            className="text-sm"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveStage(stage.id)}
                            className="flex items-center space-x-1"
                            disabled={editForm.assigned_members.length === 0}
                          >
                            <Save className="w-4 h-4" />
                            <span>Save & Create Tasks</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingStage(null)}
                            className="flex items-center space-x-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {stage.estimated_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Est: {format(new Date(stage.estimated_date), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                          
                          {stage.actual_date && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Completed: {format(new Date(stage.actual_date), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                          
                          {stage.priority && (
                            <div className="flex items-center space-x-1">
                              <Star className={`w-4 h-4 ${
                                stage.priority === 'urgent' ? 'text-red-500' :
                                stage.priority === 'high' ? 'text-orange-500' :
                                stage.priority === 'medium' ? 'text-yellow-500' : 'text-gray-500'
                              }`} />
                              <span className="capitalize">{stage.priority} Priority</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Assigned Members */}
                        {stageAssignments[stage.id] && stageAssignments[stage.id].length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-700 mb-1">Assigned Team Members:</div>
                            <div className="flex flex-wrap gap-1">
                              {stageAssignments[stage.id].map(assignment => (
                                <span
                                  key={assignment.id}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                >
                                  <User className="w-3 h-3 mr-1" />
                                  {assignment.member_name}
                                  {assignment.task_id && (
                                    <span className="ml-1 text-green-600" title="Task created">✓</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Details */}
                        {stageAssignments[stage.id] && stageAssignments[stage.id].some(a => a.task_id) && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 mb-2">Associated Tasks:</div>
                            <div className="space-y-2">
                              {stageAssignments[stage.id]
                                .filter(assignment => assignment.task_id)
                                .map(assignment => (
                                  <div key={assignment.task_id} className="p-3 bg-white rounded border">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                          assignment.task_status === 'completed' ? 'bg-green-500' :
                                          assignment.task_status === 'in_progress' ? 'bg-blue-500' :
                                          'bg-gray-400'
                                        }`}></div>
                                        <span className="text-sm font-medium text-gray-900">
                                          {assignment.task_name || `Task for ${assignment.member_name}`}
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
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Attachments */}
                        {stage.attachments && stage.attachments.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-1 text-xs text-gray-600">
                              <Paperclip className="w-3 h-3" />
                              <span>{stage.attachments.length} attachment(s)</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Comments */}
                        {stage.comments && (
                          <div className="flex items-start space-x-1 text-sm text-gray-600 mt-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p className="flex-1">{stage.comments}</p>
                          </div>
                        )}
                      </div>
                    )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2 mt-3">
                          {editingStage !== stage.id && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEditStage(stage)}
                              className="flex items-center space-x-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </Button>
                          )}
                          
                          {stage.status === 'in_progress' && editingStage !== stage.id && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkComplete(stage.id, stage.stage_order)}
                              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Complete</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalDealTimeline;
