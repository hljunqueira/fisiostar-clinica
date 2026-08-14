ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS target_professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE;
