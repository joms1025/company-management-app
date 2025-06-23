
# Company Management System

A comprehensive company management system with voice note translation, group chat, task management, and video calling features.

## Project Setup

### 1. Supabase Setup

This project requires a Supabase backend. If you haven't already, create a project at [supabase.com](https://supabase.com).

**A. Environment Variables:**

You need to configure your Supabase URL and Anon Key, along with your Gemini API Key.

**For Local Development (using `index.html` placeholders):**

*   Open `index.html`.
*   Locate the following lines:
    ```html
    window.SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; 
    window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";
    window.GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
    ```
*   Replace the placeholder strings with your actual Supabase Project URL, Supabase Anon Key, and your Google Gemini API Key. You can find your Supabase keys in your Supabase project dashboard under Project Settings &gt; API.

**IMPORTANT FOR DEPLOYMENT (e.g., Vercel, Netlify):**

For production or any deployment, **DO NOT** hardcode your actual keys in `index.html`. Instead, use environment variables provided by your hosting platform. The application's `supabaseClient.ts` and `geminiService.ts` are set up to preferentially use `process.env` variables if `index.html` placeholders are detected or if `window` variables are not valid.

*   `SUPABASE_URL`: Your Supabase project URL.
*   `SUPABASE_ANON_KEY`: Your Supabase project anon key.
*   `GEMINI_API_KEY`: Your Google Gemini API Key.

The application will show a critical error if these are not configured correctly.

**B. Database Tables:**

You need to create the following tables in your Supabase SQL Editor (Supabase Dashboard &gt; SQL Editor &gt; New Query).

**Profiles Table:** Stores user-specific information linked to authenticated users.

```sql
-- Create the 'profiles' table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY, -- This MUST match the id from auth.users
  name TEXT,
  email TEXT UNIQUE, -- Can be used to ensure uniqueness if desired, matches auth.users.email
  role TEXT DEFAULT 'User'::text, -- Corresponds to your UserRole enum ('User', 'Admin')
  department TEXT,                -- Corresponds to your Department enum
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own profile
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING ( auth.uid() = id );

-- Policy: Allow users to update their own profile (e.g., name, department, role)
-- Adjust which fields are updatable as needed.
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

-- Grant necessary permissions for authenticated users to interact with their own profile.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
-- The 'anon' role might need SELECT if you display public profiles (not current use case).
-- GRANT SELECT ON public.profiles TO anon;


-- Function to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to operate with elevated privileges
SET search_path = public -- Ensures the function operates in the public schema
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Fallback name to email if not provided
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'User'), -- Default to 'User'
    COALESCE((NEW.raw_user_meta_data->>'department')::text, 'Office') -- Default to 'Office'
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

```

**Tasks Table:** Manages tasks assigned to departments.

```sql
-- Create the 'tasks' table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_department TEXT NOT NULL, -- Corresponds to Department enum
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'::text, -- Corresponds to TaskStatus enum
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to manage all tasks
CREATE POLICY "Admins can manage all tasks."
  ON public.tasks FOR ALL
  USING ( (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = 'Admin'::text );

-- Policy: Allow users to view tasks assigned to their department
CREATE POLICY "Users can view tasks for their department."
  ON public.tasks FOR SELECT
  USING ( (SELECT profiles.department FROM public.profiles WHERE profiles.id = auth.uid()) = assigned_to_department );

-- Policy: Allow users to update status of tasks in their department (e.g., mark as done)
-- Restrict this further if needed, e.g., only assigned user can update.
-- For simplicity, department members can update status if they are not admin (admin covered by above).
CREATE POLICY "Users can update status of tasks in their department."
  ON public.tasks FOR UPDATE
  USING (
    (SELECT profiles.department FROM public.profiles WHERE profiles.id = auth.uid()) = assigned_to_department AND
    (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) != 'Admin'::text -- Admins are covered by their own policy
  )
  WITH CHECK (
    (SELECT profiles.department FROM public.profiles WHERE profiles.id = auth.uid()) = assigned_to_department
  );


-- Grant permissions (RLS policies will enforce access)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

```

**Chat Messages Table:** Stores group chat messages.

```sql
-- Create the 'chat_messages' table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  department TEXT NOT NULL, -- Corresponds to Department enum
  type TEXT NOT NULL DEFAULT 'text'::text, -- 'text' or 'voice'
  text_content TEXT,
  voice_note_data JSONB, -- Store structured voice note data (transcription, translation, etc.)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view messages in their own department or 'All Departments' (for admin broadcasts)
CREATE POLICY "Users can view messages in their department or global."
  ON public.chat_messages FOR SELECT
  USING (
    department = (SELECT profiles.department FROM public.profiles WHERE profiles.id = auth.uid()) OR
    department = 'All Departments'::text -- Allows viewing of admin broadcasts
  );

-- Policy: Allow users to insert messages into their own department.
-- Admins can insert into any department (including 'All Departments' for broadcast text notifications).
CREATE POLICY "Users can insert messages into their department; Admins can insert anywhere."
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    ( -- Regular user sending to their own department
      department = (SELECT profiles.department FROM public.profiles WHERE profiles.id = auth.uid()) AND
      sender_id = auth.uid() AND
      department != 'All Departments'::text -- Regular users cannot send TO 'All Departments'
    ) OR
    ( -- Admin sending to any department, including 'All Departments'
      (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = 'Admin'::text AND
      sender_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;
-- UPDATE and DELETE are typically restricted or handled via soft deletes/moderation.
```

