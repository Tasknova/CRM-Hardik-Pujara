import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import ResaleDealsList from './ResaleDealsList';
import ResaleDealForm from './ResaleDealForm';

interface ResalePropertyPageProps {
  onBack: () => void;
}

type ViewMode = 'list' | 'form' | 'edit';

const ResalePropertyPage: React.FC<ResalePropertyPageProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editDealId, setEditDealId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setViewMode('form');
    setEditDealId(null);
  };

  const handleEditDeal = (dealId: string) => {
    setEditDealId(dealId);
    setViewMode('edit');
  };

  const handleBack = () => {
    if (viewMode === 'form' || viewMode === 'edit') {
      setViewMode('list');
      setEditDealId(null);
    } else {
      onBack();
    }
  };

  if (viewMode === 'form') {
    return (
      <ResaleDealForm
        onBack={handleBack}
      />
    );
  }

  if (viewMode === 'edit' && editDealId) {
    return (
      <ResaleDealForm
        onBack={handleBack}
        editDealId={editDealId}
      />
    );
  }

  return (
    <ResaleDealsList
      onBack={handleBack}
      onCreateNew={handleCreateNew}
      onEditDeal={handleEditDeal}
    />
  );
};

export default ResalePropertyPage;
