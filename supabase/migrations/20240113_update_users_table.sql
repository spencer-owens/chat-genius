-- Update users table schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'offline',
  profile_picture TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add is_verified column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'is_verified') 
  THEN
    ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile and others public info" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authentication service" ON users;
DROP POLICY IF EXISTS "Allow public username checks" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Super permissive policies for development
CREATE POLICY "Enable read access for all users"
ON users FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON users FOR INSERT
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "Enable update access for authenticated users"
ON users FOR UPDATE
USING (auth.role() IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Trust authenticated users by default
ALTER TABLE users FORCE ROW LEVEL SECURITY; 