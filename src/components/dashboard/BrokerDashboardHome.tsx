import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface BrokerDashboardHomeProps {
  brokerId: string;
}

interface BrokerStats {
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
}

const BrokerDashboardHome: React.FC<BrokerDashboardHomeProps> = ({ brokerId }) => {
  const [stats, setStats] = useState<BrokerStats>({
    totalDeals: 0,
    activeDeals: 0,
    completedDeals: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    const setupSubscriptions = () => {
      fetchStats();

      // Set up real-time subscription for task updates
      channel = supabase
        .channel('broker-dashboard-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `broker_id=eq.${brokerId}`
          },
          (payload) => {
            console.log('Task updated in broker dashboard:', payload);
            // Refetch stats when task is updated
            fetchStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rental_deals',
            filter: `broker_id=eq.${brokerId}`
          },
          (payload) => {
            console.log('Rental deal updated:', payload);
            fetchStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'builder_deals',
            filter: `broker_id=eq.${brokerId}`
          },
          (payload) => {
            console.log('Builder deal updated:', payload);
            fetchStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'resale_deals',
            filter: `broker_id=eq.${brokerId}`
          },
          (payload) => {
            console.log('Resale deal updated:', payload);
            fetchStats();
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerId]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch deals associated with this broker
      const [rentalDeals, builderDeals, resaleDeals, tasks] = await Promise.all([
        supabase.from('rental_deals').select('id, rental_amount, brokerage_amount, status, broker_id').eq('broker_id', brokerId),
        supabase.from('builder_deals').select('id, property_price, commission_amount, status, broker_id').eq('broker_id', brokerId),
        supabase.from('resale_deals').select('id, property_price, commission_amount, brokerage_amount, status, broker_id').eq('broker_id', brokerId),
        supabase.from('tasks').select('id, status, broker_id').eq('broker_id', brokerId)
      ]);

      const allDeals = [
        ...(rentalDeals.data || []),
        ...(builderDeals.data || []),
        ...(resaleDeals.data || [])
      ];

      const totalDeals = allDeals.length;
      const activeDeals = allDeals.filter(deal => deal.status === 'active').length;
      const completedDeals = allDeals.filter(deal => deal.status === 'completed').length;



      // Process tasks
      const allTasks = tasks.data || [];
      const totalTasks = allTasks.length;
      // Pending tasks = all tasks that are not completed
      const pendingTasks = allTasks.filter(task => task.status !== 'completed').length;
      const completedTasks = allTasks.filter(task => task.status === 'completed').length;

      setStats({
        totalDeals,
        activeDeals,
        completedDeals,
        totalTasks,
        pendingTasks,
        completedTasks
      });
    } catch (error) {
      console.error('Error fetching broker stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your deals and tasks with Propazone</p>
      </div>

      {/* Stats Cards */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total Deals</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalDeals}</p>
              <p className="text-xs text-purple-600 mt-1">{stats.activeDeals} active, {stats.completedDeals} completed</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <Building2 className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalTasks}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.pendingTasks} pending, {stats.completedTasks} completed</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <AlertCircle className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="font-medium text-gray-900">Active Deals</span>
              <span className="font-bold text-purple-600">{stats.activeDeals}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">Completed Deals</span>
              <span className="font-bold text-gray-600">{stats.completedDeals}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-gray-900">Pending Tasks</span>
              <span className="font-bold text-blue-600">{stats.pendingTasks}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-gray-900">Completed Tasks</span>
              <span className="font-bold text-green-600">{stats.completedTasks}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BrokerDashboardHome;

