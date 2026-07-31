#!/usr/bin/env bash
# Printed every time a terminal attaches to the container.
set -uo pipefail

BOLD=$'\033[1m'; CYAN=$'\033[36m'; DIM=$'\033[2m'; RESET=$'\033[0m'

cat <<BANNER

${CYAN}${BOLD}  AppMod Lab · GlobalTravel Corp — AngularJS 1.6 ➜ React 19${RESET}
${DIM}  Modernisation framework: spec2cloud (brownfield, vNext)${RESET}

  ${BOLD}Run the legacy app${RESET}
    npm start                 ${DIM}# mock API (:3000) + web app (:8080), one command${RESET}
    npm run api               ${DIM}# mock API only${RESET}
    npm run serve             ${DIM}# web app only${RESET}
    npm test                  ${DIM}# legacy Karma suite (expected: 11 failing — that is the exercise)${RESET}

  ${BOLD}Start the modernisation${RESET}
    npx spec2cloud init --flow brownfield --ref vNext
    copilot                   ${DIM}# the orchestrator in AGENTS.md activates automatically${RESET}

  ${DIM}Full instructions: README.md${RESET}

BANNER
