import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, CheckCircle, Clock, MessageSquare, Edit2, Save, X, UserPlus, Star, Paperclip } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import FileUpload from '../ui/FileUpload';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';

interface ResaleDealTimelineProps {
  dealId: string;
  onBack: () => void;
}

interface DealStage {
  id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
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
  member_id: string | null;
  broker_id?: string | null;
  member_name: string;
  broker_name?: string;
  task_id?: string;
  priority: string;
  attachments: any[];
  assigned_at: string;
  task_name?: string;
  task_status?: string;
  task_priority?: string;
  task_due_date?: string;
  task_description?: string;
  task_progress?: number;
  tasks?: {
    id: string;
    task_name: string;
    status: string;
    priority: string;
    due_date: string;
    description: string;
    progress: number;
    assigned_user_ids: string[];
    broker_id?: string;
  };
}

interface DealInfo {
  id: string;
  project_name: string;
  deal_type: string;
  owner_name: string;
  buyer_name: string;
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

interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

const ResaleDealTimeline: React.FC<ResaleDealTimelineProps> = ({ dealId, onBack }) => {
  const { user } = useAuth();
  const [dealInfo, setDealInfo] = useState<DealInfo | null>(null);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dealTeamMembers, setDealTeamMembers] = useState<TeamMember[]>([]);
  const [admins, setAdmins] = useState<TeamMember[]>([]);
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [stageAssignments, setStageAssignments] = useState<Record<string, StageAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    estimated_date: '',
    assigned_to: '',
    assigned_members: [] as string[],
    assigned_to_id: '', // For assignee selection (member_id or broker_id)
    priority: 'medium',
    comments: '',
    attachments: [] as any[]
  });

  useEffect(() => {
    fetchDealData();
    fetchTeamMembers();
    fetchAdminsAndPMs();
  }, [dealId]);

  // Real-time subscription for task status changes and new assignments
  useEffect(() => {
    if (!dealId || !stages.length) return;

    const channel = supabase
      .channel('resale-deal-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: dealInfo?.project_id ? `project_id=eq.${dealInfo.project_id}` : undefined
        },
        (payload) => {
          console.log('Task status changed:', payload);
          stages.forEach(stage => {
            checkAndUpdateStageCompletion(stage.id);
          });
          // Refresh assignments when task is updated
          fetchDealData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: dealInfo?.project_id ? `project_id=eq.${dealInfo.project_id}` : undefined
        },
        (payload) => {
          console.log('Task deleted:', payload);
          // Refresh assignments when task is deleted
          fetchDealData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'resale_stage_assignments'
        },
        (payload) => {
          console.log('New assignment created:', payload);
          // Check if this assignment is for one of our stages
          if (stages.some(s => s.id === payload.new.stage_id)) {
            // Refresh assignments when new assignment is created
            fetchDealData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resale_stage_assignments'
        },
        (payload) => {
          console.log('Assignment updated:', payload);
          // Check if this assignment is for one of our stages
          if (stages.some(s => s.id === payload.new.stage_id)) {
            fetchDealData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'resale_stage_assignments'
        },
        (payload) => {
          console.log('Assignment deleted:', payload);
          // Check if this assignment was for one of our stages
          if (stages.some(s => s.id === payload.old.stage_id)) {
            fetchDealData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, dealInfo?.project_id, stages.length]);

  const fetchDealData = async () => {
    try {
      // Don't set loading to true if we're just refreshing (not initial load)
      const isInitialLoad = !dealInfo;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const { data: deal, error: dealError } = await supabase
        .from('resale_deals')
        .select('id, project_name, deal_type, owner_name, buyer_name, property_address, current_stage, project_id, start_date, end_date, broker_id, broker_name, broker_email, broker_phone')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      setDealInfo({
        id: deal.id,
        project_name: deal.project_name,
        deal_type: deal.deal_type,
        owner_name: deal.owner_name,
        buyer_name: deal.buyer_name,
        property_address: deal.property_address,
        current_stage: deal.current_stage,
        project_id: deal.project_id,
        start_date: deal.start_date,
        end_date: deal.end_date
      });

      // Fetch broker information if broker_id exists
      if (deal.broker_id && deal.broker_name) {
        setBroker({
          id: deal.broker_id,
          name: deal.broker_name,
          email: deal.broker_email || undefined,
          phone: deal.broker_phone || undefined
        });
      } else if (deal.broker_name) {
        // If broker name exists but no ID, create a temporary broker object
        setBroker({
          id: `broker-${dealId}`,
          name: deal.broker_name,
          email: deal.broker_email || undefined,
          phone: deal.broker_phone || undefined
        });
      }

      const { data: dealTeamData, error: dealTeamError } = await supabase
        .from('resale_deal_team_members')
        .select(`
          member_id,
          members!resale_deal_team_members_member_id_fkey(id, name, email, role, department)
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

      const { data: stagesData, error: stagesError } = await supabase
        .from('resale_deal_stages')
        .select('*')
        .eq('deal_id', dealId)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData);

      // Fetch assignments only if we have stages
      if (!stagesData || stagesData.length === 0) {
        setStageAssignments({});
        setLoading(false);
        return;
      }

      try {
        // Fetch assignments without foreign key joins (to handle admins/PMs)
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('resale_stage_assignments')
          .select(`
            id,
            stage_id,
            member_id,
            broker_id,
            task_id,
            priority,
            attachments,
            assigned_at,
            tasks:task_id(
              id,
              task_name,
              status,
              priority,
              due_date,
              description,
              progress,
              assigned_user_ids,
              broker_id
            )
          `)
          .in('stage_id', stagesData.map(s => s.id));

        if (assignmentsError) {
          console.warn('Stage assignments not available:', assignmentsError);
          setStageAssignments({});
        } else {
          // Get all unique member_ids and broker_ids from assignments
          const memberIds = [...new Set((assignmentsData || []).map(a => a.member_id).filter(id => id))];
          const brokerIds = [...new Set((assignmentsData || []).map(a => a.broker_id).filter(id => id))];
          
          console.log('Fetched assignments:', assignmentsData);
          console.log('Member IDs:', memberIds);
          console.log('Broker IDs:', brokerIds);
          
          // Fetch member, admin, PM, and broker names separately
          const [membersData, adminsData, pmData, brokersData] = await Promise.all([
            memberIds.length > 0 ? supabase.from('members').select('id, name').in('id', memberIds) : { data: [] },
            memberIds.length > 0 ? supabase.from('admins').select('id, name').in('id', memberIds) : { data: [] },
            memberIds.length > 0 ? supabase.from('project_managers').select('id, name').in('id', memberIds) : { data: [] },
            brokerIds.length > 0 ? supabase.from('brokers').select('id, name, email, phone').in('id', brokerIds) : { data: [] }
          ]);
          
          console.log('Members data:', membersData.data);
          console.log('Admins data:', adminsData.data);
          console.log('PMs data:', pmData.data);
          console.log('Brokers data:', brokersData.data);

          // Create maps for quick lookup
          const nameMap = new Map<string, string>();
          (membersData.data || []).forEach(m => nameMap.set(m.id, m.name));
          (adminsData.data || []).forEach(a => nameMap.set(a.id, a.name));
          (pmData.data || []).forEach(pm => nameMap.set(pm.id, pm.name));
          const brokerMap = new Map<string, { name: string; email?: string; phone?: string }>();
          (brokersData.data || []).forEach(b => brokerMap.set(b.id, b));

          const assignmentsByStage: Record<string, StageAssignment[]> = {};
          (assignmentsData || []).forEach(assignment => {
            // Only include assignments where the task still exists
            // If task is deleted, assignment.tasks will be null
            if (!assignment.tasks || !assignment.task_id) {
              // Skip assignments with deleted tasks
              return;
            }
            
            if (!assignmentsByStage[assignment.stage_id]) {
              assignmentsByStage[assignment.stage_id] = [];
            }
            
            // Get assignee name - check broker first, then member/admin/PM
            let assigneeName = 'Unknown';
            if (assignment.broker_id && brokerMap.has(assignment.broker_id)) {
              assigneeName = brokerMap.get(assignment.broker_id)!.name;
            } else if (assignment.member_id && nameMap.has(assignment.member_id)) {
              assigneeName = nameMap.get(assignment.member_id)!;
            } else if (assignment.task_id && assignment.tasks?.broker_id && brokerMap.has(assignment.tasks.broker_id)) {
              // Fallback: if task has broker_id, use broker name
              assigneeName = brokerMap.get(assignment.tasks.broker_id)!.name;
            }
            
            assignmentsByStage[assignment.stage_id].push({
              id: assignment.id,
              stage_id: assignment.stage_id,
              member_id: assignment.member_id,
              broker_id: assignment.broker_id,
              member_name: assigneeName,
              broker_name: assignment.broker_id ? brokerMap.get(assignment.broker_id)?.name : undefined,
              task_id: assignment.task_id,
              priority: assignment.priority,
              attachments: assignment.attachments || [],
              assigned_at: assignment.assigned_at,
              task_name: assignment.tasks?.task_name,
              task_status: assignment.tasks?.status,
              task_priority: assignment.tasks?.priority,
              task_due_date: assignment.tasks?.due_date,
              task_description: assignment.tasks?.description,
              task_progress: assignment.tasks?.progress,
              tasks: assignment.tasks
            });
          });
          
          console.log('Setting stage assignments:', assignmentsByStage);
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
        .select('id, name, email, role, department')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const transformedData = (data || []).map(member => ({
        ...member,
        role: member.department || member.role || 'Team Member'
      }));
      
      setTeamMembers(transformedData);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    }
  };

  const fetchAdminsAndPMs = async () => {
    try {
      const [adminsData, projectManagersData] = await Promise.all([
        authService.getAdmins(),
        authService.getProjectManagers()
      ]);

      const adminsFormatted = adminsData.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email || '',
        role: 'Admin'
      }));

      const pmFormatted = projectManagersData.map(pm => ({
        id: pm.id,
        name: pm.name,
        email: pm.email || '',
        role: 'Project Manager'
      }));

      setAdmins(adminsFormatted);
      setProjectManagers(pmFormatted);
    } catch (error) {
      console.error('Error fetching admins and PMs:', error);
      toast.error('Failed to load admins and project managers');
    }
  };

  const checkAndUpdateStageCompletion = async (stageId: string) => {
    try {
      const assignments = stageAssignments[stageId] || [];
      const tasksWithStatus = assignments.filter(a => a.task_id && a.tasks);
      
      if (tasksWithStatus.length === 0) return;

      const allTasksCompleted = tasksWithStatus.every(a => 
        a.task_status === 'completed' || a.task_status === 'done'
      );

      if (allTasksCompleted) {
        const { error } = await supabase
          .from('resale_deal_stages')
          .update({ 
            status: 'completed',
            actual_end_date: new Date().toISOString()
          })
          .eq('id', stageId);

        if (!error) {
          setStages(prev => prev.map(s => 
            s.id === stageId ? { ...s, status: 'completed', actual_end_date: new Date().toISOString() } : s
          ));
          toast.success('Stage completed automatically!');
        }
      }
    } catch (error) {
      console.error('Error checking stage completion:', error);
    }
  };

  const handleStageStatusChange = async (stageId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'in_progress') {
        updateData.actual_start_date = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.actual_end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('resale_deal_stages')
        .update(updateData)
        .eq('id', stageId);

      if (error) throw error;

      setStages(prev => prev.map(stage => 
        stage.id === stageId ? { ...stage, ...updateData } : stage
      ));

      toast.success('Stage status updated');
    } catch (error) {
      console.error('Error updating stage status:', error);
      toast.error('Failed to update stage status');
    }
  };

  const handleEditStage = (stage: DealStage) => {
    setEditingStage(stage.id);
    
    // Get current assignment for this stage
    const currentAssignment = stageAssignments[stage.id]?.[0];
    let currentAssigneeId = '';
    
    if (currentAssignment) {
      // If assignment has broker_id, use that; otherwise use member_id
      currentAssigneeId = currentAssignment.broker_id || currentAssignment.member_id || '';
    }
    
    setEditForm({
      estimated_date: stage.estimated_date || '',
      assigned_to: stage.assigned_to || '',
      assigned_members: stage.assigned_members || [],
      assigned_to_id: currentAssigneeId, // Set current assignee
      priority: stage.priority || 'medium',
      comments: stage.comments || '',
      attachments: stage.attachments || []
    });
  };

  const handleSaveStage = async (stageId: string) => {
    try {
      // Update the stage
      const { error } = await supabase
        .from('resale_deal_stages')
        .update({
          estimated_date: editForm.estimated_date || null,
          assigned_to: editForm.assigned_to || null,
          assigned_members: editForm.assigned_members,
          priority: editForm.priority,
          comments: editForm.comments,
          attachments: editForm.attachments
        })
        .eq('id', stageId);

      if (error) throw error;

      // Update assignee if it has changed
      const currentAssignment = stageAssignments[stageId]?.[0];
      const newAssigneeId = editForm.assigned_to_id;
      
      if (currentAssignment && newAssigneeId && newAssigneeId !== (currentAssignment.broker_id || currentAssignment.member_id)) {
        // Check if new assignee is a broker
        const isBroker = newAssigneeId === broker?.id;
        const isMember = dealTeamMembers.some(m => m.id === newAssigneeId);
        const isAdmin = admins.some(a => a.id === newAssigneeId);
        const isPM = projectManagers.some(pm => pm.id === newAssigneeId);
        
        if (isBroker && broker) {
          // Update task to assign to broker
          if (currentAssignment.task_id) {
            const dueDate = editForm.estimated_date || stages.find(s => s.id === stageId)?.estimated_date || 
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const { error: taskError } = await supabase
              .from('tasks')
              .update({
                broker_id: broker.id,
                user_id: null,
                assigned_user_ids: [],
                due_date: dueDate,
                priority: editForm.priority || 'medium'
              })
              .eq('id', currentAssignment.task_id);
            
            if (taskError) throw taskError;
            
            // Update stage assignment
            const { error: assignmentError } = await supabase
              .from('resale_stage_assignments')
              .update({
                broker_id: broker.id,
                member_id: null,
                priority: editForm.priority || 'medium'
              })
              .eq('id', currentAssignment.id);
            
            if (assignmentError) throw assignmentError;
          }
        } else if (isMember || isAdmin || isPM) {
          // Update task to assign to member/admin/PM
          if (currentAssignment.task_id) {
            const dueDate = editForm.estimated_date || stages.find(s => s.id === stageId)?.estimated_date || 
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const { error: taskError } = await supabase
              .from('tasks')
              .update({
                user_id: newAssigneeId,
                broker_id: null,
                assigned_user_ids: [newAssigneeId],
                due_date: dueDate,
                priority: editForm.priority || 'medium'
              })
              .eq('id', currentAssignment.task_id);
            
            if (taskError) throw taskError;
            
            // Update stage assignment
            const { error: assignmentError } = await supabase
              .from('resale_stage_assignments')
              .update({
                member_id: newAssigneeId,
                broker_id: null,
                priority: editForm.priority || 'medium'
              })
              .eq('id', currentAssignment.id);
            
            if (assignmentError) throw assignmentError;
          }
        }
      }

      setStages(prev => prev.map(stage => 
        stage.id === stageId ? { ...stage, ...editForm } : stage
      ));

      setEditingStage(null);
      toast.success('Stage updated successfully');
      
      // Refresh data to show updated assignment
      await fetchDealData();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  const handleAddTask = async (stageId: string, assigneeId: string) => {
    if (!dealInfo?.project_id) {
      toast.error('Project not found');
      return;
    }

    try {
      const stage = stages.find(s => s.id === stageId);
      
      if (!stage) return;

      // Check if assignee is a broker
      const isBroker = assigneeId.startsWith('broker-') || (broker && broker.id === assigneeId);
      let taskData: any;

      if (isBroker && broker) {
        // Assign task to broker
        // Ensure due_date is set (use estimated_date or default to 7 days from now)
        const dueDate = editForm.estimated_date || stage.estimated_date || 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error: taskError } = await supabase
          .from('tasks')
          .insert([{
            task_name: stage.stage_name,
            description: `Task for ${stage.stage_name} - Broker: ${broker.name}`,
            status: 'pending',
            priority: editForm.priority || 'medium',
            broker_id: broker.id,
            project_id: dealInfo.project_id,
            created_by: user?.id,
            due_date: dueDate
          }])
          .select()
          .single();

        if (taskError) throw taskError;
        taskData = data;

        // Create stage assignment with broker info
        const { error: assignmentError } = await supabase
          .from('resale_stage_assignments')
          .insert([{
            stage_id: stageId,
            member_id: null, // No member_id for brokers
            broker_id: broker.id, // Set broker_id
            task_id: taskData.id,
            priority: editForm.priority || 'medium'
          }]);

        if (assignmentError) throw assignmentError;
      } else {
        // Assign task to member/admin/PM
        const member = teamMembers.find(m => m.id === assigneeId) || 
                       admins.find(a => a.id === assigneeId) || 
                       projectManagers.find(pm => pm.id === assigneeId);
        
        if (!member) {
          toast.error('Assignee not found');
          return;
        }

        // Ensure due_date is set (use estimated_date or default to 7 days from now)
        const dueDate = editForm.estimated_date || stage.estimated_date || 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error: taskError } = await supabase
          .from('tasks')
          .insert([{
            task_name: stage.stage_name,
            description: `Task for ${stage.stage_name}`,
            status: 'pending',
            priority: editForm.priority || 'medium',
            user_id: assigneeId,
            project_id: dealInfo.project_id,
            created_by: user?.id,
            assigned_user_ids: [assigneeId],
            due_date: dueDate
          }])
          .select()
          .single();

        if (taskError) throw taskError;
        taskData = data;

        // Create stage assignment for member
        const { error: assignmentError } = await supabase
          .from('resale_stage_assignments')
          .insert([{
            stage_id: stageId,
            member_id: assigneeId,
            task_id: taskData.id,
            priority: editForm.priority || 'medium'
          }]);

        if (assignmentError) throw assignmentError;
      }

      toast.success('Task assigned successfully');
      // Refresh data immediately
      await fetchDealData();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
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
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timeline...</p>
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {dealInfo?.project_name}
            </h1>
            <p className="text-gray-600 mt-1">
              Owner: {dealInfo?.owner_name} | Buyer: {dealInfo?.buyer_name}
            </p>
          </div>
        </div>

        {/* Deal Info Card */}
        <Card className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Deal Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{dealInfo?.deal_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Property Address</p>
              <p className="text-lg font-semibold text-gray-900">{dealInfo?.property_address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {dealInfo?.start_date ? format(new Date(dealInfo.start_date), 'MMM dd, yyyy') : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((dealInfo?.current_stage || 0) / stages.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {dealInfo?.current_stage || 0}/{stages.length}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stages Timeline */}
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <Card key={stage.id} className="p-6">
              <div className="flex items-start space-x-4">
                {/* Stage Number */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    stage.status === 'completed' 
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : stage.status === 'in_progress'
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}>
                    {stage.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{stage.stage_order}</span>
                    )}
                  </div>
                </div>

                {/* Stage Content */}
                <div className="flex-1 space-y-4">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{stage.stage_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(stage.status)}`}>
                          {stage.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {stage.priority && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                            stage.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                            stage.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {stage.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {editingStage === stage.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingStage(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveStage(stage.id)}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditStage(stage)}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          {stage.status !== 'completed' && (
                            <Button
                              size="sm"
                              onClick={() => handleStageStatusChange(
                                stage.id,
                                stage.status === 'pending' ? 'in_progress' : 'completed'
                              )}
                            >
                              {stage.status === 'pending' ? 'Start' : 'Complete'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editingStage === stage.id && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Date
                          </label>
                          <input
                            type="date"
                            value={editForm.estimated_date}
                            onChange={(e) => setEditForm(prev => ({ ...prev, estimated_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Assignee Selection - Only show if task is assigned */}
                      {stageAssignments[stage.id] && stageAssignments[stage.id].length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assignee
                          </label>
                          <select
                            value={editForm.assigned_to_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, assigned_to_id: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select assignee...</option>
                            {dealTeamMembers.length > 0 && (
                              <optgroup label="Team Members">
                                {dealTeamMembers.map(member => (
                                  <option key={member.id} value={member.id}>
                                    {member.name} ({member.role})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {admins.length > 0 && (
                              <optgroup label="Admins">
                                {admins.map(admin => (
                                  <option key={admin.id} value={admin.id}>
                                    {admin.name} (Admin)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {projectManagers.length > 0 && (
                              <optgroup label="Project Managers">
                                {projectManagers.map(pm => (
                                  <option key={pm.id} value={pm.id}>
                                    {pm.name} (PM)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {broker && (
                              <optgroup label="Broker">
                                <option value={broker.id}>
                                  {broker.name} (Broker)
                                </option>
                              </optgroup>
                            )}
                          </select>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comments
                        </label>
                        <textarea
                          value={editForm.comments}
                          onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Add comments..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Stage Details */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {stage.estimated_date && (
                      <div>
                        <p className="text-gray-600">Estimated Date</p>
                        <p className="font-medium text-gray-900">{format(new Date(stage.estimated_date), 'MMM dd, yyyy')}</p>
                      </div>
                    )}
                    {stage.comments && (
                      <div className="md:col-span-2">
                        <p className="text-gray-600">Comments</p>
                        <p className="font-medium text-gray-900">{stage.comments}</p>
                      </div>
                    )}
                  </div>

                  {/* Assigned Tasks */}
                  {stageAssignments[stage.id] && stageAssignments[stage.id].length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">Assigned Tasks</h4>
                      <div className="space-y-2">
                        {stageAssignments[stage.id].map(assignment => (
                          <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{assignment.member_name}</p>
                              {assignment.task_name && (
                                <p className="text-sm text-gray-600">{assignment.task_name}</p>
                              )}
                              {assignment.task_status && (
                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                  assignment.task_status === 'completed' || assignment.task_status === 'done'
                                    ? 'bg-green-100 text-green-800'
                                    : assignment.task_status === 'in-progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.task_status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Task - Only show if no task is assigned yet */}
                  {stage.status !== 'completed' && (!stageAssignments[stage.id] || stageAssignments[stage.id].length === 0) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Assign Task</h4>
                      <div className="flex items-center space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddTask(stage.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select assignee...</option>
                          {dealTeamMembers.length > 0 && (
                            <optgroup label="Team Members">
                              {dealTeamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                              ))}
                            </optgroup>
                          )}
                          {admins.length > 0 && (
                            <optgroup label="Admins">
                              {admins.map(admin => (
                                <option key={admin.id} value={admin.id}>{admin.name} (Admin)</option>
                              ))}
                            </optgroup>
                          )}
                          {projectManagers.length > 0 && (
                            <optgroup label="Project Managers">
                              {projectManagers.map(pm => (
                                <option key={pm.id} value={pm.id}>{pm.name} (PM)</option>
                              ))}
                            </optgroup>
                          )}
                          {broker && (
                            <optgroup label="Broker">
                              <option value={broker.id}>{broker.name} (Broker)</option>
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {/* Edit Task Assignment - Show when task is assigned */}
                  {stage.status !== 'completed' && stageAssignments[stage.id] && stageAssignments[stage.id].length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Task Assignment</h4>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            // Delete existing assignment and allow reassignment
                            const assignment = stageAssignments[stage.id][0];
                            if (assignment.task_id) {
                              // Option: Delete task and assignment, or just assignment
                              // For now, just allow editing by clicking edit button
                              handleEditStage(stage);
                            }
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit Assignee
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResaleDealTimeline;

