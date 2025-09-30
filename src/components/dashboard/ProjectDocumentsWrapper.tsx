import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectDocuments from './ProjectDocuments';

const ProjectDocumentsWrapper: React.FC = () => {
  const { projectId, dealId } = useParams<{ projectId?: string; dealId?: string }>();
  const [actualProjectId, setActualProjectId] = useState<string | undefined>(projectId);
  const [loading, setLoading] = useState(false);
  
  console.log('🔍 ProjectDocumentsWrapper - URL params:', { projectId, dealId });
  
  useEffect(() => {
    const fetchDealProjectId = async () => {
      console.log('🔍 ProjectDocumentsWrapper - fetchDealProjectId called');
      console.log('🔍 ProjectDocumentsWrapper - dealId:', dealId, 'projectId:', projectId);
      
      if (!dealId) {
        console.log('🔍 ProjectDocumentsWrapper - No dealId, using projectId:', projectId);
        setActualProjectId(projectId);
        return;
      }
      
      setLoading(true);
      try {
        console.log('🔍 ProjectDocumentsWrapper - Checking rental deals for dealId:', dealId);
        // Check rental deals first
        const { data: rentalDeal, error: rentalError } = await supabase
          .from('rental_deals')
          .select('project_id')
          .eq('id', dealId)
          .single();

        console.log('🔍 ProjectDocumentsWrapper - Rental deal query result:', { rentalDeal, rentalError });

        if (rentalDeal && !rentalError) {
          console.log('🔍 ProjectDocumentsWrapper - Found rental deal, project_id:', rentalDeal.project_id);
          setActualProjectId(rentalDeal.project_id);
          return;
        }

        console.log('🔍 ProjectDocumentsWrapper - Checking builder deals for dealId:', dealId);
        // Check builder deals
        const { data: builderDeal, error: builderError } = await supabase
          .from('builder_deals')
          .select('project_id')
          .eq('id', dealId)
          .single();

        console.log('🔍 ProjectDocumentsWrapper - Builder deal query result:', { builderDeal, builderError });

        if (builderDeal && !builderError) {
          console.log('🔍 ProjectDocumentsWrapper - Found builder deal, project_id:', builderDeal.project_id);
          setActualProjectId(builderDeal.project_id);
          return;
        }

        // If no deal found, use dealId as fallback
        console.log('🔍 ProjectDocumentsWrapper - No deal found, using dealId as fallback:', dealId);
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
    console.log('🔍 ProjectDocumentsWrapper - Loading...');
    return <div>Loading...</div>;
  }
  
  if (!actualProjectId) {
    console.log('🔍 ProjectDocumentsWrapper - No actualProjectId found');
    return <div>Project ID not found</div>;
  }

  console.log('🔍 ProjectDocumentsWrapper - Final projectId being passed to ProjectDocuments:', actualProjectId);
  return <ProjectDocuments projectId={actualProjectId} />;
};

export default ProjectDocumentsWrapper;
