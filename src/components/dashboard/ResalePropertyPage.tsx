import React from 'react';
import { ArrowLeft, Building2, Home, Construction } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ResalePropertyPageProps {
  onBack: () => void;
}

const ResalePropertyPage: React.FC<ResalePropertyPageProps> = ({ onBack }) => {
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
              <h1 className="text-3xl font-bold text-gray-900">Resale Property Management</h1>
              <p className="text-gray-600 mt-1">Manage property resale transactions and deals</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-2xl mx-auto mt-16">
          <Card className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-6">
              <Construction className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Resale Property Management
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              The Resale Property management feature is currently under development. 
              This section will include tools for managing property resale transactions, 
              buyer-seller coordination, documentation, and deal tracking.
            </p>
            
            <div className="bg-orange-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-orange-900 mb-3">Planned Features:</h3>
              <ul className="text-sm text-orange-800 space-y-2 text-left">
                <li>• Property listing management</li>
                <li>• Buyer and seller coordination</li>
                <li>• Document verification and processing</li>
                <li>• Price negotiation tracking</li>
                <li>• Legal documentation support</li>
                <li>• Transaction timeline management</li>
                <li>• Commission and payment tracking</li>
              </ul>
            </div>
            
            <div className="text-sm text-gray-500">
              This feature will be available in a future update. 
              For now, please use the Rental Property section for rental deals.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResalePropertyPage;
