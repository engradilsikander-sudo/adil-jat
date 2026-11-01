#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

log_section() {
  echo -e "\n${BLUE}== $1 ==${NC}"
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo -e "${YELLOW}⚠${NC} $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo -e "${RED}✗${NC} $1"
}

require_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    pass "Found $file"
  else
    fail "Missing $file"
  fi
}

require_dir() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    pass "Found $dir/"
  else
    fail "Missing $dir/"
  fi
}

run_cmd() {
  local title="$1"
  shift
  log_section "$title"
  if "$@"; then
    pass "$title passed"
  else
    fail "$title failed"
    return 1
  fi
}

log_section "JAS Production Readiness + QA Phase 9"
echo "Root: $ROOT_DIR"
echo "Date: $(date -Is)"

log_section "Required project files"
require_file "package.json"
require_file "package-lock.json"
require_file "README.md"
require_file ".env.example"
require_file ".gitignore"
require_file ".zipignore"
require_dir "src/routes"
require_dir "supabase/migrations"
require_dir "supabase/templates"
require_file "supabase/functions/send-notification-emails/index.ts"
require_file "supabase/functions/send-web-push/index.ts"
require_file "supabase/migrations/20260711010000_web_push_reliability_preferences.sql"
require_file "supabase/qa/web-push-reliability-smoke-tests.sql"
require_file "src/routes/notification-preferences.tsx"
require_file "src/routes/admin/notifications.tsx"
require_file "src/routeTree.gen.ts"

log_section "Critical routes registered"
critical_routes=(
  "/admin"
  "/admin/audit-logs"
  "/admin/area-permissions"
  "/admin/roles"
  "/admin/committees"
  "/designation-card"
  "/verify/office-bearer/\$officeBearerId"
  "/admin/members/\$id/designation-card"
  "/card"
  "/dashboard"
  "/profile-update"
  "/admin/profile-update-requests"
  "/notification-preferences"
  "/admin/notifications"
)

for route in "${critical_routes[@]}"; do
  if grep -q "$route" src/routeTree.gen.ts; then
    pass "Route registered: $route"
  else
    warn "Route not found in routeTree.gen.ts: $route"
  fi
 done

log_section "Migration files present"
migrations=(
  "20260601220000_security_advisor_phase1.sql"
  "20260601230000_performance_advisor_phase1.sql"
  "20260602001000_fix_organization_committees_rls_recursion.sql"
  "20260602002000_rbac_membership_admin_phase1.sql"
  "20260602003000_database_area_rls_enforcement_phase3.sql"
  "20260602004000_database_audit_logs_phase1.sql"
  "20260710193000_member_card_csv_export_audit.sql"
  "20260710213000_profile_update_requests.sql"
  "20260710230000_branded_notification_emails.sql"
  "20260711010000_web_push_reliability_preferences.sql"
)

for migration in "${migrations[@]}"; do
  if find supabase/migrations -maxdepth 1 -name "$migration" | grep -q .; then
    pass "Migration found: $migration"
  else
    warn "Migration missing or not yet applied locally: $migration"
  fi
 done

log_section "Repository hygiene"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked_forbidden=$(git ls-files | grep -E '(^\.env$|^\.env\.local$|^\.env\.(development|production|test|preview|staging)$|^\.env\..*\.local$|^node_modules/|^\.output/|^dist/|^dist-ssr/|^supabase/\.temp/|^supabase/\.branches/|^supabase/snippets/|\.zip$|\.apk$|\.aab$|\.keystore$)' || true)
  if [[ -n "$tracked_forbidden" ]]; then
    fail "Forbidden/sensitive files are tracked by git:"
    echo "$tracked_forbidden"
  else
    pass "No forbidden files tracked by git"
  fi

  untracked_forbidden=$(git status --porcelain --untracked-files=all | awk '{print $2}' | grep -E '(^\.env$|^\.env\.local$|^\.env\.(development|production|test|preview|staging)$|^\.env\..*\.local$|^node_modules/|^\.output/|^dist/|^dist-ssr/|^supabase/\.temp/|^supabase/\.branches/|^supabase/snippets/|\.zip$|\.apk$|\.aab$|\.keystore$)' || true)
  if [[ -n "$untracked_forbidden" ]]; then
    warn "Forbidden/sensitive files exist locally but are untracked. Do not export/share them:"
    echo "$untracked_forbidden"
  else
    pass "No forbidden untracked files detected by git status"
  fi
else
  warn "Not inside a git repository; skipping git hygiene checks"
fi

if [[ -f ".env.local" ]]; then
  warn ".env.local exists locally. This is okay for local development, but never include it in zip/export. Rotate cloud service role key if it was shared."
fi

