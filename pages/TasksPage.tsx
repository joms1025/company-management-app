import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskStatus, UserRole, Department } from '../types';
import { getTasksForDepartment, addTask as addTaskService, updateTaskStatus as updateTaskStatusService } from '../services/mockDataService';
import TaskItem from '../components/TaskItem';
import TaskFormModal from '../components/TaskFormModal';
import { PlusIcon, ClipboardDocumentListIcon } from '../components/icons/HeroIcons';
import { ALL_DEPARTMENTS_LIST } from '../constants';
import Spinner from '../components/Spinner';


const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'ALL'>(() => 
    user?.role === UserRole.ADMIN ? 'ALL' : (user?.department || 'ALL')
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (user) {
      setLoading(true);
      setError(null);
      try {
        let fetchedTasks: Task[] = [];
        if (user.role === UserRole.ADMIN) {
          fetchedTasks = await getTasksForDepartment(departmentFilter as Department, user.role); // Service handles 'ALL' logic for admin
        } else { // Regular user
          fetchedTasks = await getTasksForDepartment(user.department, user.role);
        }
        setTasks(fetchedTasks.sort((a,b) => {
            if (a.status === TaskStatus.PENDING && b.status !== TaskStatus.PENDING) return -1;
            if (a.status !== TaskStatus.PENDING && b.status === TaskStatus.PENDING) return 1;
            if (a.status === TaskStatus.IN_PROGRESS && b.status === TaskStatus.DONE) return -1;
            if (a.status === TaskStatus.DONE && b.status === TaskStatus.IN_PROGRESS) return 1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }));
      } catch (e: any) {
        console.error("Error fetching tasks:", e);
        setError(`Failed to load tasks: ${e.message}`);
        setTasks([]); // Clear tasks on error
      } finally {
        setLoading(false);
      }
    } else {
        setTasks([]);
        setLoading(false);
    }
  }, [user, departmentFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  useEffect(() => {
    if (user) {
      if (user.role !== UserRole.ADMIN && user.department) {
        setDepartmentFilter(user.department);
      } else if (user.role === UserRole.ADMIN && departmentFilter !== 'ALL' && !ALL_DEPARTMENTS_LIST.includes(departmentFilter as Department)) {
        // If admin was filtering a specific dept and then their role/dept changes in a way that makes that filter invalid, reset to 'ALL'
        // This case is unlikely with current app structure but good for robustness
        setDepartmentFilter('ALL');
      }
    }
  }, [user, departmentFilter]);


  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'createdBy' | 'status'>) => {
    if (user) {
      setLoading(true); // Indicate loading for create operation
      try {
        await addTaskService({
          ...taskData,
          createdByUserId: user.id, 
        });
        await fetchTasks(); // Re-fetch to see the new task
      } catch (e: any) {
        console.error("Error creating task:", e);
        setError(`Failed to create task: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update can be done here if desired, then revert on error.
    // For simplicity, we'll show loading and re-fetch.
    // setLoading(true); // Can set loading for individual items or whole page
    try {
      await updateTaskStatusService(taskId, newStatus);
      await fetchTasks(); // Re-fetch to see updated status
    } catch (e: any) {
      console.error("Error updating task status:", e);
      setError(`Failed to update task: ${e.message}`);
    } finally {
      // setLoading(false);
    }
  };

  if (!user && !loading) return (
     <div className="flex justify-center items-center h-full">
      <p className="ml-3 text-neutral-dark dark:text-neutral-light">Please login to view tasks.</p>
    </div>
  );

  // Adjusted loading condition to prevent flash of "No Tasks Found"
  if (loading && tasks.length === 0) return (
    <div className="flex justify-center items-center h-full py-10">
      <Spinner size="lg" /><p className="ml-3 text-neutral-dark dark:text-neutral-light">Loading tasks...</p>
    </div>
  )


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-neutral-DEFAULT/20 dark:border-neutral-dark/50">
        <div>
            <h1 className="text-3xl font-bold text-neutral-darkest dark:text-neutral-lightest">Tasks</h1>
            <p className="text-lg text-neutral-DEFAULT dark:text-neutral-light mt-1">
                {user?.role === UserRole.ADMIN ? 'Manage tasks across all departments' : `Tasks for ${user?.department} department`}
            </p>
        </div>
        {user?.role === UserRole.ADMIN && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 sm:mt-0 flex items-center justify-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darkest focus:ring-primary-DEFAULT transition-all transform active:scale-95 duration-150 ease-in-out"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Task
          </button>
        )}
      </div>

      {user?.role === UserRole.ADMIN && (
        <div className="mb-4">
          <label htmlFor="department-filter" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest mb-1">Filter by Department:</label>
          <select
            id="department-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value as Department | 'ALL')}
            className="mt-1 block w-full sm:w-auto md:w-1/3 lg:w-1/4 p-2.5 text-sm border-neutral-DEFAULT/30 dark:border-neutral-darkest/70 focus:outline-none focus:ring-1 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT rounded-md dark:bg-neutral-dark dark:text-neutral-lightest shadow-sm"
          >
            <option value="ALL">All Departments</option>
            {ALL_DEPARTMENTS_LIST.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-danger-DEFAULT dark:text-danger-light p-2 bg-danger-light/20 rounded-md my-2">{error}</p>}

      {loading && tasks.length === 0 ? ( // Show loading spinner if fetching and no tasks are yet displayed
         <div className="flex justify-center items-center py-10">
            <Spinner size="lg" />
            <p className="ml-3 text-neutral-dark dark:text-neutral-light">Fetching tasks...</p>
        </div>
      ) : !loading && tasks.length === 0 ? ( // Show "No Tasks Found" only after loading is complete and still no tasks
        <div className="text-center py-12 bg-neutral-lightest dark:bg-neutral-dark shadow-md rounded-lg">
          <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-neutral-DEFAULT/70 dark:text-neutral-light/70" />
          <h3 className="mt-3 text-xl font-semibold text-neutral-darkest dark:text-neutral-lightest">No Tasks Found</h3>
          <p className="mt-1 text-sm text-neutral-DEFAULT dark:text-neutral-light">
            {user?.role === UserRole.ADMIN 
                ? (departmentFilter === 'ALL' ? "There are no tasks assigned yet. Try creating one!" : `No tasks found for ${departmentFilter}.`)
                : "There are no tasks assigned to your department currently."}
          </p>
          {user?.role === UserRole.ADMIN && (
             <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 flex items-center mx-auto justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create First Task
            </button>
          )}
        </div>
      ) : ( // Display tasks if available
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onStatusChange={handleStatusChange} 
              canMarkDone={user?.role === UserRole.ADMIN || task.assignedTo === user?.department} 
            />
          ))}
        </div>
      )}

      {user?.role === UserRole.ADMIN && (
        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleTaskCreate}
        />
      )}
    </div>
  );
};

export default TasksPage;