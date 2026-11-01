// Isolated in-memory PostgreSQL test harness. Never connects to a hosted project.
import { PGlite } from '../qa-runtime/node_modules/@electric-sql/pglite/dist/index.js'
import { pgcrypto } from '../qa-runtime/node_modules/@electric-sql/pglite/dist/contrib/pgcrypto.js'
import { readFile,readdir } from 'node:fs/promises'
const db=new PGlite({ extensions:{pgcrypto} })
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create table auth.users(id uuid primary key, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz default now(),updated_at timestamptz default now(),unique(bucket_id,name));
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
grant usage on schema auth,storage to anon,authenticated,service_role;
grant execute on all functions in schema auth,storage to anon,authenticated,service_role;
grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
grant select on storage.buckets to anon,authenticated,service_role;
`)
for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
  if(file==='20261101090000_jas_p02_database_access.sql') {
    await db.exec(`select set_config('request.jwt.claim.role','service_role',false);
      insert into auth.users(id,email) values('b2000000-0000-4000-8000-000000000099','historical@example.invalid');
      insert into public.members(id,user_id,full_name,father_name,cnic,mobile,district,taluka,address,declaration_accepted,photo_url,status)
      values('b2000000-0000-4000-8000-000000000098','b2000000-0000-4000-8000-000000000099','Historical Applicant','Historical Parent','44404-9886552-3','03001234567','Umerkot','Kunri','Historical address',true,'b2000000-0000-4000-8000-000000000099/photo.jpg','pending');
      insert into public.membership_payments(member_id,user_id,base_amount,tax_amount,total_amount,status)
      values('b2000000-0000-4000-8000-000000000098','b2000000-0000-4000-8000-000000000099',600,0,600,'pending');`)
  }
  try { await db.exec(await readFile('supabase/migrations/'+file,'utf8')); console.log('Migration OK',file) }
  catch(error) { console.error('Migration FAILED',file,error.message);process.exit(1) }
}
const historical=await db.query(`select m.membership_fee_required,p.total_amount from public.members m join public.membership_payments p on p.member_id=m.id where m.id='b2000000-0000-4000-8000-000000000098'`)
if(historical.rows[0]?.membership_fee_required!==false || Number(historical.rows[0]?.total_amount)!==600) throw new Error('Historical application/payment changed')
console.log('Historical PKR 600 payment and grandfathered application preserved.')
// Persist no credentials or production data. All fixtures exist in this transient DB only.
if (process.argv.includes('--migration-only')) { await db.close(); process.exit(0) }
await db.exec(await readFile('supabase/tests/jas-p02-access-and-fees.sql','utf8'))
console.log('P0.2 database authorization and fee integration tests passed.')
await db.exec(await readFile('supabase/tests/reviewer-authorization-public-id-hardening.sql','utf8'))
console.log('P0.1 reviewer authorization regression passed.')
await db.close()
