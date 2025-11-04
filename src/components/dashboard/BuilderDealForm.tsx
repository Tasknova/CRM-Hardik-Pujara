import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import AutocompleteInput from '../ui/AutocompleteInput';
import NewClientModal from '../ui/NewClientModal';
import NewBuilderModal from '../ui/NewBuilderModal';
import NewLoanProviderModal from '../ui/NewLoanProviderModal';
import { toast } from 'sonner';

interface Builder {
  id: string;
  name: string;
  location: string;
  employees: any[];
}

interface Client {
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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

interface LoanProvider {
  id: string;
  provider_name: string;
  address?: string;
  contact_details?: any;
  employees?: any[];
}

interface DealFormData {
  project_name: string;
  deal_type: 'residential' | 'commercial';
  property_type: string;
  property_address: string;
  property_area: string;
  property_price: string;
  project_manager_id?: string;
  
  // Builder information
  builder_id?: string;
  builder_name: string;
  builder_location: string;
  
  // Client information
  client_id?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  
  // Broker information
  is_client_broker: boolean;
  broker_id?: string;
  broker_name: string;
  broker_email: string;
  broker_phone: string;
  broker_address: string;
  broker_company_name: string;
  broker_license_number: string;
  
  // Deal details
  commission_percentage: string;
  commission_amount: string;
  booking_amount: string;
  has_loan: boolean;
  loan_amount: string;
  loan_provider_id: string;
  loan_provider_name: string;
  loan_provider_contact: string;
  
  // Timeline
  start_date: string;
  end_date: string;
  
  // Team
  selected_members: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface BuilderDealFormProps {
  dealType: 'residential' | 'commercial';
  onBack: () => void;
  onSuccess: () => void;
  editDealId?: string; // Optional deal ID for editing
}

const BuilderDealForm: React.FC<BuilderDealFormProps> = ({ dealType, onBack, onSuccess, editDealId }) => {
  const [formData, setFormData] = useState<DealFormData>({
    project_name: '',
    deal_type: dealType,
    property_type: '',
    property_address: '',
    property_area: '',
    property_price: '',
    project_manager_id: '',
    builder_id: undefined,
    builder_name: '',
    builder_location: '',
    client_id: undefined,
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    is_client_broker: false,
    broker_name: '',
    broker_email: '',
    broker_phone: '',
    broker_address: '',
    broker_company_name: '',
    broker_license_number: '',
    commission_percentage: '',
    commission_amount: '',
    booking_amount: '',
    has_loan: false,
    loan_amount: '',
    loan_provider_id: '',
    loan_provider_name: '',
    loan_provider_contact: '',
    start_date: '',
    end_date: '',
    selected_members: [],
    priority: 'medium'
  });

  const [builders, setBuilders] = useState<Builder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loanProviders, setLoanProviders] = useState<LoanProvider[]>([]);
  const [projectManagers, setProjectManagers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewBuilderModal, setShowNewBuilderModal] = useState(false);
  const [showNewLoanProviderModal, setShowNewLoanProviderModal] = useState(false);
  const [showNewBrokerModal, setShowNewBrokerModal] = useState(false);
  const [pendingClientName, setPendingClientName] = useState('');
  const [pendingBuilderName, setPendingBuilderName] = useState('');
  const [pendingLoanProviderName, setPendingLoanProviderName] = useState('');
  const [pendingBrokerName, setPendingBrokerName] = useState('');

  useEffect(() => {
    fetchBuilders();
    fetchClients();
    fetchBrokers();
    fetchTeamMembers();
    fetchLoanProviders();
    fetchProjectManagers();
  }, []);

  // Load deal data for editing
  useEffect(() => {
    if (editDealId) {
      loadDealForEdit();
    }
  }, [editDealId]);

  const fetchBuilders = async () => {
    try {
      const { data, error } = await supabase
        .from('builders')
        .select('id, name, location, employees')
        .order('name');

      if (error) throw error;
      setBuilders(data || []);
    } catch (error) {
      console.error('Error fetching builders:', error);
      toast.error('Failed to fetch builders');
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, address')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
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
      console.log('Team members fetched:', data);
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to fetch team members');
    }
  };

