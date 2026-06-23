-- Run this in your Supabase SQL Editor

-- 1. Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    face_descriptors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_uuid UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create unique constraint to prevent duplicate attendance on the same day
ALTER TABLE public.attendance 
ADD CONSTRAINT unique_attendance_per_day UNIQUE (student_uuid, date);

-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Allowing anonymous access for this prototype, in production you should restrict this to authenticated teachers)
CREATE POLICY "Allow all read access on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow all insert access on students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access on students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access on students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Allow all read access on attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Allow all insert access on attendance" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access on attendance" ON public.attendance FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access on attendance" ON public.attendance FOR DELETE USING (true);

-- 6. Storage Bucket for Student Photos
-- You will also need to create a storage bucket named 'student-photos' in the Supabase dashboard
-- and set it to "Public" so images can be displayed.
