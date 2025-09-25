import React, { useState } from 'react';
import { ArrowLeft, Home, Building, Eye } from 'lucide-react';
import Button from '../ui/Button';
import BuilderDealForm from './BuilderDealForm';
import BuilderDealsList from './BuilderDealsList';

type DealType = 'residential' | 'commercial';
type ViewMode = 'main' | 'list' | 'form' | 'edit';

interface BuilderPropertyPageProps {
  onBack: () => void;
}

const BuilderPropertyPage: React.FC<BuilderPropertyPageProps> = ({ onBack }) => {
  const [selectedDealType, setSelectedDealType] = useState<DealType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [editDealId, setEditDealId] = useState<string | null>(null);

  const handleDealTypeSelect = (type: DealType) => {
    setSelectedDealType(type);
    setViewMode('list');
  };

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleEditDeal = (dealId: string) => {
    setEditDealId(dealId);
    setViewMode('edit');
  };

  const handleBack = () => {
    if (viewMode === 'form' || viewMode === 'edit') {
      setViewMode('list');
      setEditDealId(null);
    } else if (viewMode === 'list') {
      setViewMode('main');
      setSelectedDealType(null);
    } else {
      onBack();
    }
  };

  if (viewMode === 'form' && selectedDealType) {
    return (
      <BuilderDealForm
        dealType={selectedDealType}
        onBack={handleBack}
        onSuccess={() => {
          setViewMode('list');
        }}
      />
    );
  }

  if (viewMode === 'edit' && selectedDealType && editDealId) {
    return (
      <BuilderDealForm
        dealType={selectedDealType}
        onBack={handleBack}
        onSuccess={() => {
          setViewMode('list');
        }}
        editDealId={editDealId}
      />
    );
  }

  if (viewMode === 'list' && selectedDealType) {
    return (
      <BuilderDealsList
        dealType={selectedDealType}
        onBack={handleBack}
        onCreateNew={handleCreateNew}
        onEditDeal={handleEditDeal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Builder Purchase Management</h1>
              <p className="text-gray-600 mt-1">Manage residential and commercial builder purchase deals</p>
            </div>
          </div>
        </div>

        {/* Deal Type Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          {/* Residential Builder Purchase */}
          <div 
            className="p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-300 rounded-lg bg-white shadow-sm"
            onClick={() => handleDealTypeSelect('residential')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Home className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-green-600 transition-colors duration-300">
                  Residential Builder Purchase
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Manage residential builder purchase deals including apartments, houses, and condos with construction companies.
                </p>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDealTypeSelect('residential');
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Eye className="w-5 h-5" />
                <span>View Residential Deals</span>
              </Button>
            </div>
          </div>

          {/* Commercial Builder Purchase */}
          <div 
            className="p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-300 rounded-lg bg-white shadow-sm"
            onClick={() => handleDealTypeSelect('commercial')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Building className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors duration-300">
                  Commercial Builder Purchase
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Handle commercial builder purchase deals including offices, retail spaces, and warehouses for business partnerships.
                </p>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDealTypeSelect('commercial');
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Eye className="w-5 h-5" />
                <span>View Commercial Deals</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats or Recent Deals could go here */}
        <div className="mt-12 text-center text-gray-500">
          <p>Click on a deal type above to view existing deals or create new ones</p>
        </div>
      </div>
    </div>
  );
};

export default BuilderPropertyPage;