log_section "Environment documentation"
if grep -q "SUPABASE_URL" .env.example; then pass ".env.example documents SUPABASE_URL"; else warn ".env.example does not document SUPABASE_URL"; fi
if grep -q "VITE_PUBLIC_SITE_URL" .env.example; then pass ".env.example documents VITE_PUBLIC_SITE_URL"; else warn ".env.example does not document VITE_PUBLIC_SITE_URL"; fi
if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.example; then pass ".env.example documents server service role variable"; else warn ".env.example does not document SUPABASE_SERVICE_ROLE_KEY"; fi
if grep -q "BREVO_API_KEY" .env.example; then pass ".env.example documents Brevo API secret"; else warn ".env.example does not document BREVO_API_KEY"; fi
if grep -q "EMAIL_WORKER_SECRET" .env.example; then pass ".env.example documents email worker secret"; else warn ".env.example does not document EMAIL_WORKER_SECRET"; fi
if grep -q "PUSH_SEND_SECRET" .env.example; then pass ".env.example documents push worker secret"; else warn ".env.example does not document PUSH_SEND_SECRET"; fi
if grep -q "PUSH_MAX_SENDS_PER_MINUTE" .env.example; then pass ".env.example documents push rate limit"; else warn ".env.example does not document PUSH_MAX_SENDS_PER_MINUTE"; fi

log_section "Client secret exposure scan"
if grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.output --exclude='*.zip' "SUPABASE_SERVICE_ROLE_KEY" src | grep -v "src/lib/supabase/admin.ts"; then
  fail "SUPABASE_SERVICE_ROLE_KEY appears in client/app source outside server admin helper"
else
  pass "No obvious service-role variable usage outside server admin helper"
fi

if grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.output --exclude='*.zip' "service_role" src | grep -v "src/lib/supabase/admin.ts"; then
  warn "String 'service_role' appears outside server admin helper; review manually"
else
  pass "No obvious service_role references outside server admin helper"
fi

if grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.output --exclude='*.zip' -E 'VITE_[A-Z0-9_]*(PRIVATE|SECRET|SERVICE_ROLE|PASSWORD|TOKEN|JWT|KEY)=' . | grep -v 'VITE_SUPABASE_ANON_KEY' | grep -v 'VITE_VAPID_PUBLIC_KEY'; then
  fail "Private-looking VITE_ environment variable detected"
else
  pass "No private-looking VITE_ env assignments detected"
fi

if [[ -f scripts/scan-secrets.sh ]]; then
  pass "Secret scanner script available"
else
  fail "Missing scripts/scan-secrets.sh"
fi

log_section "Core unit test inventory"
test_file_count=$(find src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) | wc -l | tr -d ' ')
if [[ "$test_file_count" -ge 10 ]]; then
  pass "Core test suite present: $test_file_count test files"
else
  warn "Only $test_file_count test files found; expand core coverage before major refactors"
fi

critical_test_files=(
  "src/lib/auth-validation.test.ts"
  "src/lib/register.validation.test.ts"
  "src/lib/shared/formatters.test.ts"
  "src/lib/area-permissions.test.ts"
  "src/lib/admin/member-action-validation.test.ts"
  "src/lib/profile-update.test.ts"
  "src/lib/notification-email.test.ts"
  "src/lib/web-push.test.ts"
)

for test_file in "${critical_test_files[@]}"; do
  require_file "$test_file"
done

log_section "Branded email templates"
if npm run email:templates:check; then
  pass "Email template verification passed"
else
  fail "Email template verification failed"
  exit 1
fi

log_section "Web push reliability checks"
if npm run push:check; then
  pass "Web push reliability verification passed"
else
  fail "Web push reliability verification failed"
  exit 1
fi

log_section "TypeScript, unit tests and production build"
if npm run check; then
  pass "npm run check passed"
else
  fail "npm run check failed"
  exit 1
fi

if npm test; then
  pass "npm test passed"
else
  fail "npm test failed"
  exit 1
fi

if npm run build; then
  pass "npm run build passed"
else
  fail "npm run build failed"
  exit 1
fi

log_section "Safe export command"
if npm run | grep -q "safe-export"; then
  pass "npm run safe-export is available"
else
  warn "npm run safe-export script not found. Run scripts/apply-qa-npm-scripts.mjs or add it manually."
fi

log_section "Supabase CLI availability"
if command -v npx >/dev/null 2>&1 && npx supabase --version >/dev/null 2>&1; then
  pass "Supabase CLI available: $(npx supabase --version)"
  echo "Tip: run 'npx supabase migration list' to compare local/cloud migration status."
else
  warn "Supabase CLI not available or not installed in this environment"
fi

log_section "QA summary"
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "${RED}Failures:${NC} $FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo -e "${RED}Project readiness check failed. Fix failures before deployment.${NC}"
  exit 1
fi

if [[ "$WARN_COUNT" -gt 0 ]]; then
  echo -e "${YELLOW}Project readiness check completed with warnings. Review them before deployment.${NC}"
else
  echo -e "${GREEN}Project readiness check completed cleanly.${NC}"
fi
