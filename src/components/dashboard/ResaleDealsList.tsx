import React, { useState } from 'react';
import { ArrowLeft, Plus, Eye, Calendar, MapPin, User, DollarSign, Search, Trash2, Edit, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ResaleDealTimeline from './ResaleDealTimeline';
import { useRealtimeResaleDeals } from '../../hooks/useRealtimeDeals';

interface ResaleDealsListProps {
  onBack: () => void;
  onCreateNew: () => void;
  onEditDeal: (dealId: string) => void;
}

interface ResaleDeal {
  id: string;
  project_name: string;
  owner_name: string;
  buyer_name: string;
  property_address: string;
  property_price: number;
  status: string;
  current_stage: number;
  created_at: string;
  start_date: string | null;
}

const ResaleDealsList: React.FC<ResaleDealsListProps> = ({ onBack, onCreateNew, onEditDeal }) => {
  const { deals, loading, error, refetch } = useRealtimeResaleDeals();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealToDelete, setDealToDelete] = useState<ResaleDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewDeal = (dealId: string) => {
    setSelectedDealId(dealId);
  };

  const handleEditDeal = (dealId: string) => {
    onEditDeal(dealId);
  };

  const handleMarkComplete = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('resale_deals')
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

  const handleBackFromTimeline = () => {
    setSelectedDealId(null);
    refetch(); // Refresh deals list
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    
    setIsDeleting(true);
    try {
      // First, get the project_id from the deal
      const { data: dealData } = await supabase
        .from('resale_deals')
        .select('project_id')
        .eq('id', dealToDelete.id)
        .single();

      // Get stage IDs first
      const { data: stageData } = await supabase
        .from('resale_deal_stages')
        .select('id')
        .eq('deal_id', dealToDelete.id);

      const stageIds = (stageData || []).map(s => s.id);

      // Delete related stage assignments first
      if (stageIds.length > 0) {
        try {
          await supabase
            .from('resale_stage_assignments')
            .delete()
            .in('stage_id', stageIds);
        } catch (error) {
          console.warn('Stage assignments table may not exist:', error);
        }
      }

      // Delete stages
      const { error: stagesError } = await supabase
        .from('resale_deal_stages')
        .delete()
        .eq('deal_id', dealToDelete.id);

      if (stagesError) {
        console.warn('Error deleting stages:', stagesError);
      }

      // Delete team member assignments
      const { error: teamError } = await supabase
        .from('resale_deal_team_members')
        .delete()
        .eq('deal_id', dealToDelete.id);

      if (teamError) {
        console.warn('Error deleting team assignments:', teamError);
      }

      // Delete the main deal
      const { error: dealError } = await supabase
        .from('resale_deals')
        .delete()
        .eq('id', dealToDelete.id);

      if (dealError) throw dealError;

      // If there's an associated project, delete it and all its tasks
      if (dealData?.project_id) {
        try {
          const { projectService } = await import('../../services/projects');
          await projectService.deleteProject(dealData.project_id);
          console.log('Associated project and all its tasks deleted successfully');
        } catch (projectError) {
          console.warn('Error deleting associated project:', projectError);
        }
      }

      toast.success(`${dealToDelete.project_name} deleted successfully`);
      setDealToDelete(null);
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDeals = deals.filter(deal =>
    deal.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.property_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (selectedDealId) {
    return (
      <ResaleDealTimeline
        dealId={selectedDealId}
        onBack={handleBackFromTimeline}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
                Resale Property Deals
              </h1>
              <p className="text-gray-600 mt-1">
                Manage all resale property transactions
              </p>
            </div>
          </div>
          <Button
            onClick={onCreateNew}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Deal</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Deals Grid */}
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No resale deals found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'No deals match your search criteria.' : 'Get started by creating your first resale deal.'}
            </p>
            <Button
              onClick={onCreateNew}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Deal</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map((deal) => (
              <Card key={deal.id} className="p-6 hover:shadow-lg transition-all duration-300">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {deal.project_name}
                      </h3>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(deal.status)} mt-1`}>
                        {deal.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="truncate">Owner: {deal.owner_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="truncate">Buyer: {deal.buyer_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{deal.property_address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>₹{deal.property_price?.toLocaleString() || '0'}</span>
                    </div>
                    {deal.start_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(deal.start_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-gray-900">Stage {deal.current_stage}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(deal.current_stage / 7) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-2">
                    {deal.status === 'active' && (
                      <button
                        onClick={() => handleMarkComplete(deal.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                        title="Mark as Complete"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditDeal(deal.id)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors duration-200"
                      title="Edit Deal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewDeal(deal.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                      title="View Timeline"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDealToDelete(deal)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
                      title="Delete Deal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {filteredDeals.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{filteredDeals.length}</div>
              <div className="text-sm text-gray-600">Total Deals</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {filteredDeals.filter(d => d.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {filteredDeals.filter(d => d.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                ₹{filteredDeals.reduce((sum, deal) => sum + (deal.property_price || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={!!dealToDelete}
          onClose={() => setDealToDelete(null)}
          onConfirm={handleDeleteDeal}
          taskName={dealToDelete?.project_name || ""}
          taskDescription={dealToDelete ? `This will permanently delete the resale deal for ${dealToDelete.project_name}, the associated project, and all tasks assigned to that project. This action cannot be undone.` : ""}
          projectName={dealToDelete?.project_name}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default ResaleDealsList;

