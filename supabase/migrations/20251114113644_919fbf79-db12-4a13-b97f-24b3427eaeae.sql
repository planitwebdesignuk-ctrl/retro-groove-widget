-- Create function to automatically assign 'user' role to new signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  return new;
end;
$$;

-- Create trigger that fires when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fix existing users who don't have roles yet
insert into public.user_roles (user_id, role)
select id, 'user'::app_role
from auth.users
where id not in (select user_id from public.user_roles);