import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Task, Department, TaskStatus } from '../types';
import { ALL_DEPARTMENTS_LIST } from '../constants';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id' | 'createdBy' | 'status'>) => void;
  initialData?: Task;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<Department>(ALL_DEPARTMENTS_LIST[0]);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialData && isOpen) { // ensure reset only when modal is opened with initialData
      setTitle(initialData.title);
      setDescription(initialData.description);
      setAssignedTo(initialData.assignedTo);
      setDueDate(new Date(initialData.dueDate).toISOString().split('T')[0]);
    } else if (isOpen) { // Reset form for creation when modal opens without initialData
      setTitle('');
      setDescription('');
      setAssignedTo(ALL_DEPARTMENTS_LIST[0]);
      setDueDate('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
        alert("Title and Due Date are required.");
        return;
    }
    onSubmit({
      title,
      description,
      assignedTo,
      dueDate: new Date(dueDate),
    });
    onClose(); 
  };

  const commonInputClasses = "mt-1 block w-full px-3 py-2 border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md shadow-sm focus:outline-none focus:ring-primary-DEFAULT focus:border-primary-DEFAULT sm:text-sm bg-white dark:bg-neutral-darkest dark:text-neutral-lightest placeholder-neutral-DEFAULT/70 dark:placeholder-neutral-light/70";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Title</label>
          <input
            type="text"
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={commonInputClasses}
            placeholder="e.g., Finalize Q1 Budget"
          />
        </div>
        <div>
          <label htmlFor="task-description" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Description</label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={commonInputClasses}
            placeholder="Add more details about the task..."
          />
        </div>
        <div>
          <label htmlFor="task-assignedTo" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Assign To Department</label>
          <select
            id="task-assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value as Department)}
            className={`${commonInputClasses} pr-10`} // Added pr-10 for select arrow
          >
            {ALL_DEPARTMENTS_LIST.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-dueDate" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Due Date</label>
          <input
            type="date"
            id="task-dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className={commonInputClasses}
          />
        </div>
        <div className="pt-3 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md shadow-sm text-sm font-medium text-neutral-dark dark:text-neutral-lightest bg-white dark:bg-neutral-dark hover:bg-neutral-light dark:hover:bg-neutral-darkest/70 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT transition-all active:scale-95 duration-100 ease-in-out"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT transition-all active:scale-95 duration-100 ease-in-out"
          >
            {initialData ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskFormModal;