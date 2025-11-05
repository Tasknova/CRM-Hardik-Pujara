import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Users, Calendar, DollarSign, FileText, User, Home, Building2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import ResaleDealTimeline from './ResaleDealTimeline';
import AutocompleteInput from '../ui/AutocompleteInput';
import NewClientModal from '../ui/NewClientModal';
import NewOwnerModal from '../ui/NewOwnerModal';
import NewBrokerModal from '../ui/NewBrokerModal';
import NewLoanProviderModal from '../ui/NewLoanProviderModal';

interface ResaleDealFormProps {
  onBack: () => void;
  editDealId?: string;
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

interface LoanProvider {
  id: string;
  provider_name: string;
  address?: string;
  contact_details?: any;
}

interface DealFormData {
  project_name: string;
  deal_type: 'residential' | 'commercial';
  property_type: string;
  property_address: string;
  property_area: string;
  property_price: string;
  property_description: string;
  
  // Property Owner Information
  owner_id?: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_address: string;
  
  // Broker Information
  broker_id?: string;
  broker_name: string;
  broker_email: string;
  broker_phone: string;
  broker_address: string;
  broker_company_name: string;
  broker_license_number: string;
  
  // Property Buyer Information
  buyer_id?: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_address: string;
  
  // Financial Information
  brokerage_amount: string;
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
  expected_completion_date: string;
  end_date: string;
  
  // Additional
  additional_notes: string;
  project_manager_id?: string;
  team_members: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const ResaleDealForm: React.FC<ResaleDealFormProps> = ({ onBack, editDealId }) => {
  const [formData, setFormData] = useState<DealFormData>({
    project_name: '',
    deal_type: 'residential',
    property_type: 'Apartment',
    property_address: '',
    property_area: '',
    property_price: '',
    property_description: '',
    owner_id: undefined,
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_address: '',
    broker_id: undefined,
    broker_name: '',
    broker_email: '',
    broker_phone: '',
    broker_address: '',
    broker_company_name: '',
    broker_license_number: '',
    buyer_id: undefined,
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    buyer_address: '',
    brokerage_amount: '',
    commission_percentage: '',
    commission_amount: '',
    booking_amount: '',
    has_loan: false,
    loan_amount: '',
    loan_provider_id: '',
    loan_provider_name: '',
    loan_provider_contact: '',
    start_date: '',
    expected_completion_date: '',
    end_date: '',
    additional_notes: '',
    project_manager_id: '',
    team_members: [],
    priority: 'medium'
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loanProviders, setLoanProviders] = useState<LoanProvider[]>([]);
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
  const [showNewLoanProviderModal, setShowNewLoanProviderModal] = useState(false);
  const [pendingClientName, setPendingClientName] = useState('');
  const [pendingOwnerName, setPendingOwnerName] = useState('');
  const [pendingBrokerName, setPendingBrokerName] = useState('');
  const [pendingLoanProviderName, setPendingLoanProviderName] = useState('');

  useEffect(() => {
    fetchTeamMembers();
    fetchClients();
    fetchOwners();
    fetchBrokers();
    fetchLoanProviders();
    fetchProjectManagers();
  }, []);

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

  const fetchLoanProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_providers')
        .select('id, provider_name, address, contact_details')
        .order('provider_name');

      if (error) throw error;
      setLoanProviders(data || []);
    } catch (error) {
      console.error('Error fetching loan providers:', error);
      toast.error('Failed to load loan providers');
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
        .from('resale_deals')
        .select('*')
        .eq('id', editDealId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          project_name: data.project_name || '',
          deal_type: data.deal_type || 'residential',
          property_type: data.property_type || '',
          property_address: data.property_address || '',
          property_area: data.property_area?.toString() || '',
          property_price: data.property_price?.toString() || '',
          property_description: data.property_description || '',
          owner_id: data.owner_id,
          owner_name: data.owner_name || '',
          owner_email: data.owner_email || '',
          owner_phone: data.owner_phone || '',
          owner_address: data.owner_address || '',
          broker_id: data.broker_id,
          broker_name: data.broker_name || '',
          broker_email: data.broker_email || '',
          broker_phone: data.broker_phone || '',
          broker_address: data.broker_address || '',
          broker_company_name: data.broker_company_name || '',
          broker_license_number: data.broker_license_number || '',
          buyer_id: data.buyer_id,
          buyer_name: data.buyer_name || '',
          buyer_email: data.buyer_email || '',
          buyer_phone: data.buyer_phone || '',
          buyer_address: data.buyer_address || '',
          brokerage_amount: data.brokerage_amount?.toString() || '',
          commission_percentage: data.commission_percentage?.toString() || '',
          commission_amount: data.commission_amount?.toString() || '',
          booking_amount: data.booking_amount?.toString() || '',
          has_loan: data.has_loan || false,
          loan_amount: data.loan_amount?.toString() || '',
          loan_provider_id: data.loan_provider_id || '',
          loan_provider_name: data.loan_provider_name || '',
          loan_provider_contact: data.loan_provider_contact || '',
          start_date: data.start_date || '',
          expected_completion_date: data.expected_completion_date || '',
          end_date: data.end_date || '',
          additional_notes: data.additional_notes || '',
          project_manager_id: data.project_manager_id || '',
          team_members: [],
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

  const handleInputChange = (field: keyof DealFormData, value: string | boolean | string[]) => {
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

  const handleOwnerSelect = async (owner: Owner | null) => {
    if (!owner) {
      setFormData(prev => ({ ...prev, owner_id: undefined, owner_email: '', owner_phone: '', owner_address: '' }));
      return;
    }

    if (owner.id === 'new') {
      setPendingOwnerName(owner.name);
      setShowNewOwnerModal(true);
    } else {
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
      setPendingBrokerName(broker.name);
      setShowNewBrokerModal(true);
    } else {
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

  const handleBuyerSelect = async (client: Client | null) => {
    if (!client) {
      setFormData(prev => ({ ...prev, buyer_id: undefined, buyer_email: '', buyer_phone: '', buyer_address: '' }));
      return;
    }

    if (client.id === 'new') {
      setPendingClientName(client.name);
      setShowNewClientModal(true);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        buyer_id: client.id,
        buyer_email: client.email || '',
        buyer_phone: client.phone || '',
        buyer_address: client.address || ''
      }));
    }
  };

  const handleNewOwnerSuccess = (owner: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      owner_id: owner.id,
      owner_email: owner.email || '',
      owner_phone: owner.phone || '',
      owner_address: owner.address || ''
    }));
    fetchOwners();
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
    fetchBrokers();
    setShowNewBrokerModal(false);
    setPendingBrokerName('');
  };

