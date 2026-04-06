-- Run this SQL in your Supabase SQL Editor to correctly set up your Storage Buckets and Policies

-- Enable extensions if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the 'stock-images' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-images', 'stock-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable policy to allow anyone to view images (Public access)
-- Note: Check if policies already exist to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Access" ON "storage"."objects" FOR SELECT TO public USING (bucket_id = 'stock-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload stock images' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload stock images" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stock-images');
    END IF;
END $$;

-- 3. Create 'public' bucket fallback
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Full' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Access Full" ON "storage"."objects" FOR SELECT TO public USING (bucket_id = 'public');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload Full' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Auth Upload Full" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public');
    END IF;
END $$;
