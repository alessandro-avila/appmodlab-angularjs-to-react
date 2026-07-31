#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# post-create.sh — runs once, right after the dev container is built.
#
# Goal: when this script finishes, everything a hackathon participant needs is
# installed and *verified*. If something is broken we fail loudly here, not at
# 09:05 on hackathon morning.
# ---------------------------------------------------------------------------
set -euo pipefail

BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
step() { echo -e "\n${BOLD}==> $*${RESET}"; }
ok()   { echo -e "  ${GREEN}[ok]${RESET}   $*"; }
warn() { echo -e "  ${YELLOW}[warn]${RESET} $*"; }
fail() { echo -e "  ${RED}[FAIL]${RESET} $*"; FAILED=1; }
FAILED=0

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
step "Installing OS packages (chromium for the Karma test runner)"
# The legacy Karma suite launches ChromeHeadless via $CHROME_BIN.
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq --no-install-recommends \
  chromium \
  fonts-liberation \
  jq \
  >/dev/null
ok "chromium + helpers installed"

# ---------------------------------------------------------------------------
step "Installing Node dependencies"
# node_modules is a named Docker volume (see "mounts" in devcontainer.json) so
# installs never touch a slow host bind mount. The volume is created root-owned.
sudo chown -R "$(id -u):$(id -g)" node_modules 2>/dev/null || true

# Conference wifi is not a reliable network — retry, but stay bounded so a
# genuinely broken network fails fast enough to be actionable.
npm config set fetch-retries 3 --location=user
npm config set fetch-retry-maxtimeout 30000 --location=user
npm config set fetch-timeout 120000 --location=user

if npm ci --no-audit --no-fund --loglevel=error; then
  ok "npm ci"
elif npm install --no-audit --no-fund --loglevel=error; then
  warn "npm ci failed; 'npm install' succeeded instead"
else
  fail "could not install node dependencies — check network access to https://registry.npmjs.org"
fi

if [ -d node_modules/grunt ] && [ -d node_modules/karma ] && [ -d node_modules/express ]; then
  ok "node_modules ready ($(ls node_modules | wc -l) packages)"
else
  fail "node_modules is incomplete (grunt/karma/express missing)"
fi

# ---------------------------------------------------------------------------
step "Installing Playwright + Chromium (for the React target's e2e tests)"
# Installed up front so teams are not blocked mid-hackathon when the
# spec2cloud test-scaffolding skill generates Playwright specs.
npx --yes playwright@latest install --with-deps chromium >/dev/null 2>&1 \
  && ok "playwright chromium installed" \
  || warn "playwright install failed — run 'npx playwright install --with-deps chromium' manually"

# ---------------------------------------------------------------------------
step "Priming the spec2cloud CLI cache"
# We do NOT install spec2cloud into this branch: main stays a clean AngularJS
# baseline. Pre-fetching the package means `npx spec2cloud init` is instant
# (and works even on a flaky conference network).
npm cache add spec2cloud@latest >/dev/null 2>&1 \
  && ok "spec2cloud package cached (run 'npx spec2cloud init --flow brownfield --ref vNext' to install)" \
  || warn "could not pre-cache spec2cloud — it will be downloaded on first use"

# ---------------------------------------------------------------------------
step "Verifying the toolchain"
check() { # check <label> <command...>
  local label="$1"; shift
  if v=$("$@" 2>&1 | head -n1); then ok "$label -> $v"; else fail "$label -> not available ($*)"; fi
}
check "node"        node --version
check "npm"         npm --version
check "git"         git --version
check "gh"          gh --version
check "chromium"    chromium --version
check "python3"     python3 --version
check "docker"      docker --version

if command -v copilot >/dev/null 2>&1; then
  ok "copilot CLI -> $(copilot --version 2>&1 | head -n1)"
else
  warn "copilot CLI not on PATH — install with 'npm i -g @github/copilot' and run 'copilot' to sign in"
fi

# ---------------------------------------------------------------------------
step "Smoke-testing the legacy AngularJS app"

# 1. Vendored libraries the app cannot boot without.
for f in \
  bower_components/angular/angular.min.js \
  bower_components/angular-ui-router/release/angular-ui-router.min.js \
  bower_components/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js \
  bower_components/restangular/dist/restangular.min.js \
  bower_components/jquery/dist/jquery.min.js \
  bower_components/jquery-ui/jquery-ui.min.js \
  bower_components/moment/min/moment.min.js \
  bower_components/lodash/dist/lodash.min.js
do
  [ -s "$f" ] && ok "vendor $f" || fail "vendor $f is missing or empty"
done

# 2. The Grunt build must succeed (npm run build cleans dist/ first, which keeps
#    it deterministic when a host-owned dist/ exists on a bind-mounted workspace).
if npm run build >/tmp/grunt-build.log 2>&1; then
  ok "grunt build"
else
  fail "grunt build — see /tmp/grunt-build.log"; tail -n 20 /tmp/grunt-build.log
fi

# 3. The mock API must boot and answer.
node api-mock/server.js >/tmp/api-mock.log 2>&1 &
API_PID=$!
for _ in $(seq 1 25); do
  curl -sf http://localhost:3000/api/airports >/dev/null 2>&1 && break
  sleep 0.4
done
if curl -sf http://localhost:3000/api/airports >/dev/null 2>&1; then
  ok "mock API responds on :3000"
else
  fail "mock API did not answer on :3000 — see /tmp/api-mock.log"
fi
kill "$API_PID" 2>/dev/null || true
wait "$API_PID" 2>/dev/null || true

# ---------------------------------------------------------------------------
echo
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Dev container is ready.${RESET}"
else
  echo -e "${RED}${BOLD}Dev container finished with errors — see [FAIL] lines above.${RESET}"
  exit 1
fi