  const handleNewBuyerSuccess = (client: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      buyer_id: client.id,
      buyer_email: client.email || '',
      buyer_phone: client.phone || '',
      buyer_address: client.address || ''
    }));
    fetchClients();
    setShowNewClientModal(false);
    setPendingClientName('');
  };

  const handleLoanProviderSelect = (provider: LoanProvider | null) => {
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
      setPendingLoanProviderName(provider.provider_name);
      setShowNewLoanProviderModal(true);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        loan_provider_id: provider.id,
        loan_provider_name: provider.provider_name,
        loan_provider_contact: provider.contact_details?.phone || ''
      }));
    }
  };

  const handleNewLoanProviderSuccess = (provider: { id: string; name: string; email?: string; phone?: string; address?: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      loan_provider_id: provider.id,
      loan_provider_name: provider.name,
      loan_provider_contact: provider.phone || ''
    }));
    fetchLoanProviders();
    setShowNewLoanProviderModal(false);
    setPendingLoanProviderName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.project_name || !formData.owner_name || !formData.buyer_name || !formData.property_address) {
        toast.error('Please fill in all required fields');
        return;
      }

      let projectData: any;
      let dealData: any;

      if (editDealId) {
        const { data: existingDeal, error: fetchError } = await supabase
          .from('resale_deals')
          .select('project_id')
          .eq('id', editDealId)
          .single();

        if (fetchError) throw fetchError;

        const { data: updatedProject, error: projectError } = await supabase
          .from('projects')
          .update({
            name: formData.project_name,
            description: `Resale deal for ${formData.buyer_name}`,
            client_name: formData.buyer_name,
            start_date: formData.start_date,
            expected_end_date: formData.end_date,
            status: 'active'
          })
          .eq('id', existingDeal.project_id)
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = updatedProject;

        const { data: updatedDeal, error: dealError } = await supabase
          .from('resale_deals')
          .update({
            project_name: formData.project_name,
            deal_type: formData.deal_type,
            owner_id: formData.owner_id,
            owner_name: formData.owner_name,
            owner_email: formData.owner_email,
            owner_phone: formData.owner_phone,
            owner_address: formData.owner_address,
            broker_id: formData.broker_id,
            broker_name: formData.broker_name,
            broker_email: formData.broker_email,
            broker_phone: formData.broker_phone,
            broker_address: formData.broker_address,
            broker_company_name: formData.broker_company_name,
            broker_license_number: formData.broker_license_number,
            buyer_id: formData.buyer_id,
            buyer_name: formData.buyer_name,
            buyer_email: formData.buyer_email,
            buyer_phone: formData.buyer_phone,
            buyer_address: formData.buyer_address,
            property_address: formData.property_address,
            property_type: formData.property_type,
            property_area: parseFloat(formData.property_area) || null,
            property_price: parseFloat(formData.property_price) || 0,
            property_description: formData.property_description,
            brokerage_amount: parseFloat(formData.brokerage_amount) || 0,
            commission_percentage: parseFloat(formData.commission_percentage) || null,
            commission_amount: parseFloat(formData.commission_amount) || null,
            booking_amount: parseFloat(formData.booking_amount) || null,
            has_loan: formData.has_loan,
            loan_amount: formData.has_loan ? (parseFloat(formData.loan_amount) || null) : null,
            loan_provider_id: formData.has_loan ? formData.loan_provider_id || null : null,
            loan_provider_name: formData.has_loan ? formData.loan_provider_name : null,
            loan_provider_contact: formData.has_loan ? formData.loan_provider_contact : null,
            start_date: formData.start_date,
            expected_completion_date: formData.expected_completion_date,
            end_date: formData.end_date,
            additional_notes: formData.additional_notes,
            project_manager_id: formData.project_manager_id || null,
            priority: formData.priority
          })
          .eq('id', editDealId)
          .select()
          .single();

        if (dealError) throw dealError;
        dealData = updatedDeal;

        await supabase
          .from('resale_deal_team_members')
          .delete()
          .eq('deal_id', editDealId);

        if (formData.team_members.length > 0) {
          const teamAssignments = formData.team_members.map(memberId => ({
            deal_id: editDealId,
            member_id: memberId,
            role: 'team_member'
          }));

          const { error: teamError } = await supabase
            .from('resale_deal_team_members')
            .insert(teamAssignments);

          if (teamError) throw teamError;
        }

        toast.success('Resale deal updated successfully!');
        setCreatedDealId(editDealId);
        setShowTimeline(true);
      } else {
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert([{
            name: formData.project_name,
            description: `Resale deal for ${formData.buyer_name}`,
            client_name: formData.buyer_name,
            start_date: formData.start_date,
            expected_end_date: formData.end_date,
            status: 'active'
          }])
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = newProjectData;

        const { data: newDealData, error: dealError } = await supabase
          .from('resale_deals')
          .insert([{
            project_name: formData.project_name,
            deal_type: formData.deal_type,
            owner_id: formData.owner_id,
            owner_name: formData.owner_name,
            owner_email: formData.owner_email,
            owner_phone: formData.owner_phone,
            owner_address: formData.owner_address,
            broker_id: formData.broker_id,
            broker_name: formData.broker_name,
            broker_email: formData.broker_email,
            broker_phone: formData.broker_phone,
            broker_address: formData.broker_address,
            broker_company_name: formData.broker_company_name,
            broker_license_number: formData.broker_license_number,
            buyer_id: formData.buyer_id,
            buyer_name: formData.buyer_name,
            buyer_email: formData.buyer_email,
            buyer_phone: formData.buyer_phone,
            buyer_address: formData.buyer_address,
            property_address: formData.property_address,
            property_type: formData.property_type,
            property_area: parseFloat(formData.property_area) || null,
            property_price: parseFloat(formData.property_price) || 0,
            property_description: formData.property_description,
            brokerage_amount: parseFloat(formData.brokerage_amount) || 0,
            commission_percentage: parseFloat(formData.commission_percentage) || null,
            commission_amount: parseFloat(formData.commission_amount) || null,
            booking_amount: parseFloat(formData.booking_amount) || null,
            has_loan: formData.has_loan,
            loan_amount: formData.has_loan ? (parseFloat(formData.loan_amount) || null) : null,
            loan_provider_id: formData.has_loan ? formData.loan_provider_id || null : null,
            loan_provider_name: formData.has_loan ? formData.loan_provider_name : null,
            loan_provider_contact: formData.has_loan ? formData.loan_provider_contact : null,
            start_date: formData.start_date,
            expected_completion_date: formData.expected_completion_date,
            end_date: formData.end_date,
            additional_notes: formData.additional_notes,
            project_id: projectData.id,
            project_manager_id: formData.project_manager_id || null,
            priority: formData.priority
          }])
          .select()
          .single();

        if (dealError) throw dealError;
        dealData = newDealData;

        if (formData.team_members.length > 0) {
          const teamAssignments = formData.team_members.map(memberId => ({
            deal_id: dealData.id,
            member_id: memberId,
            role: 'team_member'
          }));

          const { error: teamError } = await supabase
            .from('resale_deal_team_members')
            .insert(teamAssignments);

          if (teamError) throw teamError;
        }

        const stages = [
          'Booking formalities',
          'Brokerage confirmation Signing',
          'Buyer Loan Sanction process',
          'Legal Check',
          'Agreement to sale',
          'TDS and Bank Loan formalities',
          'Loan Disbursement',
          'Brokerage Invoicing',
          'Documents upload and future reminders'
        ];

        const stageInserts = stages.map((stageName, index) => ({
          deal_id: dealData.id,
          stage_name: stageName,
          stage_order: index + 1,
          status: index === 0 ? 'in_progress' : 'pending'
        }));

        const { error: stagesError } = await supabase
          .from('resale_deal_stages')
          .insert(stageInserts);

        if (stagesError) throw stagesError;

        toast.success('Resale deal created successfully!');
        setCreatedDealId(dealData.id);
        setShowTimeline(true);
      }
    } catch (error) {
      console.error('Error saving resale deal:', error);
      toast.error(`Failed to ${editDealId ? 'update' : 'create'} resale deal`);
    } finally {
      setLoading(false);
    }
  };

  if (showTimeline && createdDealId) {
    return (
      <ResaleDealTimeline
        dealId={createdDealId}
        onBack={onBack}
      />
    );
  }

  const propertyTypes = formData.deal_type === 'residential' 
    ? ['Apartment', 'House', 'Condo', 'Villa', 'Studio', 'Townhouse', 'Other']
    : ['Office Space', 'Retail Store', 'Warehouse', 'Industrial Unit', 'Co-working Space', 'Shopping Mall', 'Other'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
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
              {editDealId ? 'Edit' : 'New'} Resale Property Deal
            </h1>
            <p className="text-gray-600 mt-1">
              {editDealId ? 'Update the resale deal details' : 'Fill in the details to create a new resale property deal'}
            </p>
          </div>
        </div>

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
                    Deal Type *
                  </label>
                  <select
                    required
                    value={formData.deal_type}
                    onChange={(e) => handleInputChange('deal_type', e.target.value as 'residential' | 'commercial')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
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

                <div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Area (sq ft)
                  </label>
                  <input
                    type="number"
                    value={formData.property_area}
                    onChange={(e) => handleInputChange('property_area', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter property area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Price *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.property_price}
                    onChange={(e) => handleInputChange('property_price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter property price"
                  />
                </div>
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

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Description
                </label>
                <textarea
                  value={formData.property_description}
                  onChange={(e) => handleInputChange('property_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter property description"
                />
              </div>
            </Card>

            {/* Property Owner Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Home className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Property Owner Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <AutocompleteInput
                  label="Owner Name *"
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

            {/* Broker Information */}
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

            {/* Property Buyer Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Property Buyer Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <AutocompleteInput
                  label="Buyer Name *"
                  placeholder="Enter or select buyer name"
                  value={formData.buyer_name}
                  onChange={(value) => handleInputChange('buyer_name', value)}
                  onSelect={handleBuyerSelect}
                  options={clients}
                  loading={clientsLoading}
                  required={true}
                  icon={<User className="w-4 h-4" />}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Email
                  </label>
                  <input
                    type="email"
                    value={formData.buyer_email}
                    onChange={(e) => handleInputChange('buyer_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter buyer email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.buyer_phone}
                    onChange={(e) => handleInputChange('buyer_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter buyer phone"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Address
                  </label>
                  <textarea
                    value={formData.buyer_address}
                    onChange={(e) => handleInputChange('buyer_address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter buyer address"
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Percentage
                  </label>
                  <input
                    type="number"
                    value={formData.commission_percentage}
                    onChange={(e) => handleInputChange('commission_percentage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter commission %"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Amount
                  </label>
                  <input
                    type="number"
                    value={formData.commission_amount}
                    onChange={(e) => handleInputChange('commission_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter commission amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Amount
                  </label>
                  <input
                    type="number"
                    value={formData.booking_amount}
                    onChange={(e) => handleInputChange('booking_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter booking amount"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="has_loan"
                    checked={formData.has_loan}
                    onChange={(e) => handleInputChange('has_loan', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="has_loan" className="text-sm font-medium text-gray-700">
                    Buyer has loan?
                  </label>
                </div>
                
                {formData.has_loan && (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount
                      </label>
                      <input
                        type="number"
                        value={formData.loan_amount}
                        onChange={(e) => handleInputChange('loan_amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter loan amount"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Provider
                      </label>
                      <select
                        value={formData.loan_provider_id}
                        onChange={(e) => {
                          const provider = loanProviders.find(p => p.id === e.target.value);
                          handleLoanProviderSelect(provider || null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Loan Provider</option>
                        {loanProviders.map(provider => (
                          <option key={provider.id} value={provider.id}>{provider.provider_name}</option>
                        ))}
                        <option value="new">+ Create New Loan Provider</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Provider Contact
                      </label>
                      <input
                        type="text"
                        value={formData.loan_provider_contact}
                        onChange={(e) => handleInputChange('loan_provider_contact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter contact"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Timeline</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
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
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_completion_date}
                    onChange={(e) => handleInputChange('expected_completion_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
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

            {/* Priority */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Priority</h2>
              </div>
              
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
        onSuccess={handleNewBuyerSuccess}
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

export default ResaleDealForm;

