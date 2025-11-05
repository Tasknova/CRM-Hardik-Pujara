import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RentalDeal {
  id: string;
  project_name: string;
  deal_type: string;
  client_name: string;
  owner_name: string;
  property_address: string;
  rental_amount: number;
  status: string;
  created_at: string;
}

interface BuilderDeal {
  id: string;
  project_name: string;
  deal_type: string;
  client_name: string;
  builder_name: string;
  property_address: string;
  property_price: number;
  status: string;
  created_at: string;
}

export function useRealtimeRentalDeals(dealType: 'residential' | 'commercial') {
  const [deals, setDeals] = useState<RentalDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rental_deals')
        .select('*')
        .eq('deal_type', dealType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      setError('Failed to fetch rental deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();

    const dealsSubscription = supabase
      .channel('rental_deals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_deals'
        },
        (payload) => {
          console.log('Rental deals real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newDeal = payload.new as RentalDeal;
            if (newDeal.deal_type === dealType) {
              setDeals(prev => [newDeal, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedDeal = payload.new as RentalDeal;
            if (updatedDeal.deal_type === dealType) {
              setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedDeal = payload.old as RentalDeal;
            setDeals(prev => prev.filter(d => d.id !== deletedDeal.id));
          }
        }
      )
      .subscribe();

    return () => {
      dealsSubscription.unsubscribe();
    };
  }, [dealType]);

  return { deals, loading, error, refetch: fetchDeals };
}

export function useRealtimeBuilderDeals(dealType: 'residential' | 'commercial') {
  const [deals, setDeals] = useState<BuilderDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('builder_deals')
        .select('*')
        .eq('deal_type', dealType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      setError('Failed to fetch builder deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();

    const dealsSubscription = supabase
      .channel('builder_deals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'builder_deals'
        },
        (payload) => {
          console.log('Builder deals real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newDeal = payload.new as BuilderDeal;
            if (newDeal.deal_type === dealType) {
              setDeals(prev => [newDeal, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedDeal = payload.new as BuilderDeal;
            if (updatedDeal.deal_type === dealType) {
              setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedDeal = payload.old as BuilderDeal;
            setDeals(prev => prev.filter(d => d.id !== deletedDeal.id));
          }
        }
      )
      .subscribe();

    return () => {
      dealsSubscription.unsubscribe();
    };
  }, [dealType]);

  return { deals, loading, error, refetch: fetchDeals };
}

interface ResaleDeal {
  id: string;
  project_name: string;
  deal_type: string;
  owner_name: string;
  buyer_name: string;
  property_address: string;
  property_price: number;
  status: string;
  created_at: string;
  current_stage: number;
}

export function useRealtimeResaleDeals() {
  const [deals, setDeals] = useState<ResaleDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resale_deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      setError('Failed to fetch resale deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();

    const dealsSubscription = supabase
      .channel('resale_deals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resale_deals'
        },
        (payload) => {
          console.log('Resale deals real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newDeal = payload.new as ResaleDeal;
            setDeals(prev => [newDeal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedDeal = payload.new as ResaleDeal;
            setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
          } else if (payload.eventType === 'DELETE') {
            const deletedDeal = payload.old as ResaleDeal;
            setDeals(prev => prev.filter(d => d.id !== deletedDeal.id));
          }
        }
      )
      .subscribe();

    return () => {
      dealsSubscription.unsubscribe();
    };
  }, []);

  return { deals, loading, error, refetch: fetchDeals };
}