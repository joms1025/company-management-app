
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import supabase from '../supabaseClient'; // Import your Supabase client
import { User, UserRole, Department } from '../types';
import { AuthChangeEvent, Session, User as SupabaseUser, Subscription } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUserRole: (role: UserRole) => Promise<void>; // Role change might involve backend
  login: (email: string, password?: string) => Promise<{ error: Error | null }>;
  register: (userData: Omit<User, 'id' | 'password'> & {password: string}) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Initialize loading to true

  const loadUserProfile = async (supabaseUser: SupabaseUser | null): Promise<User | null> => {
    if (!supabaseUser) {
      console.warn("AuthContext: loadUserProfile called with null Supabase user.");
      return null;
    }

    console.log(`AuthContext: loadUserProfile - START for Supabase user ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);

    if (!supabase) {
      console.error("AuthContext: loadUserProfile - Supabase client is null. Cannot fetch profile.");
      return null;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log("AuthContext: loadUserProfile - Profile fetch result:", { profile, error });

      if (error && error.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but 0 rows were found"
        console.error('AuthContext: loadUserProfile - Error fetching user profile (and not PGRST116):', error);
        return null;
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
        console.warn(`AuthContext: loadUserProfile - Profile not found for user ${supabaseUser.id} (PGRST116 or other). Using fallback with email: ${supabaseUser.email}. This may indicate a missing profile row or RLS issue.`);
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
      return null;
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect - Initializing. Setting loading=true (initial mount).");
    setLoading(true); 
    
    if (!supabase) {
        console.error("AuthContext: useEffect - Supabase client is null. Halting auth setup. This usually indicates a problem with Supabase credentials in index.html or supabaseClient.ts initialization. Setting loading=false.");
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
    }

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange - Event: ${event}, Session User ID: ${currentSession?.user?.id}. Setting loading=true (event handling start).`);
        setLoading(true); // Set loading true at the start of handling any auth event
        
        try {
            setSession(currentSession);
            let loadedUser: User | null = null; // Initialize loadedUser for each event cycle

            switch (event) {
              case 'INITIAL_SESSION':
                console.log("AuthContext: onAuthStateChange - INITIAL_SESSION event.");
                if (currentSession?.user) {
                  loadedUser = await loadUserProfile(currentSession.user);
                }
                // No explicit setUser here, loadedUser will be set below
                break;
              case 'SIGNED_IN':
                console.log("AuthContext: onAuthStateChange - SIGNED_IN event.");
                if (currentSession?.user) {
                  loadedUser = await loadUserProfile(currentSession.user);
                } else {
                  console.warn("AuthContext: onAuthStateChange - SIGNED_IN event, but no user in session. This is unexpected.");
                }
                // No explicit setUser here, loadedUser will be set below
                break;
              case 'SIGNED_OUT':
                console.log("AuthContext: onAuthStateChange - SIGNED_OUT event. Setting local user to null.");
                loadedUser = null; // Explicitly set loadedUser to null
                break;
              case 'USER_UPDATED':
                console.log("AuthContext: onAuthStateChange - USER_UPDATED event.");
                if (currentSession?.user) {
                  loadedUser = await loadUserProfile(currentSession.user);
                } else {
                   console.warn("AuthContext: onAuthStateChange - USER_UPDATED event, but no user in session.");
                }
                // No explicit setUser here, loadedUser will be set below
                break;
              case 'PASSWORD_RECOVERY':
                console.log("AuthContext: onAuthStateChange - PASSWORD_RECOVERY event. User state not directly changed.");
                // Keep loadedUser as null or its current state if not modifying user
                loadedUser = user; // Preserve current user state if no change is intended by this event
                break;
              case 'TOKEN_REFRESHED':
                console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED event.");
                if (currentSession?.user) {
                  if (!user || user.id !== currentSession.user.id || user.email !== currentSession.user.email) {
                    console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Local user out of sync or null. Reloading profile.");
                    loadedUser = await loadUserProfile(currentSession.user);
                  } else {
                    console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Local user seems in sync. No profile reload.");
                    loadedUser = user; // Preserve current user
                  }
                } else if (user !== null) { 
                  console.warn("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Session lost user, but local user existed. Clearing local user.");
                  loadedUser = null;
                } else {
                  loadedUser = user; // Preserve current user state if no change
                }
                break;
              default:
                console.log(`AuthContext: onAuthStateChange - Unhandled event type: ${event}`);
                loadedUser = user; // Preserve current user on unhandled events
            }
            
            // Centralized setUser call after switch statement
            console.log(`AuthContext: onAuthStateChange - Preparing to set user state with loadedUser for event ${event}:`, loadedUser);
            setUser(loadedUser);
            
            // Note: Logging 'user' and 'session' here will show their values from the *previous* render cycle due to closure.
            // The 'loadedUser' log above is the most accurate for what setUser was called with in this cycle.
            // App.tsx's logs will show the 'user' state in the *next* render cycle.
            console.log(`AuthContext: onAuthStateChange - State after processing ${event} (user/session logged here are from previous render):`, user, session);

        } catch (e: any) {
            console.error(`AuthContext: onAuthStateChange - Exception during event handling for ${event}:`, e.message, e.stack);
            setUser(null); // Clear user on error during event processing
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
  }, [user]); // Added 'user' to dependency array for TOKEN_REFRESHED logic that compares new session to existing user state.

  const login = async (email: string, password?: string) => {
    console.log(`AuthContext: login - Attempting login for email: ${email}`);
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
    setLoading(true); // Ensure loading is true during login attempt
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
    if (!supabase) {
      const errMsg = "AuthContext REGISTER: Supabase client is null. Cannot attempt registration. Check Supabase configuration in index.html.";
      console.error(errMsg);
      alert("Critical error: Unable to connect to authentication service for registration. Please contact support if this issue persists after checking configuration.");
      return { error: new Error(errMsg) };
    }
    console.log("AuthContext: register - Setting loading=true (register start).");
    setLoading(true);
    const { email, password, name, role, department } = userData;
    
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
            alert("Registration successful! Please check your email to confirm your account.");
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
    }
    setUser(null); 
    setSession(null);
    console.log("AuthContext: logout - Logout process completed. Setting loading=false (logout completed).");
    setLoading(false);
  };

  const setUserRole = async (newRole: UserRole) => {
    if (!user) {
        console.warn("AuthContext: setUserRole - No user logged in.");
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
  
  return (
    <AuthContext.Provider value={{ user, session, loading, setUserRole, login, register, logout }}>
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
