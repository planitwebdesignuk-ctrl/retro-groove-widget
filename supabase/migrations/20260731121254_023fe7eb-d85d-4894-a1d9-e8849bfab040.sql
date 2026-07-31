CREATE TABLE public.player_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active_theme text NOT NULL DEFAULT 'vintage_walnut',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_settings TO authenticated;
GRANT ALL ON public.player_settings TO service_role;

ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player settings"
ON public.player_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert player settings"
ON public.player_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update player settings"
ON public.player_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_player_settings_updated_at
BEFORE UPDATE ON public.player_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.player_settings (active_theme) VALUES ('vintage_walnut');

ALTER PUBLICATION supabase_realtime ADD TABLE public.player_settings;