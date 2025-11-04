import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Users, Calendar, DollarSign, FileText, User, Home } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import RentalDealTimeline from './RentalDealTimeline';
import AutocompleteInput from '../ui/AutocompleteInput';
import NewClientModal from '../ui/NewClientModal';
import NewOwnerModal from '../ui/NewOwnerModal';
import NewBrokerModal from '../ui/NewBrokerModal';

interface RentalDealFormProps {
  dealType: 'residential' | 'commercial';
  onBack: () => void;
  editDealId?: string; // Optional deal ID for editing
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company_name?: string;
  license_number?: string;
}

interface DealFormData {
  project_name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_address: string;
  property_address: string;
  property_type: string;
  rental_amount: string;
  security_deposit: string;
  brokerage_amount: string;
  start_date: string;
  end_date: string;
  team_members: string[];
  additional_notes: string;
  client_id?: string;
  owner_id?: string;
  project_manager_id?: string;
  is_client_broker: boolean;
  broker_id?: string;
  broker_name: string;
  broker_email: string;
  broker_phone: string;
  broker_address: string;
  broker_company_name: string;
  broker_license_number: string;
}

const RentalDealForm: React.FC<RentalDealFormProps> = ({ dealType, onBack, editDealId }) => {
  const [formData, setFormData] = useState<DealFormData>({
    project_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_address: '',
    property_address: '',
    property_type: dealType === 'residential' ? 'Apartment' : 'Office Space',
    rental_amount: '',
    security_deposit: '',
    brokerage_amount: '',
    start_date: '',
    end_date: '',
    team_members: [],
    additional_notes: '',
    project_manager_id: '',
    is_client_broker: false,
    broker_name: '',
    broker_email: '',
    broker_phone: '',
    broker_address: '',
    broker_company_name: '',
    broker_license_number: ''
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [createdDealId, setCreatedDealId] = useState<string | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewOwnerModal, setShowNewOwnerModal] = useState(false);
  const [showNewBrokerModal, setShowNewBrokerModal] = useState(false);
  const [pendingClientName, setPendingClientName] = useState('');
  const [pendingOwnerName, setPendingOwnerName] = useState('');
  const [pendingBrokerName, setPendingBrokerName] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    fetchTeamMembers();
    fetchClients();
    fetchOwners();
    fetchBrokers();
    fetchProjectManagers();
  }, []);

  // Load deal data for editing
  useEffect(() => {
    if (editDealId) {
      loadDealForEdit();
    }
  }, [editDealId]);

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
      toast.error('Failed to load team members');
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, address')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      setOwnersLoading(true);
      const { data, error } = await supabase
        .from('owners')
        .select('id, name, email, phone, address')
        .order('name');

      if (error) throw error;
      setOwners(data || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast.error('Failed to load owners');
    } finally {
      setOwnersLoading(false);
    }
  };

  const fetchBrokers = async () => {
    try {
      setBrokersLoading(true);
      const { data, error } = await supabase
        .from('brokers')
        .select('id, name, email, phone, address, company_name, license_number')
        .order('name');

      if (error) throw error;
      setBrokers(data || []);
    } catch (error) {
      console.error('Error fetching brokers:', error);
      toast.error('Failed to load brokers');
    } finally {
      setBrokersLoading(false);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_managers')
        .select('id, name, email, phone')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to match our expected interface
      const transformedData = (data || []).map(pm => ({
        id: pm.id,
        name: pm.name,
        email: pm.email,
        role: 'Project Manager'
      }));
      
      setProjectManagers(transformedData);
    } catch (error) {
      console.error('Error fetching project managers:', error);
      toast.error('Failed to load project managers');
    }
  };

  const loadDealForEdit = async () => {
    if (!editDealId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rental_deals')
        .select('*')
        .eq('id', editDealId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          project_name: data.project_name || '',
          client_name: data.client_name || '',
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          client_address: data.client_address || '',
          owner_name: data.owner_name || '',
          owner_email: data.owner_email || '',
          owner_phone: data.owner_phone || '',
          owner_address: data.owner_address || '',
          property_address: data.property_address || '',
          property_type: data.property_type || '',
          rental_amount: data.rental_amount?.toString() || '',
          security_deposit: data.security_deposit?.toString() || '',
          brokerage_amount: data.brokerage_amount?.toString() || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          team_members: data.team_members || [],
          additional_notes: data.additional_notes || '',
          owner_id: data.owner_id,
          project_manager_id: data.project_manager_id || '',
          is_client_broker: data.is_client_broker || false,
          broker_id: data.broker_id,
          broker_name: data.broker_name || '',
          broker_email: data.broker_email || '',
          broker_phone: data.broker_phone || '',
          broker_address: data.broker_address || '',
          broker_company_name: data.broker_company_name || '',
          broker_license_number: data.broker_license_number || ''
        });
      }
    } catch (error) {
      console.error('Error loading deal for edit:', error);
      toast.error('Failed to load deal data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DealFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTeamMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.includes(memberId)
        ? prev.team_members.filter(id => id !== memberId)
        : [...prev.team_members, memberId]
    }));
  };

  const handleClientSelect = async (client: Client | null) => {
    if (!client) {
      setFormData(prev => ({ ...prev, client_id: undefined, client_email: '', client_phone: '', client_address: '' }));
      return;
    }

    if (client.id === 'new') {
      // Show modal to create new client
      setPendingClientName(client.name);
      setShowNewClientModal(true);
    } else {
      // Select existing client
      setFormData(prev => ({ 
        ...prev, 
        client_id: client.id,
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: client.address || ''
      }));
    }
  };

  const handleOwnerSelect = async (owner: Owner | null) => {
    if (!owner) {
      setFormData(prev => ({ ...prev, owner_id: undefined, owner_email: '', owner_phone: '', owner_address: '' }));
      return;
    }

    if (owner.id === 'new') {
      // Show modal to create new owner
      setPendingOwnerName(owner.name);
      setShowNewOwnerModal(true);
    } else {
      // Select existing owner
      setFormData(prev => ({ 
        ...prev, 
        owner_id: owner.id,
        owner_email: owner.email || '',
        owner_phone: owner.phone || '',
        owner_address: owner.address || ''
      }));
    }
  };

  const handleBrokerSelect = async (broker: Broker | null) => {
    if (!broker) {
      setFormData(prev => ({ 
        ...prev, 
        broker_id: undefined, 
        broker_name: '', 
        broker_email: '', 
        broker_phone: '', 
        broker_address: '',
        broker_company_name: '',
        broker_license_number: ''
      }));
      return;
    }

    if (broker.id === 'new') {
      // Show modal to create new broker
      setPendingBrokerName(broker.name);
      setShowNewBrokerModal(true);
    } else {
      // Select existing broker
      setFormData(prev => ({ 
        ...prev, 
        broker_id: broker.id,
        broker_name: broker.name,
        broker_email: broker.email || '',
        broker_phone: broker.phone || '',
        broker_address: broker.address || '',
        broker_company_name: broker.company_name || '',
        broker_license_number: broker.license_number || ''
      }));
    }
  };

  const handleNewClientSuccess = (client: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      client_id: client.id,
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: client.address || ''
    }));
    fetchClients(); // Refresh the clients list
    setShowNewClientModal(false);
    setPendingClientName('');
  };

  const handleNewOwnerSuccess = (owner: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      owner_id: owner.id,
      owner_email: owner.email || '',
      owner_phone: owner.phone || '',
      owner_address: owner.address || ''
    }));
    fetchOwners(); // Refresh the owners list
    setShowNewOwnerModal(false);
    setPendingOwnerName('');
  };

  const handleNewBrokerSuccess = (broker: { id: string; name: string; email?: string; phone?: string; address?: string; company_name?: string; license_number?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      broker_id: broker.id,
      broker_name: broker.name,
      broker_email: broker.email || '',
      broker_phone: broker.phone || '',
      broker_address: broker.address || '',
      broker_company_name: broker.company_name || '',
      broker_license_number: broker.license_number || ''
    }));
    fetchBrokers(); // Refresh the brokers list
    setShowNewBrokerModal(false);
    setPendingBrokerName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.project_name || !formData.owner_name || !formData.property_address) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate client/broker information based on type
      if (formData.is_client_broker) {
        // If client is broker, validate broker fields
        if (!formData.broker_name || !formData.broker_email || !formData.broker_phone) {
          toast.error('Please fill in all broker information fields');
          return;
        }
      } else {
        // If client is not broker, validate client fields
        if (!formData.client_name) {
          toast.error('Please fill in client name');
          return;
        }
      }

      let projectData: any;
      let dealData: any;
      let brokerData: any = null;

      // Create broker if client is broker and broker doesn't exist
      if (formData.is_client_broker && !formData.broker_id) {
        const { data: newBroker, error: brokerError } = await supabase
          .from('brokers')
          .insert([{
            name: formData.broker_name,
            email: formData.broker_email,
            phone: formData.broker_phone,
            address: formData.broker_address,
            company_name: formData.broker_company_name,
            license_number: formData.broker_license_number
          }])
          .select()
          .single();

        if (brokerError) throw brokerError;
        brokerData = newBroker;
        setFormData(prev => ({ ...prev, broker_id: newBroker.id }));
      }

      if (editDealId) {
        // Update existing deal
        const { data: existingDeal, error: fetchError } = await supabase
          .from('rental_deals')
          .select('project_id')
          .eq('id', editDealId)
          .single();

        if (fetchError) throw fetchError;

        // Update the project
        const clientName = formData.is_client_broker ? formData.broker_name : formData.client_name;
        const { data: updatedProject, error: projectError } = await supabase
          .from('projects')
          .update({
            name: formData.project_name,
            description: `${dealType} rental deal for ${clientName}`,
            client_name: clientName,
            start_date: formData.start_date,
            expected_end_date: formData.end_date,
            status: 'active'
          })
          .eq('id', existingDeal.project_id)
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = updatedProject;

        // Update the rental deal
        const { data: updatedDeal, error: dealError } = await supabase
          .from('rental_deals')
          .update({
            project_name: formData.project_name,
            deal_type: dealType,
            client_name: clientName,
            client_email: formData.is_client_broker ? formData.broker_email : formData.client_email,
            client_phone: formData.is_client_broker ? formData.broker_phone : formData.client_phone,
            owner_name: formData.owner_name,
            owner_email: formData.owner_email,
            owner_phone: formData.owner_phone,
            property_address: formData.property_address,
            property_type: formData.property_type,
            rental_amount: parseFloat(formData.rental_amount) || 0,
            security_deposit: parseFloat(formData.security_deposit) || 0,
            brokerage_amount: parseFloat(formData.brokerage_amount) || 0,
            start_date: formData.start_date,
            end_date: formData.end_date,
            additional_notes: formData.additional_notes,
            status: 'active',
            current_stage: 1,
            client_id: formData.client_id,
            owner_id: formData.owner_id,
            project_manager_id: formData.project_manager_id || null,
            is_client_broker: formData.is_client_broker,
            broker_id: formData.broker_id || brokerData?.id
          })
          .eq('id', editDealId)
          .select()
          .single();

        if (dealError) throw dealError;
        dealData = updatedDeal;

        // Update team member assignments
        await supabase
          .from('rental_deal_team_members')
          .delete()
          .eq('deal_id', editDealId);

        if (formData.team_members.length > 0) {
          const teamAssignments = formData.team_members.map(memberId => ({
            deal_id: editDealId,
            member_id: memberId,
            role: 'team_member'
          }));

          const { error: teamError } = await supabase
            .from('rental_deal_team_members')
            .insert(teamAssignments);

          if (teamError) throw teamError;
        }

        toast.success('Rental deal updated successfully!');
        setCreatedDealId(editDealId);
        setShowTimeline(true);
      } else {
        // Create new deal
        // First, create a project for this rental deal
        const clientName = formData.is_client_broker ? formData.broker_name : formData.client_name;
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert([{
            name: formData.project_name,
            description: `${dealType} rental deal for ${clientName}`,
            client_name: clientName,
            start_date: formData.start_date,
            expected_end_date: formData.end_date,
            status: 'active'
          }])
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = newProjectData;

        // Create the rental deal with project reference
        const { data: newDealData, error: dealError } = await supabase
          .from('rental_deals')
          .insert([{
            project_name: formData.project_name,
            deal_type: dealType,
            client_name: clientName,
            client_email: formData.is_client_broker ? formData.broker_email : formData.client_email,
            client_phone: formData.is_client_broker ? formData.broker_phone : formData.client_phone,
            owner_name: formData.owner_name,
            owner_email: formData.owner_email,
            owner_phone: formData.owner_phone,
            property_address: formData.property_address,
            property_type: formData.property_type,
            rental_amount: parseFloat(formData.rental_amount) || 0,
            security_deposit: parseFloat(formData.security_deposit) || 0,
            brokerage_amount: parseFloat(formData.brokerage_amount) || 0,
            start_date: formData.start_date,
            end_date: formData.end_date,
            additional_notes: formData.additional_notes,
            status: 'active',
            current_stage: 1,
            client_id: formData.client_id,
            owner_id: formData.owner_id,
            is_client_broker: formData.is_client_broker,
            broker_id: formData.broker_id || brokerData?.id,
            project_id: projectData.id,
            project_manager_id: formData.project_manager_id || null
          }])
          .select()
          .single();

        if (dealError) throw dealError;
        dealData = newDealData;

        // Create team member assignments for new deal
        if (formData.team_members.length > 0) {
          const teamAssignments = formData.team_members.map(memberId => ({
            deal_id: dealData.id,
            member_id: memberId,
            role: 'team_member'
          }));

          const { error: teamError } = await supabase
            .from('rental_deal_team_members')
            .insert(teamAssignments);

          if (teamError) throw teamError;
        }

        // Create initial stages for the deal
        const stages = dealType === 'residential' 
          ? [
              { name: 'Booking and Document collection', order: 1 },
              { name: 'Agreement process', order: 2 },
              { name: 'Formalities and internal work', order: 3 },
              { name: 'Move-in formalities and Handover', order: 4 },
              { name: 'Brokerage invoicing and collection', order: 5 },
              { name: 'Agreement uploading', order: 6 },
              { name: 'Renewal & other reminders', order: 7 }
            ]
          : [
              { name: 'Booking and Document collection', order: 1 },
              { name: 'Agreement process', order: 2 },
              { name: 'Formalities and internal work', order: 3 },
              { name: 'Interior work cum Rent Free period', order: 4 },
              { name: 'Move-in formalities and Handover', order: 5 },
              { name: 'Brokerage invoicing and collection', order: 6 },
              { name: 'Agreement uploading', order: 7 },
              { name: 'Renewal reminders', order: 8 }
            ];

        const stageInserts = stages.map(stage => ({
          deal_id: dealData.id,
          stage_name: stage.name,
          stage_order: stage.order,
          status: stage.order === 1 ? 'in_progress' : 'pending',
          estimated_date: null,
          actual_date: null
        }));

        const { error: stagesError } = await supabase
          .from('rental_deal_stages')
          .insert(stageInserts);

        if (stagesError) throw stagesError;

        toast.success('Rental deal created successfully!');
        setCreatedDealId(dealData.id);
        setShowTimeline(true);
      }
    } catch (error) {
      console.error('Error saving rental deal:', error);
      toast.error(`Failed to ${editDealId ? 'update' : 'create'} rental deal`);
    } finally {
      setLoading(false);
    }
  };

  if (showTimeline && createdDealId) {
    return (
      <RentalDealTimeline
        dealId={createdDealId}
        dealType={dealType}
        onBack={onBack}
      />
    );
  }

  const propertyTypes = dealType === 'residential' 
    ? ['Apartment', 'House', 'Condo', 'Villa', 'Studio', 'Other']
    : ['Office Space', 'Retail Store', 'Warehouse', 'Industrial Unit', 'Co-working Space', 'Other'];

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
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {editDealId ? 'Edit' : 'New'} {dealType} Rental Deal
            </h1>
            <p className="text-gray-600 mt-1">
              {editDealId ? 'Update the rental deal details' : 'Fill in the details to create a new rental deal'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="grid gap-6">
            {/* Project Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Project Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.project_name}
                    onChange={(e) => handleInputChange('project_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    required
                    value={formData.property_type}
                    onChange={(e) => handleInputChange('property_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Manager
                </label>
                <select
                  value={formData.project_manager_id}
                  onChange={(e) => handleInputChange('project_manager_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Project Manager</option>
                  {projectManagers.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address *
                </label>
                <textarea
                  required
                  value={formData.property_address}
                  onChange={(e) => handleInputChange('property_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter complete property address"
                />
              </div>
            </Card>

            {/* Client Information - Only show if client is NOT a broker */}
            {!formData.is_client_broker && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Client Information</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <AutocompleteInput
                    label="Client Name"
                    placeholder="Enter or select client name"
                    value={formData.client_name}
                    onChange={(value) => handleInputChange('client_name', value)}
                    onSelect={handleClientSelect}
                    options={clients}
                    loading={clientsLoading}
                    required={true}
                    icon={<User className="w-4 h-4" />}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => handleInputChange('client_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => handleInputChange('client_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client phone"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Address
                    </label>
                    <textarea
                      value={formData.client_address}
                      onChange={(e) => handleInputChange('client_address', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client address"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Is Client Broker Checkbox - Always show */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Client Type</h2>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_client_broker"
                    checked={formData.is_client_broker}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_client_broker: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="is_client_broker" className="text-sm font-medium text-gray-700">
                    Is Client a Broker?
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Check this if the client is a real estate broker. This will show broker information fields instead of client fields.
                </p>
              </div>
            </Card>

            {/* Broker Information - Only show if client is broker */}
            {formData.is_client_broker && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-orange-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Broker Information</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <AutocompleteInput
                    label="Broker Name"
                    placeholder="Enter or select broker name"
                    value={formData.broker_name}
                    onChange={(value) => handleInputChange('broker_name', value)}
                    onSelect={handleBrokerSelect}
                    options={brokers}
                    loading={brokersLoading}
                    required={true}
                    icon={<User className="w-4 h-4" />}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Broker Email
                    </label>
                    <input
                      type="email"
                      value={formData.broker_email}
                      onChange={(e) => handleInputChange('broker_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter broker email"
                      required={formData.is_client_broker}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Broker Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.broker_phone}
                      onChange={(e) => handleInputChange('broker_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter broker phone"
                      required={formData.is_client_broker}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.broker_company_name}
                      onChange={(e) => handleInputChange('broker_company_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={formData.broker_license_number}
                      onChange={(e) => handleInputChange('broker_license_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter license number"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Broker Address
                    </label>
                    <textarea
                      value={formData.broker_address}
                      onChange={(e) => handleInputChange('broker_address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter broker address"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Owner Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Home className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Owner Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <AutocompleteInput
                  label="Owner Name"
                  placeholder="Enter or select owner name"
                  value={formData.owner_name}
                  onChange={(value) => handleInputChange('owner_name', value)}
                  onSelect={handleOwnerSelect}
                  options={owners}
                  loading={ownersLoading}
                  required={true}
                  icon={<Home className="w-4 h-4" />}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter owner email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.owner_phone}
                    onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter owner phone"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Address
                  </label>
                  <textarea
                    value={formData.owner_address}
                    onChange={(e) => handleInputChange('owner_address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter owner address"
                  />
                </div>
              </div>
            </Card>

            {/* Financial Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                <h2 className="text-xl font-semibold text-gray-900">Financial Information</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rental Amount *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.rental_amount}
                    onChange={(e) => handleInputChange('rental_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter rental amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit
                  </label>
                  <input
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) => handleInputChange('security_deposit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter security deposit"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brokerage Amount
                  </label>
                  <input
                    type="number"
                    value={formData.brokerage_amount}
                    onChange={(e) => handleInputChange('brokerage_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter brokerage amount"
                  />
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Timeline</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </Card>

            {/* Team Members */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map(member => (
                  <label key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.team_members.includes(member.id)}
                      onChange={() => handleTeamMemberToggle(member.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {member.role}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Additional Notes */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Additional Notes</h2>
              </div>
              
              <textarea
                value={formData.additional_notes}
                onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional notes or special requirements..."
              />
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? (editDealId ? 'Updating Deal...' : 'Creating Deal...') : (editDealId ? 'Update Deal' : 'Create Deal')}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* New Client Modal */}
      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => {
          setShowNewClientModal(false);
          setPendingClientName('');
        }}
        onSuccess={handleNewClientSuccess}
        initialName={pendingClientName}
      />

      {/* New Owner Modal */}
      <NewOwnerModal
        isOpen={showNewOwnerModal}
        onClose={() => {
          setShowNewOwnerModal(false);
          setPendingOwnerName('');
        }}
        onSuccess={handleNewOwnerSuccess}
        initialName={pendingOwnerName}
      />

      {/* New Broker Modal */}
      <NewBrokerModal
        isOpen={showNewBrokerModal}
        onClose={() => {
          setShowNewBrokerModal(false);
          setPendingBrokerName('');
        }}
        onSuccess={handleNewBrokerSuccess}
        initialName={pendingBrokerName}
      />
    </div>
  );
};

export default RentalDealForm;
