
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "YOUR_SUPABASE_URL_HERE";
const PLACEHOLDER_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

let supabase: SupabaseClient | null = null;
let initializationAttempted = false;
let initializationSuccess = false;
let credSourceDetails = "Initialization not yet attempted.";

// This function can be called to attempt initialization
function initializeSupabase() {
    if (initializationSuccess && supabase) {
        console.log("Supabase client: Already successfully initialized. Using existing client.", {
            urlSource: credSourceDetails
        });
        return;
    }

    if (initializationAttempted && !initializationSuccess) {
        console.warn(`Supabase client: Previous initialization attempt failed. Client remains null. Last known issue: ${credSourceDetails}`);
        // Do not re-attempt if the first explicit attempt failed due to config issues,
        // to prevent console spam and let App.tsx handle UI error display.
        // However, if it's the very first run of this module, proceed.
    }
    
    initializationAttempted = true; 
    console.log("Supabase client: Attempting initialization...");

    const windowSupabaseUrl = (window as any).SUPABASE_URL;
    const windowSupabaseAnonKey = (window as any).SUPABASE_ANON_KEY;
    const envSupabaseUrl = process.env.SUPABASE_URL; // Typically for server-side or build-time injection
    const envSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    let determinedSupabaseUrl: string | undefined = undefined;
    let determinedSupabaseAnonKey: string | undefined = undefined;
    let currentCredSource = "unknown";
    
    console.log(`Supabase client: Reading window credentials - URL: "${windowSupabaseUrl}" (type: ${typeof windowSupabaseUrl}), Key: "${windowSupabaseAnonKey}" (type: ${typeof windowSupabaseAnonKey})`);

    // 1. Prioritize window credentials if they are present and NOT placeholders
    if (windowSupabaseUrl && typeof windowSupabaseUrl === 'string' && windowSupabaseUrl.trim() !== '' && windowSupabaseUrl !== PLACEHOLDER_URL &&
        windowSupabaseAnonKey && typeof windowSupabaseAnonKey === 'string' && windowSupabaseAnonKey.trim() !== '' && windowSupabaseAnonKey !== PLACEHOLDER_KEY) {
        determinedSupabaseUrl = windowSupabaseUrl;
        determinedSupabaseAnonKey = windowSupabaseAnonKey;
        currentCredSource = "window object (index.html)";
        console.log(`Supabase client: Using valid credentials from ${currentCredSource}.`);
    } 
    // 2. Else, try environment variables if they are present and NOT placeholders
    // This is less common for pure client-side apps served statically without a build step that injects env vars.
    else {
        console.warn(`Supabase client: Window credentials from index.html are placeholders, missing, or invalid (URL: "${windowSupabaseUrl}", Key: "${windowSupabaseAnonKey}"). Checking process.env (less likely for client-side)...`);
        console.log(`Supabase client: Reading environment credentials - SUPABASE_URL: "${envSupabaseUrl}", SUPABASE_ANON_KEY: "${envSupabaseAnonKey}"`);
        if (envSupabaseUrl && typeof envSupabaseUrl === 'string' && envSupabaseUrl.trim() !== '' && envSupabaseUrl !== PLACEHOLDER_URL &&
            envSupabaseAnonKey && typeof envSupabaseAnonKey === 'string' && envSupabaseAnonKey.trim() !== '' && envSupabaseAnonKey !== PLACEHOLDER_KEY) {
            determinedSupabaseUrl = envSupabaseUrl;
            determinedSupabaseAnonKey = envSupabaseAnonKey;
            currentCredSource = "process.env";
            console.log(`Supabase client: Using valid credentials from ${currentCredSource}.`);
        } else {
            // Both window and env are problematic. Set details for App.tsx error display.
            if (windowSupabaseUrl === PLACEHOLDER_URL || windowSupabaseAnonKey === PLACEHOLDER_KEY) {
                credSourceDetails = "Placeholder credentials detected in window object (index.html). Environment variables also invalid or placeholders.";
            } else if (!windowSupabaseUrl || windowSupabaseUrl.trim() === '' || !windowSupabaseAnonKey || windowSupabaseAnonKey.trim() === '') {
                 credSourceDetails = "Credentials missing or empty in window object (index.html). Environment variables also invalid or placeholders.";
            } else {
                 credSourceDetails = "Credentials from both window object (index.html) and process.env appear invalid, are placeholders, or are missing."
            }
            console.error(`Supabase client: CRITICAL - Initialization failed. Reason: ${credSourceDetails}. Cannot create client.`);
            supabase = null;
            initializationSuccess = false;
            return; // Exit early, cannot proceed
        }
    }

    // 3. Attempt to create client if valid credentials were determined
    if (determinedSupabaseUrl && determinedSupabaseAnonKey) { 
        try {
            // Added detailed log before createClient
            console.log(`Supabase client: PRE-INITIALIZATION CHECK - About to call createClient() with:
              URL: "${determinedSupabaseUrl}" (Type: ${typeof determinedSupabaseUrl})
              Key: "[KEY PRESENT BUT MASKED FOR LOG]" (Type: ${typeof determinedSupabaseAnonKey}, Length: ${determinedSupabaseAnonKey?.length || 0})
              Source: ${currentCredSource}`);

            supabase = createClient(determinedSupabaseUrl, determinedSupabaseAnonKey);
            initializationSuccess = !!supabase; 
            if (initializationSuccess) {
                credSourceDetails = `Successfully initialized using credentials from ${currentCredSource}.`;
                console.log(`Supabase client: ${credSourceDetails}`);
            } else {
                credSourceDetails = `createClient() resulted in a null client despite seemingly valid args from ${currentCredSource}. This is unexpected.`;
                console.error(`Supabase client: CRITICAL - ${credSourceDetails}`);
            }
        } catch (error: any) {
            credSourceDetails = `Error during createClient() using credentials from ${currentCredSource}. URL: "${determinedSupabaseUrl}". Error: ${error.message || error}`;
            console.error(`Supabase client: CRITICAL - ${credSourceDetails}`);
            supabase = null; 
            initializationSuccess = false;
        }
    } else {
         credSourceDetails = `Not attempting to initialize because determined credentials are still somehow invalid (URL: "${determinedSupabaseUrl}", Key: "${determinedSupabaseAnonKey}"). This indicates a logic flaw.`;
         console.error(`Supabase client: CRITICAL - ${credSourceDetails}`);
         supabase = null;
         initializationSuccess = false;
    }
}

// Perform initial attempt when module is first loaded.
if (!initializationAttempted) {
    initializeSupabase();
} else {
    // This part handles HMR or other scenarios where the module might be re-evaluated.
    if (initializationSuccess && supabase) {
        console.log("Supabase client: Module re-evaluated. Already successfully initialized. Using existing client.");
    } else {
        console.warn(`Supabase client: Module re-evaluated. Initialization was previously attempted and failed or client is null. Re-attempting initialization.`);
        // Re-attempt, respecting the already set `initializationAttempted` and `initializationSuccess` logic inside.
        // If it failed before due to config, it will likely fail again and log, which is intended.
        if (!initializationSuccess) { // Only re-run the full logic if not already successful
            initializeSupabase();
        }
    }
}

export default supabase;
