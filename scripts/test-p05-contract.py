#!/usr/bin/env python3
"""Static scope/contract check. Does not replace execution of the SQL regression."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
old = (root/'supabase/migrations/20260914050000_reviewer_authorization_public_id_hardening.sql').read_text()
new = (root/'supabase/migrations/20261104090000_jas_p05_public_designation_validity.sql').read_text()
pattern = r'create(?: or replace)? function public\.get_public_designation_holders\(\).*?\$\$;'
a = re.search(pattern, old, re.S).group()
b = re.search(pattern, new, re.S).group()
assert "validity.valid_from <= current_date" in b
assert "(validity.valid_from + interval '1 year' - interval '1 day')::date >= current_date" in b
# Reverse only the intended changes: everything else must match the effective baseline RPC.
b = b.replace('create or replace function', 'create function', 1)
b = b.replace("validity.valid_from as tenure_start,\n    (validity.valid_from + interval '1 year' - interval '1 day')::date as tenure_end,",
              'coalesce(ocm.tenure_start, oc.tenure_start) as tenure_start,\n    coalesce(ocm.tenure_end, oc.tenure_end) as tenure_end,')
b = b.replace('  cross join lateral (\n    select coalesce(ocm.tenure_start, oc.tenure_start, ocm.created_at::date, current_date) as valid_from\n  ) validity\n', '')
b = b.replace("    and validity.valid_from <= current_date\n    and (validity.valid_from + interval '1 year' - interval '1 day')::date >= current_date\n", '')
assert a == b, 'RPC changed outside the date computation/filter scope'
assert 'revoke all on function public.get_public_designation_holders() from public;' in new
assert 'grant execute on function public.get_public_designation_holders() to anon, authenticated;' in new
assert len(re.findall(r'create(?: or replace)? function', new, re.I)) == 1
assert not re.search(r'\b(?:insert|update|delete|alter|drop)\s', re.sub(r'--[^\n]*', '', new), re.I), 'Unexpected data/schema mutation'
for path in sorted((root/'supabase/migrations').glob('*.sql')):
    if path.name > '20261104090000_jas_p05_public_designation_validity.sql':
        assert not re.search(pattern,path.read_text(),re.S), f'Later RPC override: {path.name}'
print('PASS: only public-directory date calculation/filter changed; response, IDs, gates, order and grants preserved.')
