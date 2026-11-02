#!/usr/bin/env python3
"""Isolated LOCAL database only. Needs psycopg 3 and P03_DATABASE_URL.
Creates disposable applicants. Reviewer/seed member must exist in local fixtures.
P03_REVIEWER_ID must have membership access in seed area; P03_MEMBER_ID is copied.
"""
import os, uuid, threading, time
import psycopg
from psycopg.types.json import Jsonb
from urllib.parse import urlparse
url=os.environ['P03_DATABASE_URL']
assert urlparse(url).hostname in ('localhost','127.0.0.1','::1'), 'LOCAL database only'
reviewer=os.environ['P03_REVIEWER_ID']; seed=os.environ['P03_MEMBER_ID']
# Use a scoped membership reviewer; destination must be outside their access.
destination=os.environ['P03_OUTSIDE_DISTRICT']
def connect():
 c=psycopg.connect(url,autocommit=True)
 c.execute("select set_config('request.jwt.claim.role','service_role',false)")
 c.execute("select set_config('request.jwt.claim.sub','',false)")
 return c
with connect() as setup:
 template=setup.execute('select to_jsonb(m) from public.members m where id=%s',(seed,)).fetchone()[0]
 for first,second in [('approve','approve'),('approve','reject'),('reject','approve'),('reject','reject'),('move','approve'),('move','reject')]:
  uid=str(uuid.uuid4()); mid=str(uuid.uuid4())
  digits=''.join(str(int(x,16)%10) for x in uuid.uuid4().hex[:13])
  cnic=f'{digits[:5]}-{digits[5:12]}-{digits[12]}'
  row=dict(template); row.update(id=mid,user_id=uid,cnic=cnic,status='pending',member_no=None,reviewed_by=None,reviewed_at=None,approved_at=None,rejection_reason=None)
  try:
   setup.execute("insert into auth.users(id,email,raw_user_meta_data) values (%s,%s,'{}')",(uid,uid+'@example.invalid'))
   setup.execute('insert into public.members select (jsonb_populate_record(null::public.members,%s)).*',(Jsonb(row),))
   setup.execute("insert into public.membership_payments(member_id,user_id,status,admin_note) values (%s,%s,'waived','P03 local fixture')",(mid,uid))
   a=connect(); b=connect(); a.execute('begin'); b.execute('begin')
   def review(c,action):
    return c.execute('select public.approve_member(%s,%s)' if action=='approve' else 'select public.reject_member(%s,%s,%s)',(mid,reviewer) if action=='approve' else (mid,'P03 test rejection',reviewer)).fetchone()
   if first=='move':
    allowed=setup.execute("select app_private.user_can_access_area_module(%s,'membership',%s,null,'approve') or app_private.user_can_access_area_module(%s,'membership',%s,null,'review')",(reviewer,destination,reviewer,destination)).fetchone()[0]
    assert not allowed,'Destination must be outside reviewer permissions'
    a.execute('update public.members set district=%s,taluka=null where id=%s',(destination,mid))
   else: review(a,first)
   outcome=[]
   def compete():
    try: review(b,second); outcome.append('unexpected success')
    except psycopg.Error as e: outcome.append(e.sqlstate)
    finally: b.execute('rollback'); b.close()
   t=threading.Thread(target=compete); t.start()
   deadline=time.monotonic()+10
   while time.monotonic()<deadline:
    waiting=setup.execute("select wait_event_type from pg_stat_activity where pid=%s",(b.info.backend_pid,)).fetchone()
    if waiting and waiting[0]=='Lock': break
    if outcome: raise AssertionError(outcome)
    time.sleep(.05)
   else: raise AssertionError('Competing session did not wait on lock')
   a.execute('commit'); a.close(); t.join(15)
   assert not t.is_alive() and outcome==['P0001'],outcome
   status=setup.execute('select status::text from public.members where id=%s',(mid,)).fetchone()[0]
   assert status==('pending' if first=='move' else 'approved' if first=='approve' else 'rejected'),status
   print('PASS',first,second)
  finally:
   # This suite is restricted to a disposable local DB; audit history remains.
   setup.execute('delete from public.membership_payments where member_id=%s',(mid,))
   setup.execute('delete from public.members where id=%s',(mid,))
   setup.execute('delete from auth.users where id=%s',(uid,))