  const fetchLoanProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_providers')
        .select('*')
        .order('provider_name');

      if (error) throw error;
      console.log('Loan providers fetched:', data);
      setLoanProviders(data || []);
    } catch (error) {
      console.error('Error fetching loan providers:', error);
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
    }
  };

  const loadDealForEdit = async () => {
    if (!editDealId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('builder_deals')
        .select('*')
        .eq('id', editDealId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          project_name: data.project_name || '',
          deal_type: data.deal_type || dealType,
          property_type: data.property_type || '',
          property_address: data.property_address || '',
          property_area: data.property_area || '',
          property_price: data.property_price || '',
          project_manager_id: data.project_manager_id || '',
          builder_id: data.builder_id,
          builder_name: data.builder_name || '',
          builder_location: data.builder_location || '',
          client_id: data.client_id,
          client_name: data.client_name || '',
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          client_address: data.client_address || '',
          commission_percentage: data.commission_percentage || '',
          commission_amount: data.commission_amount || '',
          booking_amount: data.booking_amount || '',
          has_loan: data.has_loan || false,
          loan_amount: data.loan_amount || '',
          loan_provider_id: data.loan_provider_id || '',
          loan_provider_name: data.loan_provider_name || '',
          loan_provider_contact: data.loan_provider_contact || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          selected_members: data.selected_members || [],
          priority: data.priority || 'medium'
        });
      }
    } catch (error) {
      console.error('Error loading deal for edit:', error);
      toast.error('Failed to load deal data');
    } finally {
      setLoading(false);
    }
  };

  const handleBuilderSelect = async (builder: Builder | null) => {
    if (!builder) {
      setFormData(prev => ({ 
        ...prev, 
        builder_id: undefined, 
        builder_name: '', 
        builder_location: '' 
      }));
      return;
    }

    if (builder.id === 'new') {
      // Show modal to create new builder
      setPendingBuilderName(builder.name);
      setShowNewBuilderModal(true);
    } else {
      setFormData(prev => ({
        ...prev,
        builder_id: builder.id,
        builder_name: builder.name,
        builder_location: builder.location
      }));
    }
  };

  const handleClientSelect = async (client: Client | null) => {
    if (!client) {
      setFormData(prev => ({ 
        ...prev, 
        client_id: undefined, 
        client_email: '', 
        client_phone: '', 
        client_address: '' 
      }));
      return;
    }

    if (client.id === 'new') {
      // Show modal to create new client
      setPendingClientName(client.name);
      setShowNewClientModal(true);
    } else {
      setFormData(prev => ({
        ...prev,
        client_id: client.id,
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: client.address || ''
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

  const handleNewBuilderSuccess = (builder: { id: string; name: string; location: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      builder_id: builder.id,
      builder_name: builder.name,
      builder_location: builder.location
    }));
    fetchBuilders(); // Refresh the builders list
    setShowNewBuilderModal(false);
    setPendingBuilderName('');
  };

  const handleNewLoanProviderSuccess = (loanProvider: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      loan_provider_id: loanProvider.id,
      loan_provider_name: loanProvider.name,
      loan_provider_contact: loanProvider.phone || ''
    }));
    fetchLoanProviders(); // Refresh the loan providers list
    setShowNewLoanProviderModal(false);
    setPendingLoanProviderName('');
  };

  const handleLoanProviderSelect = async (provider: LoanProvider | null) => {
    if (!provider) {
      setFormData(prev => ({ 
        ...prev, 
        loan_provider_id: '',
        loan_provider_name: '',
        loan_provider_contact: ''
      }));
      return;
    }

    if (provider.id === 'new') {
      // Show modal to create new loan provider
      setPendingLoanProviderName(provider.provider_name);
      setShowNewLoanProviderModal(true);
    } else {
      console.log('Setting loan provider data:', {
        id: provider.id,
        name: provider.provider_name,
        contact: provider.contact_details?.phone || ''
      });
      setFormData(prev => ({ 
        ...prev, 
        loan_provider_id: provider.id,
        loan_provider_name: provider.provider_name,
        loan_provider_contact: provider.contact_details?.phone || ''
      }));
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_members: prev.selected_members.includes(memberId)
        ? prev.selected_members.filter(id => id !== memberId)
        : [...prev.selected_members, memberId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.builder_id) {
      toast.error('Please select a builder');
      return;
    }

    if (!formData.client_id) {
      toast.error('Please select a client');
      return;
    }

    if (formData.selected_members.length === 0) {
      toast.error('Please select at least one team member');
      return;
    }

    setLoading(true);
    try {
      let projectData: any;
      let dealData: any;

      if (editDealId) {
        // Update existing deal
        const { data: existingDeal, error: fetchError } = await supabase
          .from('builder_deals')
          .select('project_id')
          .eq('id', editDealId)
          .single();

        if (fetchError) throw fetchError;

        // Update the project
        const { data: updatedProject, error: projectError } = await supabase
          .from('projects')
          .update({
            name: formData.project_name,
            description: `${dealType} builder purchase deal - ${formData.property_type}`,
            status: 'active',
            start_date: formData.start_date,
            expected_end_date: formData.end_date
          })
          .eq('id', existingDeal.project_id)
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = updatedProject;

        // Update the builder deal
        const { data: updatedDeal, error: dealError } = await supabase
          .from('builder_deals')
          .update({
            project_name: formData.project_name,
            project_manager_id: formData.project_manager_id || null,
            deal_type: formData.deal_type,
            property_type: formData.property_type,
            property_address: formData.property_address,
            property_area: parseFloat(formData.property_area) || null,
            property_price: parseFloat(formData.property_price) || null,
            builder_id: formData.builder_id,
            builder_name: formData.builder_name,
            builder_location: formData.builder_location,
            client_id: formData.client_id,
            client_name: formData.client_name,
            client_email: formData.client_email,
            client_phone: formData.client_phone,
            client_address: formData.client_address,
            commission_percentage: parseFloat(formData.commission_percentage) || null,
            commission_amount: parseFloat(formData.commission_amount) || null,
            booking_amount: parseFloat(formData.booking_amount) || null,
            has_loan: formData.has_loan,
            loan_amount: parseFloat(formData.loan_amount) || null,
            loan_provider_id: formData.loan_provider_id || null,
            loan_provider_name: formData.loan_provider_name,
            loan_provider_contact: formData.loan_provider_contact,
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: 'active',
            priority: formData.priority
          })
          .eq('id', editDealId)
          .select()
          .single();

        if (dealError) throw dealError;
        dealData = updatedDeal;

        // Update team member assignments
        await supabase
          .from('builder_deal_team_members')
          .delete()
          .eq('deal_id', editDealId);

        const teamAssignments = formData.selected_members.map(memberId => ({
          deal_id: editDealId,
          member_id: memberId,
          role: teamMembers.find(m => m.id === memberId)?.role || 'member',
          assigned_by: formData.selected_members[0]
        }));

        const { error: teamError } = await supabase
          .from('builder_deal_team_members')
          .insert(teamAssignments);

        if (teamError) throw teamError;

        toast.success('Builder deal updated successfully!');
        onSuccess();
      } else {
        // Create new deal
        // First create a project entry
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert([{
            name: formData.project_name,
            description: `${dealType} builder purchase deal - ${formData.property_type}`,
            status: 'active',
            start_date: formData.start_date,
            expected_end_date: formData.end_date
          }])
          .select().single();

        if (projectError) throw projectError;
        projectData = newProjectData;

        // Create builder deal entry
        const { data: newDealData, error: dealError } = await supabase
          .from('builder_deals')
          .insert([{
            project_id: projectData.id,
            project_name: formData.project_name,
            project_manager_id: formData.project_manager_id || null,
            deal_type: formData.deal_type,
            property_type: formData.property_type,
            property_address: formData.property_address,
            property_area: parseFloat(formData.property_area) || null,
            property_price: parseFloat(formData.property_price) || null,
            builder_id: formData.builder_id,
            builder_name: formData.builder_name,
            builder_location: formData.builder_location,
            client_id: formData.client_id,
            client_name: formData.client_name,
            client_email: formData.client_email,
            client_phone: formData.client_phone,
            client_address: formData.client_address,
            commission_percentage: parseFloat(formData.commission_percentage) || null,
            commission_amount: parseFloat(formData.commission_amount) || null,
            booking_amount: parseFloat(formData.booking_amount) || null,
            has_loan: formData.has_loan,
            loan_amount: parseFloat(formData.loan_amount) || null,
            loan_provider_id: formData.loan_provider_id || null,
            loan_provider_name: formData.loan_provider_name,
            loan_provider_contact: formData.loan_provider_contact,
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: 'active',
            priority: formData.priority,
            created_by: formData.selected_members[0]
          }])
          .select().single();

        if (dealError) throw dealError;
        dealData = newDealData;

        // Create team member assignments for new deal
        const teamAssignments = formData.selected_members.map(memberId => ({
          deal_id: dealData.id,
          member_id: memberId,
          role: teamMembers.find(m => m.id === memberId)?.role || 'member',
          assigned_by: formData.selected_members[0]
        }));

        const { error: teamError } = await supabase
          .from('builder_deal_team_members')
          .insert(teamAssignments);

        if (teamError) throw teamError;

        // Create default stages based on deal type
        const stages = dealType === 'residential' 
          ? [
              'Booking formalities',
              'Brokerage confirmation Signing',
              'Buyer Loan Sanction priocess',
              'Legal Check',
              'Agreement to sale',
              'TDS and Bank Loan formalities',
              'Loan Disbursement',
              'Brokerage Invoicing',
              'Documents upload and future reminders'
            ]
          : [
              'Booking formalities',
              'Brokerage confirmation Signing', 
              'Buyer Loan Sanction priocess',
              'Legal Check',
              'Agreement to sale',
              'TDS and Bank Loan formalities',
              'Loan Disbursement',
              'Brokerage Invoicing',
              'Documents upload and future reminders'
            ];

        const stageEntries = stages.map((stageName, index) => ({
          deal_id: dealData.id,
          stage_name: stageName,
          stage_order: index + 1,
          status: 'pending'
        }));

        const { error: stagesError } = await supabase
          .from('builder_deal_stages')
          .insert(stageEntries);

        if (stagesError) throw stagesError;

        toast.success('Builder deal created successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving builder deal:', error);
      toast.error(`Failed to ${editDealId ? 'update' : 'create'} builder deal`);
    } finally {
      setLoading(false);
    }
  };

  const propertyTypes = dealType === 'residential'
    ? ['Apartment', 'House', 'Condo', 'Villa', 'Studio', 'Townhouse', 'Other']
    : ['Office Space', 'Retail Store', 'Warehouse', 'Industrial Unit', 'Co-working Space', 'Shopping Mall', 'Other'];

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center space-x-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {editDealId ? 'Edit' : 'New'} {dealType === 'residential' ? 'Residential' : 'Commercial'} Builder Purchase Deal
        </h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Project Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <select
                  required
                  value={formData.property_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Property Type</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Address *
              </label>
              <textarea
                required
                value={formData.property_address}
                onChange={(e) => setFormData(prev => ({ ...prev, property_address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Area (sq ft)
                </label>
                <input
                  type="number"
                  value={formData.property_area}
                  onChange={(e) => setFormData(prev => ({ ...prev, property_area: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Price (in Lakhs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.property_price}
                    onChange={(e) => {
                      const propertyPrice = e.target.value;
                      const percentage = parseFloat(formData.commission_percentage) || 0;
                      const commissionAmount = (parseFloat(propertyPrice) * percentage) / 100;
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        property_price: propertyPrice,
                        commission_amount: commissionAmount.toFixed(2)
                      }));
                    }}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter price in lakhs"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-sm">L</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Manager
              </label>
              <select
                value={formData.project_manager_id}
                onChange={(e) => setFormData(prev => ({ ...prev, project_manager_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Project Manager</option>
                {projectManagers.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Builder Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Builder Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <AutocompleteInput
                  label="Builder Name"
                  placeholder="Search or enter builder name"
                  value={formData.builder_name}
                  onChange={(value) => setFormData(prev => ({ ...prev, builder_name: value }))}
                  onSelect={(option) => handleBuilderSelect(option as Builder | null)}
                  options={builders}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Builder Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.builder_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, builder_location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Client Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <AutocompleteInput
                  label="Client Name"
                  placeholder="Search or enter client name"
                  value={formData.client_name}
                  onChange={(value) => setFormData(prev => ({ ...prev, client_name: value }))}
                  onSelect={(option) => handleClientSelect(option as Client | null)}
                  options={clients}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Phone
                </label>
                <input
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Address
                </label>
                <input
                  type="text"
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) => {
                    const percentage = e.target.value;
                    const propertyPrice = parseFloat(formData.property_price) || 0;
                    const commissionAmount = (propertyPrice * parseFloat(percentage)) / 100;
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      commission_percentage: percentage,
                      commission_amount: commissionAmount.toFixed(2)
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Amount (in Lakhs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.commission_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, commission_amount: e.target.value }))}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Auto-calculated from percentage"
                    readOnly
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-sm">L</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated: {formData.commission_percentage}% of ₹{formData.property_price}L = ₹{formData.commission_amount}L
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Amount
                </label>
                <input
                  type="number"
                  value={formData.booking_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, booking_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Loan Question */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Does this deal involve a loan?
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="has_loan"
                      checked={formData.has_loan === true}
                      onChange={() => setFormData(prev => ({ ...prev, has_loan: true }))}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="has_loan"
                      checked={formData.has_loan === false}
                      onChange={() => setFormData(prev => ({ ...prev, has_loan: false, loan_amount: '', loan_provider_id: '', loan_provider_name: '', loan_provider_contact: '' }))}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
              </div>

              {formData.has_loan && (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loan Provider *
                    </label>
                    <AutocompleteInput
                      key={`loan-provider-${loanProviders.length}`}
                      label=""
                      placeholder="Select or search loan provider"
                      value={formData.loan_provider_name}
                      onChange={(value) => {
                        console.log('Loan provider name changed:', value);
                        setFormData(prev => ({ 
                          ...prev, 
                          loan_provider_name: value,
                          // Clear ID and contact when typing manually
                          loan_provider_id: '',
                          loan_provider_contact: ''
                        }));
                      }}
                      onSelect={(option) => {
                        console.log('Loan provider selected:', option);
                        handleLoanProviderSelect(option as LoanProvider | null);
                      }}
                      options={(() => {
                        const mappedOptions = loanProviders.map(provider => ({
                          id: provider.id || '',
                          name: provider.provider_name || ''
                        })).filter(option => option.name.trim() !== '');
                        console.log('Loan provider options:', mappedOptions);
                        return mappedOptions;
                      })()}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loan Amount (in Lakhs)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.loan_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, loan_amount: e.target.value }))}
                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter loan amount in lakhs"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm">L</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Team Members *</h3>
              <div className="text-sm text-gray-500">
                {teamMembers.length} members available
              </div>
            </div>
            {teamMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>No team members found. Please check if members exist in the database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {teamMembers.map(member => (
                  <label
                    key={member.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                      formData.selected_members.includes(member.id)
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selected_members.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-600">{member.department || member.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {formData.selected_members.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium">
                  {formData.selected_members.length} member(s) selected
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Selected: {formData.selected_members.map(id => {
                    const member = teamMembers.find(m => m.id === id);
                    return member?.name;
                  }).filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="secondary" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editDealId ? 'Updating...' : 'Creating...') : (editDealId ? 'Update Builder Deal' : 'Create Builder Deal')}
            </Button>
          </div>
        </form>
      </Card>

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

      {/* New Builder Modal */}
      <NewBuilderModal
        isOpen={showNewBuilderModal}
        onClose={() => {
          setShowNewBuilderModal(false);
          setPendingBuilderName('');
        }}
        onSuccess={handleNewBuilderSuccess}
        initialName={pendingBuilderName}
      />

      {/* New Loan Provider Modal */}
      <NewLoanProviderModal
        isOpen={showNewLoanProviderModal}
        onClose={() => {
          setShowNewLoanProviderModal(false);
          setPendingLoanProviderName('');
        }}
        onSuccess={handleNewLoanProviderSuccess}
        initialName={pendingLoanProviderName}
      />
    </div>
  );
};

export default BuilderDealForm;
