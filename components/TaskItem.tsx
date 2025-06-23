import React from 'react';
import { Task, TaskStatus } from '../types';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon } from './icons/HeroIcons';

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  canMarkDone: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange, canMarkDone }) => {
  const getStatusClasses = (status: TaskStatus): { bg: string, text: string, iconColor: string } => {
    switch (status) {
      case TaskStatus.DONE: return { bg: 'bg-green-100 dark:bg-green-700/30', text: 'text-green-700 dark:text-green-300', iconColor: 'text-green-500 dark:text-green-400' };
      case TaskStatus.IN_PROGRESS: return { bg: 'bg-amber-100 dark:bg-amber-600/30', text: 'text-amber-700 dark:text-amber-300', iconColor: 'text-amber-500 dark:text-amber-400' };
      case TaskStatus.PENDING: return { bg: 'bg-red-100 dark:bg-red-700/30', text: 'text-red-700 dark:text-red-300', iconColor: 'text-red-500 dark:text-red-400' };
      default: return { bg: 'bg-neutral-light dark:bg-neutral-dark', text: 'text-neutral-dark dark:text-neutral-light', iconColor: 'text-neutral-DEFAULT' };
    }
  };

  const statusInfo = getStatusClasses(task.status);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return <CheckCircleIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />;
      case TaskStatus.IN_PROGRESS: return <ClockIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />;
      case TaskStatus.PENDING: return <ExclamationCircleIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />;
      default: return null;
    }
  };

  const handleToggleStatus = () => {
    // Basic toggle: If done, mark pending. If pending/in_progress, mark done.
    if (task.status === TaskStatus.DONE) {
      onStatusChange(task.id, TaskStatus.PENDING);
    } else {
      onStatusChange(task.id, TaskStatus.DONE);
    }
  };

  return (
    <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-lg rounded-lg p-5 mb-4 transition-shadow hover:shadow-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-lg font-semibold text-neutral-darkest dark:text-neutral-lightest">{task.title}</h4>
          {canMarkDone && (
            <button
              onClick={handleToggleStatus}
              className={`p-1.5 rounded-full transition-colors duration-150 ${task.status === TaskStatus.DONE 
                ? 'bg-green-100 hover:bg-green-200 dark:bg-green-600/50 dark:hover:bg-green-500/50' 
                : 'bg-neutral-light hover:bg-neutral-DEFAULT/30 dark:bg-neutral-darkest dark:hover:bg-neutral-darkest/70'}`}
              title={task.status === TaskStatus.DONE ? "Mark as Pending" : "Mark as Done"}
              aria-label={task.status === TaskStatus.DONE ? "Mark task as pending" : "Mark task as done"}
            >
              {task.status === TaskStatus.DONE 
                ? <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-300" /> 
                : <CheckCircleIcon className="h-6 w-6 text-neutral-DEFAULT dark:text-neutral-light/70" />}
            </button>
          )}
        </div>
        <p className="text-sm text-neutral-DEFAULT dark:text-neutral-light mt-1 mb-3 whitespace-pre-wrap">{task.description}</p>
      </div>
      
      <div className="mt-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-neutral-DEFAULT dark:text-neutral-light/80 mb-3">
          <p>For: <span className="font-medium text-primary-DEFAULT dark:text-primary-light">{task.assignedTo}</span></p>
          <p>Due: <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span></p>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
            {getStatusIcon(task.status)}
            <span className="ml-1.5">{task.status}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;