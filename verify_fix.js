import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('students').insert([{
  student_id: 'TEST_' + Date.now(),
  full_name: 'Test Student',
  class_name: 'Grade 10A',
  face_descriptors: [],
  photo_urls: []
}]).select();

if (error) {
  console.error('❌ Still failing:', error.message);
} else {
  console.log('✅ Insert works! Schema is fully fixed.');
  await supabase.from('students').delete().eq('student_id', data[0].student_id);
  console.log('🧹 Cleaned up test row.');
}
