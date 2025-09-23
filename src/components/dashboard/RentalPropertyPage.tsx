import React, { useState } from 'react';
import { Home, Building2, ArrowLeft, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import RentalDealForm from './RentalDealForm';
import RentalDealsList from './RentalDealsList';

interface RentalPropertyPageProps {
  onBack: () => void;
}

type RentalDealType = 'residential' | 'commercial' | null;
type ViewMode = 'main' | 'list' | 'form';

const RentalPropertyPage: React.FC<RentalPropertyPageProps> = ({ onBack }) => {
  const [selectedDealType, setSelectedDealType] = useState<RentalDealType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main');

  const handleDealTypeSelect = (type: 'residential' | 'commercial') => {
    setSelectedDealType(type);
    setViewMode('list');
  };

  const handleCreateNew = () => {
    setViewMode('form');
  };

  const handleBack = () => {
    if (viewMode === 'form') {
      setViewMode('list');
    } else if (viewMode === 'list') {
      setViewMode('main');
      setSelectedDealType(null);
    } else {
      onBack();
    }
  };

  if (viewMode === 'form' && selectedDealType) {
    return (
      <RentalDealForm
        dealType={selectedDealType}
        onBack={handleBack}
        onSuccess={() => {
          setViewMode('list');
          // Success - return to list view
        }}
      />
    );
  }

  if (viewMode === 'list' && selectedDealType) {
    return (
      <RentalDealsList
        dealType={selectedDealType}
        onBack={handleBack}
        onCreateNew={handleCreateNew}
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
              onClick={handleBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rental Property Management</h1>
              <p className="text-gray-600 mt-1">Manage residential and commercial rental deals</p>
            </div>
          </div>
        </div>

        {/* Deal Type Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          {/* Residential Rental Deal */}
          <Card 
            className="p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-300"
            onClick={() => handleDealTypeSelect('residential')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Home className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-green-600 transition-colors duration-300">
                  Residential Rental Deal
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Manage residential rental properties including apartments, houses, and condos with individual clients.
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
          </Card>

          {/* Commercial Rental Deal */}
          <Card 
            className="p-8 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-300"
            onClick={() => handleDealTypeSelect('commercial')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors duration-300">
                  Commercial Rental Deal
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Handle commercial rental properties including offices, retail spaces, and warehouses for business clients.
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
          </Card>
        </div>

        {/* Quick Stats or Recent Deals could go here */}
        <div className="mt-12 text-center text-gray-500">
          <p>Click on a deal type above to view existing deals or create new ones</p>
        </div>
      </div>
    </div>
  );
};

export default RentalPropertyPage;
