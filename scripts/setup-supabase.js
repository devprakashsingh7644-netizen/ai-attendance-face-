/**
 * Supabase Full Auto-Setup Script
 * Uses: Service Role Key (from Dashboard → Settings → API)
 * 
 * Run: node scripts/setup-supabase.js <SERVICE_ROLE_KEY>
 */

const SUPABASE_URL = 'https://zpbhrlwgidymbhekheyw.supabase.co';
const PROJECT_REF  = 'zpbhrlwgidymbhekheyw';

const serviceKey = process.argv[2];

if (!serviceKey) {
  console.log('\n❌ Missing Service Role Key!\n');
  console.log('HOW TO GET IT:');
  console.log('  1. Go to: https://supabase.com/dashboard/project/zpbhrlwgidymbhekheyw/settings/api');
  console.log('  2. Scroll to "Project API keys"');
  console.log('  3. Copy the "service_role" key (NOT the anon key)');
  console.log('  4. Run: node scripts/setup-supabase.js <PASTE_KEY_HERE>\n');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${serviceKey}`,
  'apikey': serviceKey,
};

// ─── SQL Statements (split for easier debugging) ────────────────────────────

const SQL_STATEMENTS = [
  {
    name: 'Create students table',
    sql: `CREATE TABLE IF NOT EXISTS public.students (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      student_id VARCHAR(50) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      class_name VARCHAR(100) NOT NULL,
      photo_urls JSONB DEFAULT '[]'::jsonb,
      face_descriptors JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`
  },
  {
    name: 'Create attendance table',
    sql: `CREATE TABLE IF NOT EXISTS public.attendance (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      student_uuid UUID REFERENCES public.students(id) ON DELETE CASCADE,
      student_id VARCHAR(50) NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'Present',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );`
  },
  {
    name: 'Add unique constraint',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_attendance_per_day') THEN
        ALTER TABLE public.attendance ADD CONSTRAINT unique_attendance_per_day UNIQUE (student_uuid, date);
      END IF;
    END $$;`
  },
  { name: 'Enable RLS on students',   sql: `ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;` },
  { name: 'Enable RLS on attendance', sql: `ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;` },
  { name: 'Drop old student policies', sql: `
    DROP POLICY IF EXISTS "Allow all read on students"   ON public.students;
    DROP POLICY IF EXISTS "Allow all insert on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all update on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all delete on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all read access on students"   ON public.students;
    DROP POLICY IF EXISTS "Allow all insert access on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all update access on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all delete access on students" ON public.students;
  `},
  { name: 'Create students SELECT policy', sql: `CREATE POLICY "Allow all read on students"   ON public.students FOR SELECT USING (true);` },
  { name: 'Create students INSERT policy', sql: `CREATE POLICY "Allow all insert on students" ON public.students FOR INSERT WITH CHECK (true);` },
  { name: 'Create students UPDATE policy', sql: `CREATE POLICY "Allow all update on students" ON public.students FOR UPDATE USING (true);` },
  { name: 'Create students DELETE policy', sql: `CREATE POLICY "Allow all delete on students" ON public.students FOR DELETE USING (true);` },
  { name: 'Drop old attendance policies', sql: `
    DROP POLICY IF EXISTS "Allow all read on attendance"   ON public.attendance;
    DROP POLICY IF EXISTS "Allow all insert on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all update on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all delete on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all read access on attendance"   ON public.attendance;
    DROP POLICY IF EXISTS "Allow all insert access on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all update access on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all delete access on attendance" ON public.attendance;
  `},
  { name: 'Create attendance SELECT policy', sql: `CREATE POLICY "Allow all read on attendance"   ON public.attendance FOR SELECT USING (true);` },
  { name: 'Create attendance INSERT policy', sql: `CREATE POLICY "Allow all insert on attendance" ON public.attendance FOR INSERT WITH CHECK (true);` },
  { name: 'Create attendance UPDATE policy', sql: `CREATE POLICY "Allow all update on attendance" ON public.attendance FOR UPDATE USING (true);` },
  { name: 'Create attendance DELETE policy', sql: `CREATE POLICY "Allow all delete on attendance" ON public.attendance FOR DELETE USING (true);` },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function executeSingleSQL(name, sql) {
  // Use the Supabase Management API to run arbitrary SQL
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: resp.ok, status: resp.status, data };
}

// Try via pg-meta REST endpoint (available in some Supabase plans)
async function executeSQLViaRPC(sql) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: { ...headers, 'Content-Profile': 'public' },
    body: JSON.stringify({ sql }),
  });
  return { ok: resp.ok, status: resp.status };
}

