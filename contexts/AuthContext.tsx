
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import supabase from '../supabaseClient'; // Import your Supabase client
import { User, UserRole, Department } from '../types';
import { AuthChangeEvent, Session, User as SupabaseUser, Subscription } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  criticalDbError: string | null; // New state for critical DB errors
  setUserRole: (role: UserRole) => Promise<void>; 
  login: (email: string, password?: string) => Promise<{ error: Error | null }>;
  register: (userData: Omit<User, 'id' | 'password'> & {password: string}) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GenericCriticalErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#fffbe6', color: '#713f12', padding: '20px', fontFamily: 'sans-serif', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxSizing: 'border-box', lineHeight: 1.6 }}>
    <div style={{ backgroundColor: '#ffffff', padding: '30px 40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '800px', borderTop: '5px solid #facc15' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', marginBottom: '20px' }}>Critical Application Error</h1>
      <p style={{ fontSize: '16px', marginBottom: '15px' }}>The application encountered a critical error and cannot continue.</p>
      <p style={{ fontSize: '14px', marginBottom: '25px', color: '#b45309' }}><strong>Error details:</strong> {message}</p>
      <p style={{ fontSize: '14px', marginBottom: '10px' }}>
        This might be due to a configuration issue, a problem with external services, or an unexpected internal state.
      </p>
      <p style={{ fontSize: '12px', color: '#78350f', marginTop: '25px' }}>
        Please try a <strong>hard refresh</strong> of this page (Ctrl+Shift+R or Cmd+Shift+R). If the problem persists, contact support or check the developer console (F12) for more technical information.
      </p>
    </div>
  </div>
);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); 
  const [criticalDbError, setCriticalDbError] = useState<string | null>(null); // New state

  const loadUserProfile = async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) {
      console.warn("AuthContext: loadUserProfile called with null Supabase user.");
      return null;
    }

    console.log(`AuthContext: loadUserProfile - START for Supabase user ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);
    setCriticalDbError(null); // Reset DB error on new attempt

    if (!supabase) {
      console.error("AuthContext: loadUserProfile - Supabase client is null. Cannot fetch profile.");
      // This case should be handled by the !supabase check in App.tsx ideally
      return null;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log("AuthContext: loadUserProfile - Profile fetch result:", { profile, error });

      if (error) {
        // Check for "relation ... does not exist" error
        if (error.code === '42P01' || (error.message && error.message.toLowerCase().includes('relation "public.profiles" does not exist'))) {
          console.error("AuthContext: loadUserProfile - CRITICAL: 'profiles' table does not exist.", error);
          setCriticalDbError(`Database error: ${error.message}. The 'profiles' table is missing. Please create it in your Supabase project as per the setup instructions.`);
          return null; // Stop further processing for this user
        }
        if (error.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but 0 rows were found"
          console.error('AuthContext: loadUserProfile - Error fetching user profile (and not PGRST116 or 42P01):', error);
          // Set a generic DB error if it's not the missing table or missing row
          setCriticalDbError(`Failed to fetch user profile: ${error.message}. Check database setup and RLS policies.`);
          return null;
        }
      }
      
      if (profile) {
        console.log("AuthContext: loadUserProfile - Profile found. Hydrating user from profile and Supabase user.");
        const hydratedUser: User = {
          id: supabaseUser.id,
          name: profile.name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email || profile.email, 
          role: profile.role as UserRole || UserRole.USER,
          department: profile.department as Department || Department.OFFICE,
        };
        console.log("AuthContext: loadUserProfile - Returning hydrated user (from profile):", hydratedUser);
        return hydratedUser;
      } else if (supabaseUser.email) { 
        console.warn(`AuthContext: loadUserProfile - Profile not found for user ${supabaseUser.id} (PGRST116 or other). Using fallback with email: ${supabaseUser.email}. This may indicate a missing profile row, an issue with the handle_new_user trigger, or RLS policies preventing access.`);
        // If profile row is missing (PGRST116), it might be due to handle_new_user trigger not firing or RLS.
        // Alert the user or provide specific guidance if this is common.
        // For now, allow fallback, but this implies the profile creation on signup might not be working.
        const fallbackUser: User = {
            id: supabaseUser.id,
            name: supabaseUser.email.split('@')[0] || 'New User',
            email: supabaseUser.email,
            role: UserRole.USER, 
            department: Department.OFFICE, 
        };
        console.log("AuthContext: loadUserProfile - Returning fallback user:", fallbackUser);
        return fallbackUser;
      } else { 
        console.error(`AuthContext: loadUserProfile - CRITICAL - Profile not found for user ${supabaseUser.id} AND supabaseUser.email is also null/undefined. Cannot fully hydrate user.`);
        return null;
      }
    } catch (e: any) {
      console.error("AuthContext: loadUserProfile - Exception during profile loading:", e);
      setCriticalDbError(`An exception occurred while loading user profile: ${e.message}.`);
      return null;
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect - Initializing auth listener. Setting loading=true (initial mount).");
    setLoading(true); 
    setCriticalDbError(null);
    
    if (!supabase) {
        console.error("AuthContext: useEffect - Supabase client is null. Halting auth setup. This usually indicates a problem with Supabase credentials in index.html or supabaseClient.ts initialization. Setting loading=false.");
        setUser(null);
        setSession(null);
        setLoading(false);
        // This scenario is handled by App.tsx's CriticalErrorDisplay for missing Supabase client
        return;
    }

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange - Event: ${event}, Session User ID: ${currentSession?.user?.id}. Setting loading=true (event handling start).`);
        setLoading(true); 
        
        try {
            setSession(currentSession);
            let loadedUser: User | null = null; 

            if (criticalDbError) { // If a critical DB error already exists, don't try to load profile
                console.warn(`AuthContext: onAuthStateChange - Critical DB error detected ('${criticalDbError}'). Skipping profile load for event ${event}.`);
                setUser(null); // Ensure user is null if DB is broken
            } else if (currentSession?.user) {
                 loadedUser = await loadUserProfile(currentSession.user);
            } else { // No session or no user in session (e.g., SIGNED_OUT)
                 loadedUser = null;
            }
            
            // This switch is more for logging or specific event logic if needed beyond profile loading
            switch (event) {
              case 'INITIAL_SESSION':
              case 'SIGNED_IN':
              case 'USER_UPDATED':
              case 'TOKEN_REFRESHED':
                console.log(`AuthContext: onAuthStateChange - Event: ${event}. Profile load attempted (result in loadedUser).`);
                break;
              case 'SIGNED_OUT':
                console.log("AuthContext: onAuthStateChange - SIGNED_OUT event. Local user already set to null.");
                break;
              case 'PASSWORD_RECOVERY':
                console.log("AuthContext: onAuthStateChange - PASSWORD_RECOVERY event. User state not directly changed by profile load here.");
                // loadedUser would already be current user profile or null from above logic
                break;
              default:
                console.log(`AuthContext: onAuthStateChange - Unhandled or generic event type: ${event}.`);
            }
            
            console.log(`AuthContext: onAuthStateChange - Preparing to set user state with loadedUser for event ${event}:`, loadedUser);
            setUser(loadedUser);
            
            console.log(`AuthContext: onAuthStateChange - State after processing ${event} (user/session in this log are from previous render):`, user, session);

        } catch (e: any) {
            console.error(`AuthContext: onAuthStateChange - Exception during event handling for ${event}:`, e.message, e.stack);
            setUser(null); 
            setCriticalDbError(`Unhandled exception during auth event ${event}: ${e.message}`);
        } finally {
            console.log(`AuthContext: onAuthStateChange - Event handling COMPLETED for ${event}. Setting loading=false.`);
            setLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthContext: useEffect cleanup - Unsubscribing from auth state changes.");
      if (authListenerData?.subscription) {
        authListenerData.subscription.unsubscribe();
      } else {
        console.warn("AuthContext: useEffect cleanup - No subscription object found to unsubscribe.");
      }
    };
  }, []); 

  const login = async (email: string, password?: string) => {
    console.log(`AuthContext: login - Attempting login for email: ${email}`);
    setCriticalDbError(null); // Clear previous DB errors on new login attempt
    if (!supabase) {
      const errMsg = "AuthContext LOGIN: Supabase client is null. Cannot attempt login. Check Supabase configuration in index.html.";
      console.error(errMsg);
      alert("Critical error: Unable to connect to authentication service. Please contact support if this issue persists after checking configuration.");
      return { error: new Error(errMsg) };
    }
    if (!password) {
        const errMsg = "AuthContext LOGIN: Password missing.";
        console.error(errMsg);
        return { error: new Error(errMsg)};
    }
    console.log("AuthContext: login - Setting loading=true (login start).");
    setLoading(true); 
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("AuthContext: login - Login error from Supabase:", error.message);
      let displayMessage = error.message;
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        displayMessage = "Invalid email or password. Please try again.";
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        displayMessage = "Your email address has not been confirmed. Please check your inbox for a confirmation link.";
      }
      alert(`Login failed: ${displayMessage}`);
      setLoading(false); 
    } else {
        console.log("AuthContext: login - signInWithPassword successful. Waiting for onAuthStateChange (SIGNED_IN) to set user and final loading state.", data);
    }
    return { error };
  };

  const register = async (userData: Omit<User, 'id' | 'password'> & {password: string}) => {
    console.log(`AuthContext: register - Attempting registration for email: ${userData.email}`);
    setCriticalDbError(null); // Clear previous DB errors on new registration attempt
    if (!supabase) {
      const errMsg = "AuthContext REGISTER: Supabase client is null. Cannot attempt registration. Check Supabase configuration in index.html.";
      console.error(errMsg);
      alert("Critical error: Unable to connect to authentication service for registration. Please contact support if this issue persists after checking configuration.");
      return { error: new Error(errMsg) };
    }
    console.log("AuthContext: register - Setting loading=true (register start).");
    setLoading(true);
    const { email, password, name, role, department } = userData;
    
    // Ensure raw_user_meta_data matches what handle_new_user expects
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name: name,
          role: role || UserRole.USER, 
          department: department || Department.OFFICE, 
        }
      }
    });

    if (error) {
      console.error("AuthContext: register - Registration error from Supabase:", error.message);
      alert(`Registration failed: ${error.message}`);
      setLoading(false); 
    } else if (signUpData.user) {
        console.log("AuthContext: register - Supabase signUp call successful.", signUpData);
         if (signUpData.session) {
            console.log("AuthContext: register - Registration resulted in an immediate session. onAuthStateChange (SIGNED_IN) will handle user state and final loading.");
        } else { 
            alert("Registration successful! Please check your email to confirm your account. The 'profiles' table should be populated by a trigger when your email is confirmed.");
            console.log("AuthContext: register - Email confirmation required. Setting loading=false.");
            setLoading(false); 
        }
    } else {
        console.warn("AuthContext: register - signUp call returned no error but also no user/session. This is unexpected. Setting loading=false.");
        setLoading(false);
    }
    return { error };
  };
  
  const logout = async () => {
    console.log("AuthContext: logout - Attempting logout.");
    if (!supabase) {
      console.warn("AuthContext: logout - Supabase client is null. Cannot perform Supabase signout, but clearing local state. Setting loading=false.");
      setUser(null);
      setSession(null);
      setLoading(false); 
      return;
    }

    console.log("AuthContext: logout - Setting loading=true (logout start).");
    setLoading(true); 
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("AuthContext: logout - Error during Supabase sign out:", error.message);
        setLoading(false);
    }
    console.log("AuthContext: logout - Supabase signOut called. onAuthStateChange (SIGNED_OUT) will clear user/session and set final loading state.");
  };

  const setUserRole = async (newRole: UserRole) => {
    if (!user) {
        console.warn("AuthContext: setUserRole - No user logged in.");
        return;
    }
    if (criticalDbError) {
        alert(`Cannot change role: Critical database error: ${criticalDbError}`);
        return;
    }
    if (!supabase) {
      console.error("AuthContext: setUserRole - Supabase client is null. Cannot update role in DB.");
      alert("Error: Cannot connect to server to update role.");
      return;
    }
    if (user.role === newRole) return;

    console.log(`AuthContext: setUserRole - Attempting to change role to ${newRole} for user ID ${user.id}. Setting loading=true (set role start).`);
    setLoading(true);
    try {
      const { data, error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', user.id)
          .select()
          .single();

      if (error) {
          console.error("AuthContext: setUserRole - Error updating user role in DB:", error);
          alert(`Failed to update role: ${error.message}`);
          if (error.code === '42P01' || (error.message && error.message.toLowerCase().includes('relation "public.profiles" does not exist'))) {
             setCriticalDbError(`Database error: ${error.message}. The 'profiles' table is missing.`);
          }
      } else if (data) {
          console.log("AuthContext: setUserRole - User role updated in DB. New profile data:", data);
          setUser(prevUser => prevUser ? { ...prevUser, role: data.role as UserRole } : null);
          alert(`User role changed to ${newRole}.`);
      }
    } catch (e: any) {
        console.error("AuthContext: setUserRole - Exception updating role:", e.message);
        alert(`Failed to update role: ${e.message}`);
    } finally {
        console.log("AuthContext: setUserRole - Setting loading=false (set role end).");
        setLoading(false);
    }
  };
  
  // If critical DB error, render only the error message
  if (criticalDbError && !loading) { // Ensure loading is false to avoid spinner over error
    return <GenericCriticalErrorDisplay message={criticalDbError} />;
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, criticalDbError, setUserRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
