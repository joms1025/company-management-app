
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Department } from '../types';
import { ALL_DEPARTMENTS_LIST } from '../constants';
import { VideoCameraIcon, PhoneXMarkIcon, MicrophoneIcon, VideoCameraSlashIcon, ComputerDesktopIcon, UserGroupIcon, MicrophoneSlashIcon, MegaphoneIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal'; // For incoming call notification

const VideoCallPage: React.FC = () => {
  const { user } = useAuth();
  const [inCall, setInCall] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState<Department | typeof Department.ALL_DEPARTMENTS | ''>(user?.role === UserRole.ADMIN ? '' : user?.department || '');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [callingDepartment, setCallingDepartment] = useState<Department | typeof Department.ALL_DEPARTMENTS | null>(null);

  // Simulate admin starting a call for non-admin users
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      const timer = setTimeout(() => {
        // Simulate an incoming call from 'Office' department after 5 seconds for demo
        // In a real app, this would be a WebSocket event
        setCallingDepartment(Department.OFFICE); 
        setShowIncomingCallModal(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);


  const handleStartCall = () => {
    if (!targetDepartment) {
      alert("Please select a department or 'All Departments' to call.");
      return;
    }
    setInCall(true);
    setCallingDepartment(targetDepartment); // Set who is being called
    console.log(`Starting call to ${targetDepartment}...`);
    // In a real app, signal other users in targetDepartment
  };

  const handleEndCall = () => {
    setInCall(false);
    setCallingDepartment(null);
    console.log("Call ended.");
  };

  const handleAcceptCall = () => {
    setInCall(true);
    setShowIncomingCallModal(false);
    // Join WebRTC call for callingDepartment
  };

  const handleDeclineCall = () => {
    setShowIncomingCallModal(false);
    setCallingDepartment(null);
  };
  
  if (!user) return <p className="text-neutral-dark dark:text-neutral-light">Loading video call features...</p>;

  const callAdminDepartments = [...ALL_DEPARTMENTS_LIST, Department.ALL_DEPARTMENTS];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-darkest dark:text-neutral-lightest">Video Call</h1>

      {!inCall ? (
        <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-lg p-6 space-y-4">
          <p className="text-lg text-neutral-DEFAULT dark:text-neutral-light">
            {user.role === UserRole.ADMIN ? "Start a video call with a specific department or broadcast to all departments." : "You can join video calls for your department initiated by an admin."}
          </p>
          {user.role === UserRole.ADMIN && (
            <>
              <div>
                <label htmlFor="dept-call-select" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest mb-1">Select Target:</label>
                <select
                  id="dept-call-select"
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value as Department | typeof Department.ALL_DEPARTMENTS)}
                  className="mt-1 block w-full sm:w-auto md:w-1/2 p-2.5 text-sm border-neutral-DEFAULT/30 dark:border-neutral-darkest/70 focus:outline-none focus:ring-1 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT rounded-md dark:bg-neutral-dark dark:text-neutral-lightest shadow-sm"
                >
                  <option value="" disabled>Select Department or All</option>
                  {callAdminDepartments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === Department.ALL_DEPARTMENTS ? '📢 All Departments (Broadcast Call)' : dept}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleStartCall}
                disabled={!targetDepartment}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT 
                           disabled:bg-neutral-400 disabled:dark:bg-neutral-600 disabled:text-neutral-200 disabled:dark:text-neutral-400 disabled:hover:bg-neutral-400 disabled:dark:hover:bg-neutral-600 disabled:cursor-not-allowed 
                           transition-all transform active:scale-95 duration-150 ease-in-out"
              >
                <VideoCameraIcon className="h-5 w-5 mr-2" />
                Start Call
              </button>
            </>
          )}
          {user.role !== UserRole.ADMIN && !showIncomingCallModal && (
             <div className="text-center py-8">
                <VideoCameraIcon className="h-16 w-16 text-neutral-DEFAULT/70 dark:text-neutral-light/70 mx-auto animate-pulse" />
                <p className="mt-4 text-neutral-DEFAULT dark:text-neutral-light">Waiting for an admin to start a call for your department ({user.department})...</p>
             </div>
          )}
        </div>
      ) : ( // In Call UI
        <div className="bg-neutral-darkest rounded-lg shadow-2xl p-2 sm:p-4 h-[calc(100vh-15rem)] flex flex-col">
           <div className="text-center mb-2">
            <p className="text-sm text-neutral-light">
              In call with: <span className="font-semibold text-primary-light">{callingDepartment}</span>
            </p>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto bg-black/30 p-2 rounded">
            {[...(Array(user.role === UserRole.ADMIN && callingDepartment === Department.ALL_DEPARTMENTS ? 6 : 4).keys())].map(i => (
              <div key={i} className="bg-neutral-dark rounded aspect-video flex items-center justify-center relative shadow-inner">
                <UserGroupIcon className="h-12 w-12 sm:h-16 sm:w-16 text-neutral-DEFAULT/50" />
                <span className="absolute bottom-1.5 left-1.5 text-white text-xs bg-black bg-opacity-60 px-1.5 py-0.5 rounded">
                    {i === 0 && user ? user.name : `Participant ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-neutral-dark bg-opacity-80 p-3 sm:p-4 mt-2 rounded-b-lg flex justify-center items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 sm:p-3 rounded-full ${isMuted ? 'bg-danger-DEFAULT hover:bg-danger-dark' : 'bg-neutral-DEFAULT/50 hover:bg-neutral-DEFAULT/70'} text-white transition-all transform active:scale-90 duration-150 ease-in-out focus:outline-none focus:ring-2 ${isMuted ? 'focus:ring-danger-light' : 'focus:ring-primary-light'} focus:ring-offset-2 focus:ring-offset-neutral-darkest`}
              title={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
            >
              {isMuted ? <MicrophoneSlashIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicrophoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-2.5 sm:p-3 rounded-full ${isVideoOff ? 'bg-danger-DEFAULT hover:bg-danger-dark' : 'bg-neutral-DEFAULT/50 hover:bg-neutral-DEFAULT/70'} text-white transition-all transform active:scale-90 duration-150 ease-in-out focus:outline-none focus:ring-2 ${isVideoOff ? 'focus:ring-danger-light' : 'focus:ring-primary-light'} focus:ring-offset-2 focus:ring-offset-neutral-darkest`}
              title={isVideoOff ? "Start Video" : "Stop Video"}
              aria-pressed={isVideoOff}
            >
              {isVideoOff ? <VideoCameraSlashIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoCameraIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button className="hidden sm:inline-flex p-2.5 sm:p-3 rounded-full bg-neutral-DEFAULT/50 hover:bg-neutral-DEFAULT/70 text-white transition-all transform active:scale-90 duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 focus:ring-offset-neutral-darkest" title="Share Screen">
              <ComputerDesktopIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button 
              onClick={handleEndCall} 
              className="p-2.5 sm:p-3 rounded-full bg-danger-DEFAULT hover:bg-danger-dark text-white transition-all transform active:scale-90 duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-danger-light focus:ring-offset-2 focus:ring-offset-neutral-darkest"
              title="End Call"
            >
              <PhoneXMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      )}
      {/* Incoming Call Modal for non-admins */}
      {user.role !== UserRole.ADMIN && showIncomingCallModal && callingDepartment && (
        <Modal isOpen={showIncomingCallModal} onClose={handleDeclineCall} title={`Incoming Call from ${callingDepartment}`} size="sm">
          <div className="text-center p-4">
            <MegaphoneIcon className="h-12 w-12 text-primary-DEFAULT mx-auto mb-4 animate-ping-slow" />
            <p className="text-lg text-neutral-dark dark:text-neutral-lightest mb-6">
              You have an incoming video call from the <strong className="font-semibold">{callingDepartment}</strong> department.
            </p>
            <div className="flex justify-around space-x-3">
              <button
                onClick={handleDeclineCall}
                className="w-full px-4 py-2.5 border border-danger-DEFAULT text-danger-DEFAULT hover:bg-danger-DEFAULT hover:text-white rounded-md shadow-sm font-medium transition-all transform active:scale-95"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptCall}
                className="w-full px-4 py-2.5 bg-secondary-DEFAULT hover:bg-secondary-dark text-white rounded-md shadow-sm font-medium transition-all transform active:scale-95"
              >
                Accept
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VideoCallPage;
