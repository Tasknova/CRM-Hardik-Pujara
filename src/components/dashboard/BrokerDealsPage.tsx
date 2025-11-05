import React, { useState, useEffect } from 'react';
import { Home, Building, Building2, Calendar, DollarSign, Search, FileText } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BrokerDealsPageProps {
  brokerId: string;
}

interface Deal {
  id: string;
  deal_type: 'rental' | 'builder' | 'resale';
  project_name?: string;
  property_address?: string;
  client_name?: string;
  buyer_name?: string;
  status: string;
  rental_amount?: number;
  property_price?: string;
  brokerage_amount?: number;
  commission_amount?: string;
  created_at: string;
}

const BrokerDealsPage: React.FC<BrokerDealsPageProps> = ({ brokerId }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rental' | 'builder' | 'resale'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchDeals();
  }, [brokerId]);

  const fetchDeals = async () => {
    try {
      setLoading(true);

      // Fetch deals from all three tables where broker_id matches
      const [rentalDeals, builderDeals, resaleDeals] = await Promise.all([
        supabase
          .from('rental_deals')
          .select('id, project_name, property_address, client_name, status, rental_amount, brokerage_amount, created_at')
          .eq('broker_id', brokerId),
        supabase
          .from('builder_deals')
          .select('id, project_name, property_address, client_name, status, property_price, commission_amount, created_at')
          .eq('broker_id', brokerId),
        supabase
          .from('resale_deals')
          .select('id, project_name, property_address, buyer_name, status, property_price, commission_amount, brokerage_amount, created_at')
          .eq('broker_id', brokerId)
      ]);

      const allDeals: Deal[] = [
        ...(rentalDeals.data || []).map(deal => ({ ...deal, deal_type: 'rental' as const })),
        ...(builderDeals.data || []).map(deal => ({ ...deal, deal_type: 'builder' as const })),
        ...(resaleDeals.data || []).map(deal => ({ ...deal, deal_type: 'resale' as const }))
      ];

      setDeals(allDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = 
      (deal.project_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deal.property_address?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deal.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deal.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || deal.deal_type === filterType;
    const matchesStatus = filterStatus === 'all' || deal.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getDealIcon = (type: string) => {
    switch (type) {
      case 'rental':
        return <Home className="w-5 h-5 text-blue-600" />;
      case 'builder':
        return <Building className="w-5 h-5 text-green-600" />;
      case 'resale':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDealColor = (type: string) => {
    switch (type) {
      case 'rental':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'builder':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'resale':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
        <p className="text-gray-600 mt-1">All rental, builder, and resale deals associated with you</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Deal Types</option>
            <option value="rental">Rental</option>
            <option value="builder">Builder</option>
            <option value="resale">Resale</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Deals List */}
      {filteredDeals.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? 'No deals found' : 'No deals yet'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'Try adjusting your filters' 
              : 'You don\'t have any deals associated with you yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => (
            <Card key={deal.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getDealColor(deal.deal_type)}`}>
                    {getDealIcon(deal.deal_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{deal.deal_type} Deal</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(deal.status)}`}>
                      {deal.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {deal.project_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.project_name}</p>
                  </div>
                )}
                {deal.property_address && (
                  <div>
                    <p className="text-sm text-gray-600">{deal.property_address}</p>
                  </div>
                )}
                {deal.client_name && (
                  <div>
                    <p className="text-sm text-gray-600">Client: {deal.client_name}</p>
                  </div>
                )}
                {deal.buyer_name && (
                  <div>
                    <p className="text-sm text-gray-600">Buyer: {deal.buyer_name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                {deal.rental_amount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Rental Amount:</span>
                    <span className="font-semibold text-gray-900">₹{deal.rental_amount.toLocaleString()}</span>
                  </div>
                )}
                {deal.property_price && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Property Price:</span>
                    <span className="font-semibold text-gray-900">₹{parseFloat(deal.property_price).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(deal.created_at), 'MMM dd, yyyy')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrokerDealsPage;

