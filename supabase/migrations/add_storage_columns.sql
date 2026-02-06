-- 1. Create Storage Buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('patient-photos', 'patient-photos', true),
  ('signatures', 'signatures', true)
on conflict (id) do nothing;

-- 2. Enable RLS on specific buckets (optional, but good practice if not already)
-- Note: 'public' buckets are readable by everyone, but we need policies for upload/delete.

-- Policy: Give public access to view files (already implied by public=true for SELECT, but explicit policy helps for other operations)
create policy "Public Access to specific buckets"
  on storage.objects for select
  using ( bucket_id in ('avatars', 'patient-photos', 'signatures') );

-- Policy: Allow authenticated users to upload files
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( auth.role() = 'authenticated' );

-- Policy: Allow authenticated users to update/delete their own files (Simple version: allow all auth users for now)
-- In production, you might want to restrict this to the user who owns the file or based on folder structure
create policy "Authenticated users can update/delete"
  on storage.objects for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete"
  on storage.objects for delete
  using ( auth.role() = 'authenticated' );

-- 3. Update Database Schema
-- Add signature_url to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add avatar_url to professionals table
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Note: system_users and patients already have avatar_url/photo_url columns.
