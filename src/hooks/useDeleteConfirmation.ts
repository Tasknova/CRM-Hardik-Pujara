import { useState, useCallback } from 'react';
import { Task, DailyTask } from '../types';

interface DeleteConfirmationState {
  isOpen: boolean;
  task: (Task | DailyTask) | null;
  taskType: 'regular' | 'daily';
  onConfirm: (() => void) | null;
}

export const useDeleteConfirmation = () => {
  const [state, setState] = useState<DeleteConfirmationState>({
    isOpen: false,
    task: null,
    taskType: 'regular',
    onConfirm: null
  });

  const showDeleteConfirmation = useCallback((
    task: Task | DailyTask,
    taskType: 'regular' | 'daily',
    onConfirm: () => void
  ) => {
    setState({
      isOpen: true,
      task,
      taskType,
      onConfirm
    });
  }, []);

  const hideDeleteConfirmation = useCallback(() => {
    setState({
      isOpen: false,
      task: null,
      taskType: 'regular',
      onConfirm: null
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (state.onConfirm) {
      state.onConfirm();
    }
    hideDeleteConfirmation();
  }, [state.onConfirm, hideDeleteConfirmation]);

  return {
    isOpen: state.isOpen,
    task: state.task,
    taskType: state.taskType,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    confirmDelete
  };
};
