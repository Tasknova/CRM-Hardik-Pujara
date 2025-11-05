import React, { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, TrendingUp, FileText, Home, Building, UserCheck, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface BusinessDashboardProps {
  onTabChange: (tab: string) => void;
}

interface BusinessStats {
  // Property Counts
  totalRentalProperties: number;
  totalResaleProperties: number;
  totalBuilderProperties: number;
  
  // Deal Counts
  totalRentalDeals: number;
  totalResaleDeals: number;
  totalBuilderDeals: number;
  
  // Business Entities
  totalClients: number;
  totalOwners: number;
  totalBuilders: number;
  totalLoanProviders: number;
  
  // Financial Metrics
  totalRentalValue: number;
  totalBuilderValue: number;
  totalResaleValue: number;
  totalCommission: number;
  rentalCommissionIncome: number;
  resaleCommissionIncome: number;
  
  // Income Metrics
  completedRentalIncome: number;
  completedBuilderIncome: number;
  completedResaleIncome: number;
  upcomingRentalIncome: number;
  upcomingBuilderIncome: number;
  upcomingResaleIncome: number;
  
  // Status Counts
  activeRentalDeals: number;
  activeBuilderDeals: number;
  activeResaleDeals: number;
  completedRentalDeals: number;
  completedBuilderDeals: number;
  completedResaleDeals: number;
  
  // Recent Activity
  recentRentalDeals: any[];
  recentBuilderDeals: any[];
  recentResaleDeals: any[];
  topClients: any[];
}

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onTabChange }) => {
  const [stats, setStats] = useState<BusinessStats>({
    // Property Counts
    totalRentalProperties: 0,
    totalResaleProperties: 0,
    totalBuilderProperties: 0,
    
    // Deal Counts
    totalRentalDeals: 0,
    totalResaleDeals: 0,
    totalBuilderDeals: 0,
    
    // Business Entities
    totalClients: 0,
    totalOwners: 0,
    totalBuilders: 0,
    totalLoanProviders: 0,
    
    // Financial Metrics
    totalRentalValue: 0,
    totalBuilderValue: 0,
    totalResaleValue: 0,
    totalCommission: 0,
    rentalCommissionIncome: 0,
    resaleCommissionIncome: 0,
    
    // Income Metrics
    completedRentalIncome: 0,
    completedBuilderIncome: 0,
    completedResaleIncome: 0,
    upcomingRentalIncome: 0,
    upcomingBuilderIncome: 0,
    upcomingResaleIncome: 0,
    
    // Status Counts
    activeRentalDeals: 0,
    activeBuilderDeals: 0,
    activeResaleDeals: 0,
    completedRentalDeals: 0,
    completedBuilderDeals: 0,
    completedResaleDeals: 0,
    
    // Recent Activity
    recentRentalDeals: [],
    recentBuilderDeals: [],
    recentResaleDeals: [],
    topClients: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessStats();
  }, []);

  const fetchBusinessStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all business-related data in parallel
      const [
        rentalDealsResult,
        builderDealsResult,
        resaleDealsResult,
        clientsResult,
        ownersResult,
        buildersResult,
        loanProvidersResult
      ] = await Promise.all([
        supabase.from('rental_deals').select('id, rental_amount, brokerage_amount, status, created_at, client_name, property_type'),
        supabase.from('builder_deals').select('id, property_price, commission_amount, status, created_at, client_name, property_type'),
        supabase.from('resale_deals').select('id, property_price, commission_amount, brokerage_amount, status, created_at, buyer_name, property_type'),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('owners').select('id'),
        supabase.from('builders').select('id'),
        supabase.from('loan_providers').select('id')
      ]);

      // Process rental deals
      const rentalDeals = rentalDealsResult.data || [];
      const totalRentalValue = rentalDeals.reduce((sum, deal) => sum + (deal.rental_amount || 0), 0);
      const rentalCommissionIncome = rentalDeals.reduce((sum, deal) => sum + (deal.brokerage_amount || 0), 0);
      const activeRentalDeals = rentalDeals.filter(deal => deal.status === 'active').length;
      const completedRentalDeals = rentalDeals.filter(deal => deal.status === 'completed').length;
      
      // Calculate income metrics
      const completedRentalIncome = rentalDeals
        .filter(deal => deal.status === 'completed')
        .reduce((sum, deal) => sum + (deal.brokerage_amount || 0), 0);
      const upcomingRentalIncome = rentalDeals
        .filter(deal => deal.status !== 'completed')
        .reduce((sum, deal) => sum + (deal.brokerage_amount || 0), 0);

      // Process builder deals
      const builderDeals = builderDealsResult.data || [];
      const totalBuilderValue = builderDeals.reduce((sum, deal) => sum + (deal.property_price || 0), 0);
      const totalCommission = builderDeals.reduce((sum, deal) => sum + (deal.commission_amount || 0), 0);
      const activeBuilderDeals = builderDeals.filter(deal => deal.status === 'active').length;
      const completedBuilderDeals = builderDeals.filter(deal => deal.status === 'completed').length;
      
      // Calculate builder income metrics
      const completedBuilderIncome = builderDeals
        .filter(deal => deal.status === 'completed')
        .reduce((sum, deal) => sum + (deal.commission_amount || 0), 0);
      const upcomingBuilderIncome = builderDeals
        .filter(deal => deal.status !== 'completed')
        .reduce((sum, deal) => sum + (deal.commission_amount || 0), 0);

      // Process resale deals
      const resaleDeals = resaleDealsResult.data || [];
      const totalResaleValue = resaleDeals.reduce((sum, deal) => sum + (parseFloat(deal.property_price) || 0), 0);
      const resaleCommissionIncome = resaleDeals.reduce((sum, deal) => sum + (parseFloat(deal.commission_amount || deal.brokerage_amount || 0)), 0);
      const activeResaleDeals = resaleDeals.filter(deal => deal.status === 'active').length;
      const completedResaleDeals = resaleDeals.filter(deal => deal.status === 'completed').length;
      
      // Calculate resale income metrics
      const completedResaleIncome = resaleDeals
        .filter(deal => deal.status === 'completed')
        .reduce((sum, deal) => sum + (parseFloat(deal.commission_amount || deal.brokerage_amount || 0)), 0);
      const upcomingResaleIncome = resaleDeals
        .filter(deal => deal.status !== 'completed')
        .reduce((sum, deal) => sum + (parseFloat(deal.commission_amount || deal.brokerage_amount || 0)), 0);

      // Count properties by type
      // All rental deals are rental properties (residential + commercial)
      const rentalProperties = rentalDeals.length;
      const resaleProperties = resaleDeals.length;
      const builderProperties = builderDeals.length;

      // Get recent deals
      const recentRentalDeals = rentalDeals
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      const recentBuilderDeals = builderDeals
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      const recentResaleDeals = resaleDeals
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Get top clients
      const allClients = clientsResult.data || [];
      const topClients = allClients.slice(0, 5);

      setStats({
        // Property Counts
        totalRentalProperties: rentalProperties,
        totalResaleProperties: resaleProperties,
        totalBuilderProperties: builderProperties,
        
        // Deal Counts
        totalRentalDeals: rentalDeals.length,
        totalResaleDeals: resaleProperties,
        totalBuilderDeals: builderDeals.length,
        
        // Business Entities
        totalClients: allClients.length,
        totalOwners: ownersResult.data?.length || 0,
        totalBuilders: buildersResult.data?.length || 0,
        totalLoanProviders: loanProvidersResult.data?.length || 0,
        
        // Financial Metrics
        totalRentalValue: totalRentalValue,
        totalBuilderValue: totalBuilderValue,
        totalResaleValue: totalResaleValue,
        totalCommission: totalCommission,
        rentalCommissionIncome: rentalCommissionIncome,
        resaleCommissionIncome: resaleCommissionIncome,
        
        // Income Metrics
        completedRentalIncome: completedRentalIncome,
        completedBuilderIncome: completedBuilderIncome,
        completedResaleIncome: completedResaleIncome,
        upcomingRentalIncome: upcomingRentalIncome,
        upcomingBuilderIncome: upcomingBuilderIncome,
        upcomingResaleIncome: upcomingResaleIncome,
        
        // Status Counts
        activeRentalDeals: activeRentalDeals,
        activeBuilderDeals: activeBuilderDeals,
        activeResaleDeals: activeResaleDeals,
        completedRentalDeals: completedRentalDeals,
        completedBuilderDeals: completedBuilderDeals,
        completedResaleDeals: completedResaleDeals,
        
        // Recent Activity
        recentRentalDeals: recentRentalDeals,
        recentBuilderDeals: recentBuilderDeals,
        recentResaleDeals: recentResaleDeals,
        topClients: topClients
      });
    } catch (error) {
      console.error('Error fetching business stats:', error);
      toast.error('Failed to load business statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600 mt-1">Real estate business overview and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Property Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Rental Properties</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalRentalProperties}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.activeRentalDeals} active, {stats.completedRentalDeals} completed</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <Home className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Builder Properties</p>
              <p className="text-3xl font-bold text-green-900">{stats.totalBuilderProperties}</p>
              <p className="text-xs text-green-600 mt-1">{stats.activeBuilderDeals} active, {stats.completedBuilderDeals} completed</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <Building className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Resale Properties</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalResaleProperties}</p>
              <p className="text-xs text-purple-600 mt-1">{stats.activeResaleDeals} active, {stats.completedResaleDeals} completed</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <Building2 className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Total Properties</p>
              <p className="text-3xl font-bold text-orange-900">{stats.totalRentalProperties + stats.totalBuilderProperties + stats.totalResaleProperties}</p>
              <p className="text-xs text-orange-600 mt-1">All property types</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-full">
              <FileText className="w-6 h-6 text-orange-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Income Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-green-700">Rental Income</p>
              <p className="text-3xl font-bold text-green-900">₹{stats.completedRentalIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Completed:</span>
              <span className="font-semibold text-green-800">₹{stats.completedRentalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600">Upcoming:</span>
              <span className="font-semibold text-orange-800">₹{stats.upcomingRentalIncome.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-purple-700">Resale Income</p>
              <p className="text-3xl font-bold text-purple-900">₹{stats.completedResaleIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <Building2 className="w-6 h-6 text-purple-700" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-600">Completed:</span>
              <span className="font-semibold text-purple-800">₹{stats.completedResaleIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600">Upcoming:</span>
              <span className="font-semibold text-orange-800">₹{stats.upcomingResaleIncome.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-blue-700">Builder Income</p>
              <p className="text-3xl font-bold text-blue-900">₹{stats.completedBuilderIncome.toFixed(2)}L</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">Completed:</span>
              <span className="font-semibold text-blue-800">₹{stats.completedBuilderIncome.toFixed(2)}L</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600">Upcoming:</span>
              <span className="font-semibold text-orange-800">₹{stats.upcomingBuilderIncome.toFixed(2)}L</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Rental Value</p>
                  <p className="text-sm text-gray-600">{stats.totalRentalDeals} rental deals</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">₹{stats.totalRentalValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Resale Value</p>
                  <p className="text-sm text-gray-600">{stats.totalResaleDeals} resale deals</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-600">₹{stats.totalResaleValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Builder Value</p>
                  <p className="text-sm text-gray-600">{stats.totalBuilderDeals} builder deals</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">₹{stats.totalBuilderValue.toFixed(1)}L</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Rental Deals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Rental Deals</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('rental-property')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {stats.recentRentalDeals.length > 0 ? (
              stats.recentRentalDeals.map((deal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{deal.property_type || 'Rental'} Deal</p>
                    <p className="text-sm text-gray-600">{deal.client_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">₹{deal.brokerage_amount?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent rental deals</p>
            )}
          </div>
        </Card>

        {/* Recent Builder Deals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Builder Deals</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('builder-property')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {stats.recentBuilderDeals.length > 0 ? (
              stats.recentBuilderDeals.map((deal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Builder Deal</p>
                    <p className="text-sm text-gray-600">{deal.client_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">₹{deal.commission_amount?.toFixed(2) || '0'}L</p>
                    <p className="text-xs text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent builder deals</p>
            )}
          </div>
        </Card>

        {/* Recent Resale Deals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Resale Deals</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTabChange('resale-property')}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {stats.recentResaleDeals.length > 0 ? (
              stats.recentResaleDeals.map((deal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Resale Deal</p>
                    <p className="text-sm text-gray-600">{deal.buyer_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">₹{parseFloat(deal.commission_amount || deal.brokerage_amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent resale deals</p>
            )}
          </div>
        </Card>
      </div>

      {/* Business Entities & Deal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Entities</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{stats.totalClients}</p>
              <p className="text-sm text-blue-600">Clients</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <UserCheck className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-900">{stats.totalOwners}</p>
              <p className="text-sm text-orange-600">Owners</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{stats.totalBuilders}</p>
              <p className="text-sm text-green-600">Builders</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Building className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-900">{stats.totalLoanProviders}</p>
              <p className="text-sm text-purple-600">Loan Providers</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Active Rental Deals</span>
              </div>
              <span className="font-bold text-blue-600">{stats.activeRentalDeals}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Active Builder Deals</span>
              </div>
              <span className="font-bold text-green-600">{stats.activeBuilderDeals}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Active Resale Deals</span>
              </div>
              <span className="font-bold text-purple-600">{stats.activeResaleDeals}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Completed Rental Deals</span>
              </div>
              <span className="font-bold text-gray-600">{stats.completedRentalDeals}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Completed Builder Deals</span>
              </div>
              <span className="font-bold text-gray-600">{stats.completedBuilderDeals}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Completed Resale Deals</span>
              </div>
              <span className="font-bold text-gray-600">{stats.completedResaleDeals}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => onTabChange('rental-property')}
            className="flex flex-col items-center space-y-2 p-4 h-auto hover:bg-blue-50"
          >
            <Home className="w-6 h-6 text-blue-600" />
            <span className="text-sm">Rental Property</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onTabChange('resale-property')}
            className="flex flex-col items-center space-y-2 p-4 h-auto hover:bg-purple-50"
          >
            <Building2 className="w-6 h-6 text-purple-600" />
            <span className="text-sm">Resale Property</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onTabChange('builder-property')}
            className="flex flex-col items-center space-y-2 p-4 h-auto hover:bg-green-50"
          >
            <Building className="w-6 h-6 text-green-600" />
            <span className="text-sm">Builder Purchase</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onTabChange('reports')}
            className="flex flex-col items-center space-y-2 p-4 h-auto hover:bg-orange-50"
          >
            <BarChart3 className="w-6 h-6 text-orange-600" />
            <span className="text-sm">Reports</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BusinessDashboard;
