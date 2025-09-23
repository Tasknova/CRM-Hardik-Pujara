import { supabase } from '../lib/supabase';

export interface RentalDeal {
  id: string;
  project_name: string;
  deal_type: 'residential' | 'commercial';
  client_name: string;
  client_email?: string;
  client_phone?: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  property_address: string;
  property_type: string;
  rental_amount: number;
  security_deposit: number;
  brokerage_amount: number;
  start_date?: string;
  end_date?: string;
  additional_notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  current_stage: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RentalDealStage {
  id: string;
  deal_id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_date?: string;
  actual_date?: string;
  assigned_to?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalDealTeamMember {
  id: string;
  deal_id: string;
  member_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
}

class RentalDealsService {
  // Get all rental deals
  async getAllDeals(): Promise<RentalDeal[]> {
    const { data, error } = await supabase
      .from('rental_deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rental deals:', error);
      throw error;
    }

    return data || [];
  }

  // Get rental deal by ID
  async getDealById(id: string): Promise<RentalDeal | null> {
    const { data, error } = await supabase
      .from('rental_deals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching rental deal:', error);
      throw error;
    }

    return data;
  }

  // Create new rental deal
  async createDeal(dealData: Omit<RentalDeal, 'id' | 'created_at' | 'updated_at'>): Promise<RentalDeal> {
    const { data, error } = await supabase
      .from('rental_deals')
      .insert([dealData])
      .select()
      .single();

    if (error) {
      console.error('Error creating rental deal:', error);
      throw error;
    }

    return data;
  }

  // Update rental deal
  async updateDeal(id: string, updates: Partial<RentalDeal>): Promise<RentalDeal> {
    const { data, error } = await supabase
      .from('rental_deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rental deal:', error);
      throw error;
    }

    return data;
  }

  // Delete rental deal
  async deleteDeal(id: string): Promise<void> {
    const { error } = await supabase
      .from('rental_deals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting rental deal:', error);
      throw error;
    }
  }

  // Get stages for a deal
  async getDealStages(dealId: string): Promise<RentalDealStage[]> {
    const { data, error } = await supabase
      .from('rental_deal_stages')
      .select(`
        *,
        assigned_member:profiles(name)
      `)
      .eq('deal_id', dealId)
      .order('stage_order');

    if (error) {
      console.error('Error fetching deal stages:', error);
      throw error;
    }

    return data || [];
  }

  // Create stages for a deal
  async createDealStages(dealId: string, stages: Omit<RentalDealStage, 'id' | 'deal_id' | 'created_at' | 'updated_at'>[]): Promise<RentalDealStage[]> {
    const stageInserts = stages.map(stage => ({
      ...stage,
      deal_id: dealId
    }));

    const { data, error } = await supabase
      .from('rental_deal_stages')
      .insert(stageInserts)
      .select();

    if (error) {
      console.error('Error creating deal stages:', error);
      throw error;
    }

    return data || [];
  }

  // Update stage
  async updateStage(stageId: string, updates: Partial<RentalDealStage>): Promise<RentalDealStage> {
    const { data, error } = await supabase
      .from('rental_deal_stages')
      .update(updates)
      .eq('id', stageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating stage:', error);
      throw error;
    }

    return data;
  }

  // Mark stage as complete
  async completeStage(stageId: string): Promise<RentalDealStage> {
    const { data, error } = await supabase
      .from('rental_deal_stages')
      .update({
        status: 'completed',
        actual_date: new Date().toISOString()
      })
      .eq('id', stageId)
      .select()
      .single();

    if (error) {
      console.error('Error completing stage:', error);
      throw error;
    }

    return data;
  }

  // Get team members for a deal
  async getDealTeamMembers(dealId: string): Promise<RentalDealTeamMember[]> {
    const { data, error } = await supabase
      .from('rental_deal_team_members')
      .select(`
        *,
        member:profiles(id, name, email, role)
      `)
      .eq('deal_id', dealId);

    if (error) {
      console.error('Error fetching deal team members:', error);
      throw error;
    }

    return data || [];
  }

  // Add team member to deal
  async addTeamMember(dealId: string, memberId: string, role: string = 'member'): Promise<RentalDealTeamMember> {
    const { data, error } = await supabase
      .from('rental_deal_team_members')
      .insert([{
        deal_id: dealId,
        member_id: memberId,
        role
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding team member:', error);
      throw error;
    }

    return data;
  }

  // Remove team member from deal
  async removeTeamMember(dealId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('rental_deal_team_members')
      .delete()
      .eq('deal_id', dealId)
      .eq('member_id', memberId);

    if (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  // Get deals assigned to a specific member
  async getMemberDeals(memberId: string): Promise<RentalDeal[]> {
    const { data, error } = await supabase
      .from('rental_deals')
      .select(`
        *,
        rental_deal_team_members!inner(member_id)
      `)
      .eq('rental_deal_team_members.member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching member deals:', error);
      throw error;
    }

    return data || [];
  }

  // Get deal statistics
  async getDealStatistics(): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    residential: number;
    commercial: number;
  }> {
    const { data, error } = await supabase
      .from('rental_deals')
      .select('status, deal_type');

    if (error) {
      console.error('Error fetching deal statistics:', error);
      throw error;
    }

    const stats = {
      total: data?.length || 0,
      active: data?.filter(d => d.status === 'active').length || 0,
      completed: data?.filter(d => d.status === 'completed').length || 0,
      cancelled: data?.filter(d => d.status === 'cancelled').length || 0,
      residential: data?.filter(d => d.deal_type === 'residential').length || 0,
      commercial: data?.filter(d => d.deal_type === 'commercial').length || 0
    };

    return stats;
  }
}

export const rentalDealsService = new RentalDealsService();
