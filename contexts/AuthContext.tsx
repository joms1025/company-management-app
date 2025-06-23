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

  useEffect(() => {
    setLoading(true);
    if (!supabase) {
        console.error("Supabase client not initialized in AuthContext. Halting auth setup.");
        setLoading(false);
        return;
    }

    const getSession = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user) {
            await loadUserProfile(currentSession.user);
        } else {
            setUser(null); // Ensure user is null if no session
        }
        setLoading(false);
    };
    
    getSession();

    const { data: authListenerData } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setLoading(true);
        setSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
            await loadUserProfile(session.user); // Reload profile on user update
        }
        setLoading(false);
      }
    );

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    if (!supabase) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but 0 rows were found"
        console.error('Error fetching user profile:', error);
        setUser(null); // Or handle more gracefully
        return;
      }
      
      if (profile) {
        setUser({
          id: supabaseUser.id,
          name: profile.name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email || profile.email,
          role: profile.role as UserRole || UserRole.USER,
          department: profile.department as Department || Department.OFFICE, // Default department
        });
      } else if (supabaseUser.email) {
        // Fallback if profile doesn't exist yet, maybe user just signed up
        setUser({
            id: supabaseUser.id,
            name: supabaseUser.email.split('@')[0],
            email: supabaseUser.email,
            role: UserRole.USER, // Default role
            department: Department.OFFICE, // Default department
        });
      }

    } catch (e) {
      console.error("Error in loadUserProfile:", e);
      setUser(null);
    }
  };


  const login = async (email: string, password?: string) => {
    if (!supabase || !password) return { error: new Error("Supabase client not init or password missing.") };
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("Login error:", error.message);
      alert(`Login failed: ${error.message}`);
    }
    return { error };
  };

  const register = async (userData: Omit<User, 'id' | 'password'> & {password: string}) => {
    if (!supabase) return { error: new Error("Supabase client not initialized.") };
    setLoading(true);
    const { email, password, name, role, department } = userData;
    
    // raw_user_meta_data is used by the handle_new_user trigger in Supabase
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name: name,
          role: role || UserRole.USER, // Default to USER role if not provided
          department: department || Department.OFFICE, // Default department
        }
      }
    });

    setLoading(false);
    if (error) {
      console.error("Registration error:", error.message);
      alert(`Registration failed: ${error.message}`);
    } else if (signUpData.user) {
        // The onAuthStateChange listener will handle setting the user profile after sign-up and trigger populates profiles table.
        // For email confirmation, user might not be immediately "logged in" here.
         if (signUpData.session) {
            // If session is immediately available (e.g. autoConfirm is on)
            await loadUserProfile(signUpData.user);
        } else {
            alert("Registration successful! Please check your email to confirm your account.");
        }
    }
    return { error };
  };
  
  const logout = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null); // Explicitly set user to null
    setSession(null);
    setLoading(false);
  };

  const setUserRole = async (newRole: UserRole) => {
    if (!user || !supabase || user.role === newRole) return;
    setLoading(true);
    // This is a conceptual role switch. In Supabase, you'd update the 'profiles' table.
    // Ensure you have RLS policies that allow users (or specific users) to update their role.
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        console.error("Error updating user role in DB:", error);
        alert(`Failed to update role: ${error.message}`);
    } else if (data) {
        setUser(prevUser => prevUser ? { ...prevUser, role: data.role as UserRole } : null);
        alert(`User role changed to ${newRole}. (May require re-login or page refresh for full effect in some parts of app if not fully reactive to 'profiles' changes)`);
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