import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Eye, Trash2, Building, MapPin, Calendar, DollarSign, Users, Edit, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BuilderDealTimeline from './BuilderDealTimeline';
import { useRealtimeBuilderDeals } from '../../hooks/useRealtimeDeals';

interface BuilderDeal {
  id: string;
  project_name: string;
  deal_type: 'residential' | 'commercial';
  property_type: string;
  property_address: string;
  property_area?: string;
  property_price?: string;
  builder_name: string;
  builder_location: string;
  client_name: string;
  commission_percentage?: string;
  commission_amount?: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  created_at: string;
}

interface BuilderDealsListProps {
  dealType: 'residential' | 'commercial';
  onBack: () => void;
  onCreateNew: () => void;
  onEditDeal: (dealId: string) => void;
}

const BuilderDealsList: React.FC<BuilderDealsListProps> = ({ dealType, onBack, onCreateNew, onEditDeal }) => {
  const { deals, loading, error } = useRealtimeBuilderDeals(dealType);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealToDelete, setDealToDelete] = useState<BuilderDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);


  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    
    setIsDeleting(true);
    try {
      // First, get the project_id from the deal
      const { data: dealData } = await supabase
        .from('builder_deals')
        .select('project_id')
        .eq('id', dealToDelete.id)
        .single();

      // Delete related stage assignments first
      const { data: stageData } = await supabase
        .from('builder_deal_stages')
        .select('id')
        .eq('deal_id', dealToDelete.id);
      
      const stageIds = (stageData || []).map(s => s.id);
      
      if (stageIds.length > 0) {
        try {
          await supabase
            .from('builder_stage_assignments')
            .delete()
            .in('stage_id', stageIds);
        } catch (error) {
          console.warn('Stage assignments table may not exist:', error);
        }
      }

      // Delete stages
      await supabase
        .from('builder_deal_stages')
        .delete()
        .eq('deal_id', dealToDelete.id);

      // Delete team member assignments
      await supabase
        .from('builder_deal_team_members')
        .delete()
        .eq('deal_id', dealToDelete.id);

      // Delete the main deal
      const { error: dealError } = await supabase
        .from('builder_deals')
        .delete()
        .eq('id', dealToDelete.id);

      if (dealError) throw dealError;

      // If there's an associated project, delete it and all its tasks
      if (dealData?.project_id) {
        try {
          // Import the project service to use its deleteProject function
          const { projectService } = await import('../../services/projects');
          await projectService.deleteProject(dealData.project_id);
          console.log('Associated project and all its tasks deleted successfully');
        } catch (projectError) {
          console.warn('Error deleting associated project:', projectError);
          // Don't throw here as the deal is already deleted
        }
      }

        toast.success(`${dealToDelete.project_name} deleted successfully`);
        setDealToDelete(null);
    } catch (error) {
      console.error('Error deleting builder deal:', error);
      toast.error('Failed to delete builder deal');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewTimeline = (dealId: string) => {
    setSelectedDealId(dealId);
  };

  const handleEditDeal = (dealId: string) => {
    onEditDeal(dealId);
  };

  const handleMarkComplete = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('builder_deals')
        .update({ status: 'completed' })
        .eq('id', dealId);

      if (error) {
        console.error('Error marking deal as complete:', error);
        toast.error('Failed to mark deal as complete');
        return;
      }

      toast.success('Deal marked as complete successfully');
    } catch (error) {
      console.error('Error marking deal as complete:', error);
      toast.error('Failed to mark deal as complete');
    }
  };

  const filteredDeals = deals.filter(deal =>
    deal.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.builder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.property_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedDealId) {
    return (
      <BuilderDealTimeline
        dealId={selectedDealId}
        onBack={() => setSelectedDealId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalDeals = deals.length;
  const activeDeals = deals.filter(d => d.status === 'active').length;
  
  // Debug logging
  console.log('Deals data:', deals);
  console.log('Property prices:', deals.map(d => d.property_price));
  
  const totalValue = deals.reduce((sum, deal) => {
    const price = parseFloat(deal.property_price?.toString() || '0') || 0;
    console.log(`Deal ${deal.project_name}: property_price="${deal.property_price}", parsed=${price}`);
    return sum + price;
  }, 0);
  
  const totalCommission = deals.reduce((sum, deal) => {
    const commission = parseFloat(deal.commission_amount?.toString() || '0') || 0;
    console.log(`Deal ${deal.project_name}: commission_amount="${deal.commission_amount}", parsed=${commission}`);
    return sum + commission;
  }, 0);
  
  console.log('Total Value:', totalValue, 'Total Commission:', totalCommission);

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {dealType === 'residential' ? 'Residential' : 'Commercial'} Builder Purchase Deals
          </h1>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Deal
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{activeDeals}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{totalValue.toFixed(1)}L
              </p>
              <p className="text-xs text-gray-500">Raw: {totalValue}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{totalCommission.toFixed(1)}L
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search deals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        {filteredDeals.map((deal) => (
          <Card key={deal.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {deal.project_name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <Badge className={getStatusColor(deal.status)}>
                        {deal.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(deal.priority)}>
                        {deal.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {deal.status === 'active' && (
                      <button
                        onClick={() => handleMarkComplete(deal.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as Complete"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditDeal(deal.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Edit Deal"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewTimeline(deal.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="View Timeline"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDealToDelete(deal)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete Deal"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">Property:</span>
                    </div>
                    <p className="text-sm">{deal.property_type}</p>
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{deal.property_address}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">Builder:</span>
                    </div>
                    <p className="text-sm font-medium">{deal.builder_name}</p>
                    <p className="text-sm text-gray-600">{deal.builder_location}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="font-medium">Client:</span>
                    </div>
                    <p className="text-sm font-medium">{deal.client_name}</p>
                    {deal.property_area && (
                      <p className="text-sm text-gray-600">{deal.property_area} sq ft</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="font-medium">Timeline:</span>
                    </div>
                    <p className="text-sm">
                      {format(new Date(deal.start_date), 'MMM dd, yyyy')} - 
                      {format(new Date(deal.end_date), 'MMM dd, yyyy')}
                    </p>
                    {deal.property_price && (
                      <p className="text-sm font-medium text-green-600">
                        ₹{deal.property_price}L
                      </p>
                    )}
                  </div>
                </div>

                {(deal.commission_percentage || deal.commission_amount) && (
                  <div className="flex items-center space-x-4 pt-2 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span className="font-medium">Commission:</span>
                    </div>
                    {deal.commission_percentage && (
                      <span className="text-sm">{deal.commission_percentage}%</span>
                    )}
                    {deal.commission_amount && (
                      <span className="text-sm font-medium text-green-600">
                        ₹{parseFloat(deal.commission_amount).toFixed(2)}L
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredDeals.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No {dealType} builder purchase deals found
          </p>
          <Button onClick={onCreateNew} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Deal
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!dealToDelete}
        onClose={() => setDealToDelete(null)}
        onConfirm={handleDeleteDeal}
        taskName={dealToDelete?.project_name || ''}
        taskDescription={dealToDelete ? `This will permanently delete the ${dealToDelete.deal_type} builder deal with ${dealToDelete.client_name}, the associated project, and all tasks assigned to that project. This action cannot be undone.` : ''}
        projectName={dealToDelete?.project_name || ''}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default BuilderDealsList;
