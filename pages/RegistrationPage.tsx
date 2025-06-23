import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Department, UserRole } from '../types'; // Omit type might be less relevant now
import { ALL_DEPARTMENTS_LIST } from '../constants';
import { SwatchIcon, UserPlusIcon, ArrowRightOnRectangleIcon } from '../components/icons/HeroIcons'; 

const RegistrationPage: React.FC = () => {
  const { register, login } = useAuth(); 
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState<Department>(ALL_DEPARTMENTS_LIST[0]);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setLoginError(null); // Clear login error when attempting registration
    setRegLoading(true);

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      setRegLoading(false);
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters long.");
      setRegLoading(false);
      return;
    }

    const userDataForSupabase = {
      name: regName,
      email: regEmail,
      password: regPassword, 
      role: UserRole.USER, 
      department: regDepartment,
    };

    const { error } = await register(userDataForSupabase); 
    if (error) {
      setRegError(error.message || "An unexpected error occurred during registration.");
    }
    setRegLoading(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setRegError(null); // Clear registration error when attempting login
    setLoginLoading(true);

    if (!loginEmail || !loginPassword) {
        setLoginError("Please enter your email and password to login.");
        setLoginLoading(false);
        return;
    }
    const { error } = await login(loginEmail, loginPassword);
    if (error) {
        setLoginError(error.message || "Login failed. Please check your credentials.");
    }
    setLoginLoading(false);
  }
  
  const commonInputClasses = "mt-1 block w-full px-3 py-2.5 border border-neutral-DEFAULT/30 dark:border-neutral-darkest/50 rounded-md shadow-sm focus:outline-none focus:ring-primary-DEFAULT focus:border-primary-DEFAULT sm:text-sm bg-white dark:bg-neutral-darkest dark:text-neutral-lightest placeholder-neutral-DEFAULT/70 dark:placeholder-neutral-light/70";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-neutral-light to-secondary-light dark:from-primary-dark dark:via-neutral-darkest dark:to-secondary-dark p-4">
      <div className="w-full max-w-md bg-neutral-lightest dark:bg-neutral-dark shadow-2xl rounded-xl p-8 space-y-6 transform transition-all hover:scale-[1.01] duration-300">
        
        <div className="flex flex-col items-center">
          <SwatchIcon className="h-12 w-12 text-primary-DEFAULT mb-3"/>
          <h1 className="text-3xl font-bold text-center text-neutral-darkest dark:text-neutral-lightest">Create Account</h1>
          <p className="text-sm text-neutral-DEFAULT dark:text-neutral-light mt-1">Join the Company Management System.</p>
        </div>

        {regError && (
          <div className="bg-danger-light border-l-4 border-danger-DEFAULT text-danger-dark p-3 rounded-md text-sm" role="alert">
            <p className="font-semibold">Registration Error</p>
            <p>{regError}</p>
          </div>
        )}

        <form onSubmit={handleRegistrationSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Full Name</label>
            <input type="text" id="name" value={regName} onChange={(e) => setRegName(e.target.value)} required className={commonInputClasses} placeholder="Your Name" />
          </div>
          <div>
            <label htmlFor="email-register" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Email Address</label>
            <input type="email" id="email-register" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className={commonInputClasses} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="department-register" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Department</label>
            <select id="department-register" value={regDepartment} onChange={(e) => setRegDepartment(e.target.value as Department)} className={`${commonInputClasses} pr-10`}>
              {ALL_DEPARTMENTS_LIST.filter(d => d !== Department.ALL_DEPARTMENTS && d !== Department.ALL_BOSS).map(dept => ( 
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="password-register" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Password</label>
            <input type="password" id="password-register" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} className={commonInputClasses} placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Confirm Password</label>
            <input type="password" id="confirm-password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} required className={commonInputClasses} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={regLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-DEFAULT hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-primary-DEFAULT transition-all active:scale-95 duration-150 ease-in-out disabled:opacity-70">
            {regLoading ? 'Registering...' : <><UserPlusIcon className="h-5 w-5 mr-2" /> Register</>}
          </button>
        </form>

        <hr className="my-8 border-neutral-DEFAULT/30 dark:border-neutral-darkest/50" />

        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-neutral-darkest dark:text-neutral-lightest">Already have an account?</h2>
            <p className="text-sm text-neutral-DEFAULT dark:text-neutral-light text-center">Login with your email and password.</p>
            
            {loginError && (
                <div className="bg-danger-light border-l-4 border-danger-DEFAULT text-danger-dark p-3 rounded-md text-sm mt-4" role="alert">
                    <p className="font-semibold">Login Error</p>
                    <p>{loginError}</p>
                </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email-login" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Email Address</label>
                    <input type="email" id="email-login" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={commonInputClasses} placeholder="you@example.com" />
                </div>
                <div>
                    <label htmlFor="password-login" className="block text-sm font-medium text-neutral-dark dark:text-neutral-lightest">Password</label>
                    <input type="password" id="password-login" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={commonInputClasses} placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loginLoading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-secondary-DEFAULT hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-dark focus:ring-secondary-DEFAULT transition-all active:scale-95 duration-150 ease-in-out disabled:opacity-70">
                    {loginLoading ? 'Logging in...' : <><ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 transform -scale-x-100" /> Login </>}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;