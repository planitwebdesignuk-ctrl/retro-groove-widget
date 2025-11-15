-- 1. First clear label_images to remove foreign key dependency
DELETE FROM public.label_images;

-- 2. Now we can safely delete the existing user
DELETE FROM auth.users WHERE email = 'pete@plan-it-web.co.uk';

-- 3. Create default admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Only create if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
    admin_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"needs_password_change":true}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin');
  END IF;
END $$;

-- 4. Insert default label image
INSERT INTO public.label_images (name, image_url, is_active)
VALUES ('Default Blank Label', '/images/label-blank-template.png', true);

-- Verification queries (comments only):
-- SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'admin@admin.com';
-- SELECT u.email, ur.role FROM auth.users u JOIN public.user_roles ur ON u.id = ur.user_id WHERE u.email = 'admin@admin.com';