async function createBucket() {
  console.log('\n📦 Creating storage bucket: student-photos...');
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'student-photos',
      name: 'student-photos',
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (resp.ok) {
    console.log('   ✅ Bucket "student-photos" created & set to PUBLIC');
    return true;
  } else if (resp.status === 409 || data.error === 'Duplicate' || (data.message || '').includes('already exists')) {
    console.log('   ℹ️  Bucket already exists — ensuring it is public...');
    const upd = await fetch(`${SUPABASE_URL}/storage/v1/bucket/student-photos`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ public: true, file_size_limit: 5242880 }),
    });
    console.log(upd.ok ? '   ✅ Bucket updated to public!' : '   ⚠️  Could not update — set manually in dashboard');
    return true;
  } else {
    console.log(`   ❌ Failed (${resp.status}):`, JSON.stringify(data));
    return false;
  }
}

async function verifyTables() {
  const s = await fetch(`${SUPABASE_URL}/rest/v1/students?limit=1`, { headers });
  const a = await fetch(`${SUPABASE_URL}/rest/v1/attendance?limit=1`, { headers });
  return { studentsOk: s.ok, attendanceOk: a.ok };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀  AI Attendance — Supabase Auto Setup');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n📡 Project: ${SUPABASE_URL}\n`);

  // ── STEP 1: Run SQL via Management API ──────────────────────────────────
  console.log('━━━ STEP 1: Database Schema ━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let sqlApiWorked = false;
  let successCount = 0;

  for (const { name, sql } of SQL_STATEMENTS) {
    const { ok, status, data } = await executeSingleSQL(name, sql);
    if (ok) {
      console.log(`   ✅ ${name}`);
      successCount++;
      sqlApiWorked = true;
    } else {
      const msg = data?.message || data?.error || JSON.stringify(data);
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        console.log(`   ℹ️  ${name} (skipped — already applied)`);
        successCount++;
      } else if (status === 401 || status === 403) {
        console.log(`   ⚠️  ${name} — API auth failed (${status})`);
        break;
      } else {
        console.log(`   ⚠️  ${name} — ${msg.substring(0, 80)}`);
      }
    }
  }

  // ── STEP 2: Storage Bucket ───────────────────────────────────────────────
  console.log('\n━━━ STEP 2: Storage Bucket ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const bucketOk = await createBucket();

  // ── STEP 3: Verify ───────────────────────────────────────────────────────
  console.log('\n━━━ STEP 3: Verification ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const { studentsOk, attendanceOk } = await verifyTables();
  
  const bucketCheck = await fetch(`${SUPABASE_URL}/storage/v1/bucket/student-photos`, { headers });
  const bucketExists = bucketCheck.ok;

  console.log(`   students table  : ${studentsOk  ? '✅ READY' : '❌ MISSING'}`);
  console.log(`   attendance table: ${attendanceOk ? '✅ READY' : '❌ MISSING'}`);
  console.log(`   student-photos  : ${bucketExists ? '✅ READY' : '❌ MISSING'}`);

  // ── FINAL SUMMARY ────────────────────────────────────────────────────────
  const allGood = studentsOk && attendanceOk && bucketExists;

  console.log('\n═══════════════════════════════════════════════════════');
  if (allGood) {
    console.log('  🎉  ALL DONE! Your Supabase is fully configured.\n');
    console.log('  Next steps:');
    console.log('  1. npm run dev');
    console.log('  2. Click "Sign Up" on the login page');
    console.log('  3. Create your teacher account & sign in\n');
    console.log('  TIP: Disable email confirmation for testing:');
    console.log('  → https://supabase.com/dashboard/project/zpbhrlwgidymbhekheyw/auth/providers');
  } else {
    console.log('  ⚠️  PARTIAL SETUP — Manual action needed\n');
    if (!studentsOk || !attendanceOk) {
      console.log('  📋 Run schema SQL manually:');
      console.log('  → https://supabase.com/dashboard/project/zpbhrlwgidymbhekheyw/sql/new');
      console.log('  → Open file: supabase/schema.sql and paste + Run\n');
    }
    if (!bucketExists) {
      console.log('  📦 Create bucket manually:');
      console.log('  → https://supabase.com/dashboard/project/zpbhrlwgidymbhekheyw/storage/buckets');
      console.log('  → New bucket → name: student-photos → Public: ON\n');
    }
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
