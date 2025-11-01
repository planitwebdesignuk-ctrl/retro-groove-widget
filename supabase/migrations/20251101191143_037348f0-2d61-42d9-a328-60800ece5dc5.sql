-- Create app_role enum
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Create tracks table
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Enable RLS on tracks table
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracks
CREATE POLICY "Anyone can view tracks"
  ON tracks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tracks"
  ON tracks FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tracks"
  ON tracks FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create tracks bucket for file storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true);

-- RLS Policies for storage
CREATE POLICY "Anyone can view track files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tracks');

CREATE POLICY "Admins can upload track files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tracks' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update track files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tracks' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete track files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tracks' AND has_role(auth.uid(), 'admin'));