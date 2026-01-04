-- Allow company admins to insert new profiles in their company
drop policy if exists "Admins can create profiles" on public.profiles;
create policy "Admins can create profiles" on public.profiles
for insert
with check (
  company_id is null or
  public.is_company_admin(company_id)
);
