import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BuilderDealTimeline from './BuilderDealTimeline';

const BuilderDealTimelineWrapper: React.FC = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  if (!dealId) {
    return <div>Deal ID not found</div>;
  }

  return (
    <BuilderDealTimeline
      dealId={dealId}
      dealType="residential" // Default to residential
      onBack={() => navigate(-1)}
    />
  );
};

export default BuilderDealTimelineWrapper;
