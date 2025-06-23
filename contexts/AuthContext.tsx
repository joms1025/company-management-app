
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
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      console.warn("AuthContext: loadUserProfile called with null Supabase user. Setting local user to null.");
      setUser(null);
      return;
    }

    console.log(`AuthContext: loadUserProfile - START for Supabase user ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);

    if (!supabase) {
      console.error("AuthContext: loadUserProfile - Supabase client is null. Cannot fetch profile. Setting local user to null.");
      setUser(null);
      return;
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
        setUser(null);
        console.log("AuthContext: loadUserProfile - FINAL user state set to: null (due to profile fetch error)");
        return;
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
        setUser(hydratedUser);
        console.log("AuthContext: loadUserProfile - FINAL user state set to (from profile):", hydratedUser);
      } else if (supabaseUser.email) { // Profile not found (PGRST116), but email exists on Supabase user
        console.warn(`AuthContext: loadUserProfile - Profile not found for user ${supabaseUser.id} (PGRST116). Using fallback with email: ${supabaseUser.email}. This may indicate a missing profile row or RLS issue.`);
        const fallbackUser: User = {
            id: supabaseUser.id,
            name: supabaseUser.email.split('@')[0] || 'New User',
            email: supabaseUser.email,
            role: UserRole.USER, 
            department: Department.OFFICE, 
        };
        setUser(fallbackUser);
        console.log("AuthContext: loadUserProfile - FINAL user state set to (from fallback):", fallbackUser);
      } else { 
        console.error(`AuthContext: loadUserProfile - CRITICAL - Profile not found for user ${supabaseUser.id} AND supabaseUser.email is also null/undefined. Cannot fully hydrate user.`);
        setUser(null);
        console.log("AuthContext: loadUserProfile - FINAL user state set to: null (profile not found and no email for fallback)");
      }
    } catch (e: any) {
      console.error("AuthContext: loadUserProfile - Exception during profile loading:", e);
      setUser(null);
      console.log("AuthContext: loadUserProfile - FINAL user state set to: null (due to exception)");
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect - Initializing auth state listener and loading initial session.");
    setLoading(true);
    if (!supabase) {
        console.error("AuthContext: useEffect - Supabase client is null. Halting auth setup. This usually indicates a problem with Supabase credentials in index.html or supabaseClient.ts initialization.");
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
    }

    const getInitialSession = async () => {
        console.log("AuthContext: getInitialSession - Attempting to get current session...");
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log("AuthContext: getInitialSession - Raw session data:", { currentSession, error });

        if (error) {
            console.error("AuthContext: getInitialSession - Error getting initial session:", error.message);
            setUser(null);
            setSession(null);
            setLoading(false);
            return;
        }
        
        setSession(currentSession); // Set session regardless of user presence
        if (currentSession?.user) {
            console.log("AuthContext: getInitialSession - Initial session HAS user. Loading profile...");
            await loadUserProfile(currentSession.user);
        } else {
            console.log("AuthContext: getInitialSession - No initial session or no user in session. Setting local user to null.");
            setUser(null);
        }
        setLoading(false);
        console.log("AuthContext: getInitialSession - COMPLETED. Loading set to false.");
    };
    
    getInitialSession();

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`AuthContext: onAuthStateChange - Event: ${event}, Session User ID: ${currentSession?.user?.id}, Current local user ID: ${user?.id}`);
        setLoading(true);
        console.log("AuthContext: onAuthStateChange - Loading set to true.");
        setSession(currentSession); // Update session state immediately

        switch (event) {
          case 'SIGNED_IN':
            console.log("AuthContext: onAuthStateChange - SIGNED_IN event.");
            if (currentSession?.user) {
              console.log("AuthContext: onAuthStateChange - User detected in session, calling loadUserProfile.");
              await loadUserProfile(currentSession.user);
            } else {
              console.warn("AuthContext: onAuthStateChange - SIGNED_IN event, but no user in session. This is unexpected. Setting local user to null.");
              setUser(null);
            }
            break;
          case 'SIGNED_OUT':
            console.log("AuthContext: onAuthStateChange - SIGNED_OUT event. Setting local user to null.");
            setUser(null);
            break;
          case 'USER_UPDATED':
            console.log("AuthContext: onAuthStateChange - USER_UPDATED event.");
            if (currentSession?.user) {
              console.log("AuthContext: onAuthStateChange - User detected in session, calling loadUserProfile for update.");
              await loadUserProfile(currentSession.user);
            } else {
               console.warn("AuthContext: onAuthStateChange - USER_UPDATED event, but no user in session. Setting local user to null.");
               setUser(null);
            }
            break;
          case 'PASSWORD_RECOVERY':
            console.log("AuthContext: onAuthStateChange - PASSWORD_RECOVERY event. User state not directly changed.");
            break;
          case 'TOKEN_REFRESHED':
            console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED event.");
            if (currentSession?.user) {
              if (!user || user.id !== currentSession.user.id) {
                console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Local user out of sync or null. Reloading profile.");
                await loadUserProfile(currentSession.user);
              } else {
                console.log("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Local user seems in sync. No profile reload.");
              }
            } else if (user !== null) { 
              console.warn("AuthContext: onAuthStateChange - TOKEN_REFRESHED: Session lost user, but local user existed. Clearing local user.");
              setUser(null);
            }
            break;
          case 'INITIAL_SESSION':
            console.log("AuthContext: onAuthStateChange - INITIAL_SESSION event (can be redundant if getInitialSession already ran).");
            // This is mostly handled by getInitialSession, but as a safeguard:
            if (currentSession?.user) {
                if (!user || user.id !== currentSession.user.id) {
                    console.log("AuthContext: onAuthStateChange - INITIAL_SESSION: Local user out of sync. Reloading profile.");
                    await loadUserProfile(currentSession.user);
                }
            } else if (user !== null) {
                 console.warn("AuthContext: onAuthStateChange - INITIAL_SESSION: Session has no user, but local user existed. Clearing local user.");
                setUser(null);
            }
            break;
          default:
            console.log(`AuthContext: onAuthStateChange - Unhandled event type: ${event}`);
        }
        
        setLoading(false);
        console.log("AuthContext: onAuthStateChange - Event handling COMPLETED. Loading set to false.");
      }
    );

    return () => {
      console.log("AuthContext: useEffect cleanup - Unsubscribing from auth state changes.");
      authListenerData?.subscription?.unsubscribe();
    };
  }, []); // ENSURE user is not in dependency array to avoid re-running listener setup

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
    setLoading(true);
    console.log("AuthContext: login - Loading set to true.");
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    
    // onAuthStateChange will handle setting user state if login is successful
    // setLoading(false) will be handled by onAuthStateChange after profile load
    
    if (error) {
      console.error("AuthContext: login - Login error from Supabase:", error.message);
      let displayMessage = error.message;
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        displayMessage = "Invalid email or password. Please try again.";
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        displayMessage = "Your email address has not been confirmed. Please check your inbox for a confirmation link.";
      }
      alert(`Login failed: ${displayMessage}`);
      setLoading(false); // Ensure loading is false on direct error from signInWithPassword
      console.log("AuthContext: login - Loading set to false due to login error.");
    } else {
        console.log("AuthContext: login - signInWithPassword successful. Waiting for onAuthStateChange (SIGNED_IN) to set user and loading state.", data);
        // data.user and data.session available here, but onAuthStateChange is the source of truth for app state.
        // setLoading will be false after onAuthStateChange completes.
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
    setLoading(true);
    console.log("AuthContext: register - Loading set to true.");
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

    // setLoading will be handled by onAuthStateChange if registration auto-signs in.
    // If email confirmation is needed, user remains logged out, so loading should be set to false here.

    if (error) {
      console.error("AuthContext: register - Registration error from Supabase:", error.message);
      alert(`Registration failed: ${error.message}`);
      setLoading(false);
      console.log("AuthContext: register - Loading set to false due to registration error.");
    } else if (signUpData.user) {
        console.log("AuthContext: register - Supabase signUp call successful.", signUpData);
         if (signUpData.session) {
            console.log("AuthContext: register - Registration resulted in an immediate session. onAuthStateChange (SIGNED_IN) will handle user state and loading.");
        } else {
            // Email confirmation likely required, no immediate session.
            alert("Registration successful! Please check your email to confirm your account.");
            setLoading(false); // User is not logged in yet, so stop loading.
            console.log("AuthContext: register - Email confirmation required. Loading set to false.");
        }
    } else {
        // Should not happen if no error, but as a safeguard
        console.warn("AuthContext: register - signUp call returned no error but also no user/session. This is unexpected.");
        setLoading(false);
    }
    return { error };
  };
  
  const logout = async () => {
    console.log("AuthContext: logout - Attempting logout.");
    if (!supabase) {
      console.warn("AuthContext: logout - Supabase client is null. Cannot perform Supabase signout, but clearing local state.");
      setUser(null);
      setSession(null);
      setLoading(false); // Explicitly set loading to false
      return;
    }

    setLoading(true); // Technically, onAuthStateChange will set loading, but for immediate UI feedback.
    console.log("AuthContext: logout - Loading set to true.");
    const { error } = await supabase.auth.signOut();

    // onAuthStateChange with SIGNED_OUT should fire and set user/session to null and loading to false.
    // Explicitly setting here for immediate UI feedback if onAuthStateChange is delayed.
    setUser(null); 
    setSession(null);
    // setLoading(false) will be handled by onAuthStateChange. If it doesn't fire, the app might show loading.
    // However, if signout fails, onAuthStateChange might not fire as expected.
    if (error) {
        console.error("AuthContext: logout - Error during Supabase sign out:", error.message);
        // Even if Supabase signOut fails, we treat it as a local logout.
    }
    setLoading(false); // Ensure loading is false after attempt, onAuthStateChange will also do this.
    console.log("AuthContext: logout - Logout process completed. Loading set to false.");
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

    console.log(`AuthContext: setUserRole - Attempting to change role to ${newRole} for user ID ${user.id}`);
    setLoading(true);
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
    setLoading(false);
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
