-- Inserir buckets caso não existam
INSERT INTO storage.buckets (id, name)
VALUES 
  ('documents', 'documents'),
  ('clinical-files', 'clinical-files')
ON CONFLICT (id) DO NOTHING;

-- Garantir políticas de acesso (Select, Insert, Update, Delete)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access on documents' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access on documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access on clinical-files' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access on clinical-files" ON storage.objects FOR SELECT USING (bucket_id = 'clinical-files');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Upload on documents' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Upload on documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Upload on clinical-files' AND tablename = 'objects') THEN
        CREATE POLICY "Allow Upload on clinical-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clinical-files');
    END IF;
END $$;
