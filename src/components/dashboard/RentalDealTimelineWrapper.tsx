import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RentalDealTimeline from './RentalDealTimeline';

const RentalDealTimelineWrapper: React.FC = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  if (!dealId) {
    return <div>Deal ID not found</div>;
  }

  return (
    <RentalDealTimeline
      dealId={dealId}
      dealType="residential" // Default to residential
      onBack={() => navigate(-1)}
    />
  );
};

export default RentalDealTimelineWrapper;
