-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile and others public info" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authentication service" ON users;
DROP POLICY IF EXISTS "Allow public username checks" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile and other users' public info
CREATE POLICY "Users can read own profile and others public info"
ON users FOR SELECT
USING (
  auth.uid() = id OR
  auth.uid() IS NOT NULL
);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for inserting new users during signup
CREATE POLICY "Enable insert for authentication service"
ON users FOR INSERT
WITH CHECK (
  -- Allow insert if the new row's ID matches the authenticated user's ID
  auth.uid() = id OR
  -- OR if it's coming from the auth service (during signup)
  auth.role() = 'service_role'
);

-- Policy for username availability check
CREATE POLICY "Allow public username checks"
ON users FOR SELECT
USING (true); 