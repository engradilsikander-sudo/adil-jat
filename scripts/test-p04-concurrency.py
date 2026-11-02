#!/usr/bin/env python3
"""Disposable localhost DB only; psycopg3. Commits fixtures/counter updates.
Uses a future unused counter year via transaction-local timezone? No: tests current year.
Refuses an existing counter >=9998. Restores counter only on successful test.
No other clients may write membership data during this test.
"""
import os,uuid,threading
from urllib.parse import urlparse
import psycopg
url=os.environ['P04_DATABASE_URL']
assert urlparse(url).hostname in ('localhost','127.0.0.1','::1')
assert os.environ.get('P04_DISPOSABLE_DB')=='YES','Disposable local database confirmation required'
def conn():
 c=psycopg.connect(url,autocommit=True,options='-c statement_timeout=20000 -c lock_timeout=15000')
 c.execute("select set_config('request.jwt.claim.role','service_role',false)")
 c.execute("select set_config('request.jwt.claim.sub','',false)")
 return c
users=[]; members=[]; results=[]; failures=[]
with conn() as db:
 year=db.execute('select extract(year from now())::int').fetchone()[0]
 old=db.execute('select last_seq from public.member_counters where year=%s',(year,)).fetchone()
 assert old is None or old[0]<9998,'Use disposable DB with counter below 9998'
 assert not db.execute("select 1 from public.members where member_no=any(%s)",([f'JAS-{year}-{n}' for n in (9999,10000,10001)],)).fetchone()
 reviewer=str(uuid.uuid4())
 try:
  with db.transaction():
   db.execute("insert into auth.users(id,email,raw_user_meta_data) values (%s,%s,'{}')",(reviewer,reviewer+'@example.invalid'));users.append(reviewer)
   db.execute("insert into public.user_roles(user_id,role) values (%s,'super_admin')",(reviewer,))
   for i in range(3):
    uid=str(uuid.uuid4()); mid=str(uuid.uuid4()); d=str(uuid.uuid4().int)[:13]
    db.execute("insert into auth.users(id,email,raw_user_meta_data) values (%s,%s,'{}')",(uid,uid+'@example.invalid'));users.append(uid)
    db.execute("""insert into public.members(id,user_id,full_name,father_name,cnic,mobile,district,address,photo_url,declaration_accepted)
     values (%s,%s,'P04 Test','Test Parent',%s,'03001234567','Umerkot','Local fixture',%s,true)""",(mid,uid,d[:5]+'-'+d[5:12]+'-'+d[12],uid+'/test.jpg'));members.append(mid)
    db.execute("insert into public.membership_payments(member_id,user_id,status,admin_note) values (%s,%s,'waived','P04 fixture')",(mid,uid))
   db.execute('insert into public.member_counters(year,last_seq) values (%s,9998) on conflict(year) do update set last_seq=9998',(year,))
  barrier=threading.Barrier(3)
  def worker(mid):
   try:
    with conn() as c:
     barrier.wait(timeout=10)
     results.append(c.execute('select (public.approve_member(%s,%s)).member_no',(mid,reviewer)).fetchone()[0])
   except Exception as e: failures.append(str(e))
  threads=[threading.Thread(target=worker,args=(mid,)) for mid in members]
  for t in threads:t.start()
  for t in threads:t.join(30)
  assert not any(t.is_alive() for t in threads),'Thread timeout'
  assert not failures,failures
  assert set(results)=={f'JAS-{year}-{n}' for n in (9999,10000,10001)},results
  print('PASS concurrent distinct approvals:',sorted(results))
 finally:
  for mid in members:
   db.execute('delete from public.membership_payments where member_id=%s',(mid,))
   db.execute('delete from public.members where id=%s',(mid,))
  db.execute('delete from public.user_roles where user_id=%s',(reviewer,))
  for uid in users:db.execute('delete from auth.users where id=%s',(uid,))
  # Dedicated database only: do not run alongside other writers.
  if old:db.execute('update public.member_counters set last_seq=%s where year=%s',(old[0],year))
  else:db.execute('delete from public.member_counters where year=%s',(year,))
