import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Users, Calendar, MapPin, DollarSign, FileText, User, Home } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import RentalDealTimeline from './RentalDealTimeline';
import AutocompleteInput from '../ui/AutocompleteInput';

interface RentalDealFormProps {
  dealType: 'residential' | 'commercial';
  onBack: () => void;
  onSuccess: () => void;
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
}

const RentalDealForm: React.FC<RentalDealFormProps> = ({ dealType, onBack, onSuccess }) => {
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
    additional_notes: ''
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [createdDealId, setCreatedDealId] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchTeamMembers();
    fetchClients();
    fetchOwners();
  }, []);

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
      // Create new client
      try {
        const { data, error } = await supabase
          .from('clients')
          .insert([{ 
            name: client.name,
            email: formData.client_email || null,
            phone: formData.client_phone || null,
            address: formData.client_address || null
          }])
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => ({ 
          ...prev, 
          client_id: data.id
        }));
        
        // Refresh clients list
        fetchClients();
        toast.success('New client created successfully');
      } catch (error) {
        console.error('Error creating client:', error);
        toast.error('Failed to create new client');
      }
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
      // Create new owner
      try {
        const { data, error } = await supabase
          .from('owners')
          .insert([{ 
            name: owner.name,
            email: formData.owner_email || null,
            phone: formData.owner_phone || null,
            address: formData.owner_address || null
          }])
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => ({ 
          ...prev, 
          owner_id: data.id
        }));
        
        // Refresh owners list
        fetchOwners();
        toast.success('New owner created successfully');
      } catch (error) {
        console.error('Error creating owner:', error);
        toast.error('Failed to create new owner');
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.project_name || !formData.client_name || !formData.owner_name || !formData.property_address) {
        toast.error('Please fill in all required fields');
        return;
      }

      // First, create a project for this rental deal
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: formData.project_name,
          description: `${dealType} rental deal for ${formData.client_name}`,
          client_name: formData.client_name,
          start_date: formData.start_date,
          expected_end_date: formData.end_date,
          status: 'active'
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Create the rental deal with project reference
      const { data: dealData, error: dealError } = await supabase
        .from('rental_deals')
        .insert([{
          project_name: formData.project_name,
          deal_type: dealType,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
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
          project_id: projectData.id
        }])
        .select()
        .single();

      if (dealError) throw dealError;

      // Create team member assignments
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
    } catch (error) {
      console.error('Error creating rental deal:', error);
      toast.error('Failed to create rental deal');
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
              {dealType} Rental Deal Form
            </h1>
            <p className="text-gray-600 mt-1">Fill in the details to create a new rental deal</p>
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

            {/* Client Information */}
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
                <span>{loading ? 'Creating Deal...' : 'Create Deal'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalDealForm;
