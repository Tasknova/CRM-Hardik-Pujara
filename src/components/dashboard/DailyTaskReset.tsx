import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ResetStatus {
  success: boolean;
  message: string;
  tasks_reset?: number;
  reset_time?: string;
}

interface JobStatus {
  success: boolean;
  job_id?: number;
  schedule?: string;
  command?: string;
  active?: boolean;
  next_run?: string;
}

export const DailyTaskReset: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<ResetStatus | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const handleManualReset = async () => {
    setIsResetting(true);
    setResetStatus(null);
    
    try {
      const { data, error } = await supabase.rpc('manual_reset_daily_tasks');
      
      if (error) {
        console.error('Error resetting daily tasks:', error);
        setResetStatus({
          success: false,
          message: `Error: ${error.message}`
        });
      } else {
        setResetStatus(data);
      }
    } catch (err) {
      console.error('Error calling reset function:', err);
      setResetStatus({
        success: false,
        message: 'Failed to reset daily tasks'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const checkJobStatus = async () => {
    setIsLoadingStatus(true);
    
    try {
      const { data, error } = await supabase.rpc('get_daily_reset_status');
      
      if (error) {
        console.error('Error checking job status:', error);
        setJobStatus({
          success: false,
          message: `Error: ${error.message}`
        });
      } else {
        setJobStatus(data);
      }
    } catch (err) {
      console.error('Error checking job status:', err);
      setJobStatus({
        success: false,
        message: 'Failed to check job status'
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Daily Task Reset</h3>
        <div className="flex space-x-2">
          <Button
            onClick={checkJobStatus}
            disabled={isLoadingStatus}
            variant="outline"
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            {isLoadingStatus ? 'Checking...' : 'Check Status'}
          </Button>
          <Button
            onClick={handleManualReset}
            disabled={isResetting}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting...' : 'Manual Reset'}
          </Button>
        </div>
      </div>

      {/* Job Status */}
      {jobStatus && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            {jobStatus.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className="font-medium">Scheduled Job Status</span>
          </div>
          
          {jobStatus.success ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Job ID:</strong> {jobStatus.job_id}</p>
              <p><strong>Schedule:</strong> {jobStatus.schedule}</p>
              <p><strong>Status:</strong> {jobStatus.active ? 'Active' : 'Inactive'}</p>
              <p><strong>Next Run:</strong> {jobStatus.next_run}</p>
            </div>
          ) : (
            <p className="text-sm text-red-600">{jobStatus.message}</p>
          )}
        </div>
      )}

      {/* Reset Status */}
      {resetStatus && (
        <div className={`p-4 rounded-lg ${
          resetStatus.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center mb-2">
            {resetStatus.success ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className="font-medium">
              {resetStatus.success ? 'Reset Successful' : 'Reset Failed'}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{resetStatus.message}</p>
          
          {resetStatus.success && (
            <div className="text-sm text-gray-600 space-y-1">
              {resetStatus.tasks_reset !== undefined && (
                <p><strong>Tasks Reset:</strong> {resetStatus.tasks_reset}</p>
              )}
              {resetStatus.reset_time && (
                <p><strong>Reset Time:</strong> {new Date(resetStatus.reset_time).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p><strong>Automatic Reset:</strong> Daily tasks are automatically reset to "pending" status every day at 11:00 AM UTC.</p>
        <p><strong>Manual Reset:</strong> Use the "Manual Reset" button to immediately reset all completed/skipped tasks.</p>
      </div>
    </Card>
  );
};