### 2. Install Dependencies

This project uses ES Modules via an `importmap` in `index.html`. Dependencies are fetched directly from CDNs like `esm.sh`. No explicit `npm install` is required for the listed dependencies if you run it directly in a browser that supports import maps.

If you intend to use a build system (like Vite, Parcel, Webpack):
1.  You would typically create a `package.json` file.
2.  Add dependencies: `npm install react react-dom react-router-dom @supabase/supabase-js @google/genai`.
3.  Configure your build tool to handle TypeScript, JSX, and CSS.

### 3. Running the Application

*   Ensure you have configured your Supabase and Gemini credentials (see Step 1A).
*   Serve `index.html` using a local web server. A simple way is to use `npx serve .` in the project root if you have Node.js installed.
*   Open the application in your browser.

## Key Features

*   **Authentication:** User registration and login via Supabase.
*   **Dashboard:** Overview of tasks and recent chat activity.
*   **Group Chat:** Department-based real-time chat.
*   **Voice Notes:** Record/upload audio, transcribe, translate to English, and send to chat. (Uses Gemini API)
*   **Task Management:** Create, view, and update tasks for departments.
*   **Video Call (Conceptual):** Basic UI for department-based or broadcast video calls. (WebRTC/signaling not fully implemented).
*   **Settings:** View user profile information.
*   **Dark Mode:** Toggle between light and dark themes.

## Troubleshooting

*   **`index.css` or `favicon.ico` 404 Not Found Errors:**
    *   This is often due to browser caching. Perform a **hard refresh** (Ctrl+Shift+R or Cmd+Shift+R) and **clear your browser cache** for the site.
    *   The application uses `import './index.css'` in `index.tsx`. A build tool (often used by Vercel/Netlify) should bundle this. If the 404 persists after cache clearing and a fresh deployment, check your deployment build logs for CSS processing errors.

*   **"relation public.profiles does not exist" (or similar for `tasks`, `chat_messages`):**
    *   This means the required Supabase database tables are missing. Follow the SQL instructions in **Section 1B. Database Tables** above to create them.

*   **Gemini API Errors ("API key not valid", "Quota exceeded"):**
    *   Ensure `GEMINI_API_KEY` is correctly set and the key is valid and has the Gemini API enabled in your Google Cloud project.
    *   Check your Gemini API quota limits.

*   **Application Stuck on Loading / Critical Error Display:**
    *   Check the browser's Developer Console (F12) for specific error messages.
    *   Verify your Supabase credentials in `index.html` (for local dev) or environment variables (for deployment) are correct and not placeholders.

## Production Considerations

*   **Tailwind CSS CDN:** The application currently uses the Tailwind CSS CDN (`<script src="https://cdn.tailwindcss.com"></script>`) for rapid development. For production, it's highly recommended to install Tailwind CSS as a PostCSS plugin or use the Tailwind CLI. See: [Tailwind CSS Installation](https://tailwindcss.com/docs/installation)
*   **Environment Variables:** As mentioned, ensure all API keys and Supabase credentials are set via secure environment variables in your hosting environment, not hardcoded in client-side files.
*   **Error Handling & Logging:** Enhance client-side and server-side (if applicable) error handling and logging for production monitoring.
*   **Security:** Review and tighten Supabase Row Level Security (RLS) policies based on your exact application needs.
*   **Video Call Implementation:** The video call page is currently a placeholder UI. A full implementation would require a WebRTC solution and a signaling server.

## Code Structure

*   `index.html`: Main HTML entry point, includes import maps and initial credential setup for local dev.
*   `index.tsx`: Main React application entry point, sets up AuthProvider and renders App.
*   `App.tsx`: Defines routing and main application layout structure.
*   `components/`: Reusable UI components.
*   `contexts/`: React Context providers (e.g., `AuthContext`).
*   `hooks/`: Custom React Hooks (e.g., `useAudioRecorder`).
*   `pages/`: Top-level page components for each route.
*   `services/`: Modules for interacting with external APIs (Supabase, Gemini).
    *   `supabaseClient.ts`: Initializes the Supabase client.
    *   `geminiService.ts`: Handles interactions with the Gemini API.
    *   `mockDataService.ts`: Simulates backend data fetching and manipulation (interacts with Supabase).
*   `types.ts`: TypeScript type definitions.
*   `constants.ts`: Application-wide constants.
*   `index.css`: Global styles and base Tailwind directives (if Tailwind were processed via PostCSS). Currently basic global styles.

---

This README should help you get the Company Management System up and running!
