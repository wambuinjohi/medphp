-- Allow anonymous users to read company information (needed for login page)
-- This is safe because company information is not sensitive and needs to be displayed on the login page

CREATE POLICY "Public can read companies" ON companies
  FOR SELECT 
  USING (true);
