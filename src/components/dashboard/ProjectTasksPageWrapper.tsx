import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectTasksPage from './ProjectTasksPage';

const ProjectTasksPageWrapper: React.FC = () => {
  const { projectId, dealId } = useParams<{ projectId?: string; dealId?: string }>();
  const [actualProjectId, setActualProjectId] = useState<string | undefined>(projectId);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchDealProjectId = async () => {
      if (!dealId) {
        setActualProjectId(projectId);
        return;
      }
      
      setLoading(true);
      try {
        // Check rental deals first
        const { data: rentalDeal, error: rentalError } = await supabase
          .from('rental_deals')
          .select('project_id')
          .eq('id', dealId)
          .single();

        if (rentalDeal && !rentalError) {
          console.log('🔍 ProjectTasksPageWrapper - Found rental deal, project_id:', rentalDeal.project_id);
          setActualProjectId(rentalDeal.project_id);
          return;
        }

        // Check builder deals
        const { data: builderDeal, error: builderError } = await supabase
          .from('builder_deals')
          .select('project_id')
          .eq('id', dealId)
          .single();

        if (builderDeal && !builderError) {
          console.log('🔍 ProjectTasksPageWrapper - Found builder deal, project_id:', builderDeal.project_id);
          setActualProjectId(builderDeal.project_id);
          return;
        }

        // If no deal found, use dealId as fallback
        console.log('🔍 ProjectTasksPageWrapper - No deal found, using dealId as fallback:', dealId);
        setActualProjectId(dealId);
      } catch (error) {
        console.error('Error fetching deal project_id:', error);
        setActualProjectId(dealId);
      } finally {
        setLoading(false);
      }
    };

    fetchDealProjectId();
  }, [dealId, projectId]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!actualProjectId) {
    return <div>Project ID not found</div>;
  }

  console.log('🔍 ProjectTasksPageWrapper - Final projectId:', actualProjectId);
  return <ProjectTasksPage projectId={actualProjectId} />;
};

export default ProjectTasksPageWrapper;
