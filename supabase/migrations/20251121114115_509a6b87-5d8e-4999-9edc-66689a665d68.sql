-- Allow authenticated users to insert their own role row (needed for initial admin setup)
CREATE POLICY "Users can insert their own roles"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());