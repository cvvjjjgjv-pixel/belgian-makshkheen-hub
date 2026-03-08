
-- Allow admins to update any user's role (super_admin can do everything via existing policy)
-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete any user's posts (already exists but let's ensure)
-- Allow admins to view all user_badges
CREATE POLICY "Admins can view all badges" ON public.user_badges FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
