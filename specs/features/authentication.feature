# Green baseline for authentication — captured from the running 2016 app.
#
# Everything below was observed, not inferred. Six findings are recorded here as
# accepted current behaviour; every one of them is a decision the React rewrite
# has to make deliberately rather than inherit:
#
#  1. There is no credential form. The login screen is one "Enter Portal" button
#     that posts a pair of constants (ADR-002 Q-8). No user can sign in as
#     anyone else through the UI.
#  2. There is no way to sign out. AuthService.logout exists, nothing calls it,
#     no screen offers the control, and no listener is ever registered for the
#     auth:logout it would broadcast. The event is dead in both directions.
#  3. The route guard tests for the *presence* of a token, never its validity.
#     A token the server rejects opens every screen in the portal.
#  4. A rejected session is presented to the user as an empty account. The
#     itinerary says "No trips yet - Book a flight or hotel to get started!" and
#     expenses invites you to "CREATE YOUR FIRST REPORT". Nothing anywhere says
#     the session is the problem. There is no 401 interceptor.
#  5. Identity does not survive a page reload (constraint C-1). The token stays,
#     the user vanishes, and the portal never asks the server who the bearer is
#     even though GET /api/auth/me answers exactly that question.
#  6. Signing in again while already signed in is allowed and silently replaces
#     the token.
#
# ─────────────────────────────────────────────────────────────────────────────
# WHERE THE SIX FINDINGS ENDED UP  (added at Increment 6 — the cutover)
# ─────────────────────────────────────────────────────────────────────────────
# This file is the migration's longest-running record, so the resolution of each
# finding is written here rather than left to be reconstructed from six ADRs.
#
#  1. RESOLVED in Inc-6. Q-8's credential form ships; a second employee (Mike
#     Chen) is reachable through the UI for the first time. The "Enter Portal"
#     button label is kept, so :36 and :410 preserve.
#  2. RESOLVED in Inc-6. Sign-out ships in the navbar, visible only when signed
#     in — which is why :50 (a stranger sees no sign-out) still preserves while
#     all six rows of the sign-out outline supersede.
#  3. RESOLVED in Inc-6. Boot-time GET /api/auth/me makes the guard test
#     validity, not presence: a token the server rejects now clears the session
#     and bounces to login instead of opening every screen.
#  4. RESOLVED in Inc-3 and Inc-5 (ADR-018), before the surface existed, because
#     those scenarios assert on the itinerary and expenses screens rather than
#     on `/`.
#  5. RESOLVED in Inc-6 (ADR-003 C-1, authorised by ADR-010). Plan §10.2 assumed
#     Inc-0 had built it; Inc-0 had not, which was found and reported at the
#     Inc-5 gate.
#  6. PRESERVED, deliberately. Signing in again still replaces the token, and
#     /login stays reachable while signed in. Nothing authorises changing it.
#
# The one accepted risk that survives the migration unresolved is the JWT in
# localStorage (ADR-016) — an accepted risk with a follow-up owner, not a
# resolved one. `:95` stays green on purpose.

@feature-authentication @existing-behavior
Feature: Getting into the travel portal
  As a GlobalTravel Corp employee
  I want the portal to let me in and keep the protected areas closed
  So that my trips, requests and expenses are reachable only through a session

  # ---------------------------------------------------------------------------
  # Arriving without a session
  # ---------------------------------------------------------------------------

  @unauthenticated
  Scenario: The portal opens on the login screen
    Given I have never signed in to the portal
    When I open the portal
    Then I land on the login screen
    And the login screen offers a single way in

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-002 Q-8, per increment plan §10.4.
  #
  # The legacy login screen had no inputs — one button that posted hardcoded
  # credentials (app.routes.js:20). Q-8 authorises the real credential form:
  # the API has always checked credentials and a second employee has always
  # existed server-side, unreachable through the UI.
  #
  # The BUTTON LABEL is deliberately unchanged. "Enter Portal" is a perfectly
  # good submit label, and keeping it lets :36 and :329 — which assert the
  # login screen "offers a single way in" — stay PRESERVED rather than
  # superseding for a cosmetic reason.
  #
  # Replaced by "Signing in with my own credentials" and its siblings below.
  # ---------------------------------------------------------------------------
  Scenario: The login screen asks for my credentials
    Given I have never signed in to the portal
    When I open the portal
    Then the login screen asks for an email address and a password
    And the login screen offers a single way in

  @unauthenticated
  Scenario: The navigation bar advertises the protected areas to a stranger
    Given I have never signed in to the portal
    When I open the portal
    Then the navigation bar still lists every protected area
    And the navigation bar offers no way to sign out

  @unauthenticated
  Scenario Outline: A direct hit on a protected area is turned away
    Given I have never signed in to the portal
    When I go straight to "<area>"
    Then I am returned to the login screen

    Examples:
      | area           |
      | dashboard      |
      | flights        |
      | hotels         |
      | itinerary      |
      | travel-request |
      | expenses       |

  @unauthenticated
  Scenario: An unknown address falls back to the login screen
    Given I have never signed in to the portal
    When I go straight to "somewhere-that-does-not-exist"
    Then I am returned to the login screen

  # ---------------------------------------------------------------------------
  # Signing in
  # ---------------------------------------------------------------------------

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-002 Q-8, per increment plan §10.4.
  #
  # "The built-in employee" was the whole point: you did not choose who you
  # signed in as, the app chose for you. With a credential form that premise is
  # gone — you sign in as whoever you authenticate as. The OUTCOME (arrive at
  # the dashboard, signed in as Sarah Johnson from Engineering) is preserved
  # below, but it is now a consequence of the credentials typed, not of a
  # hardcoded string.
  # ---------------------------------------------------------------------------
  Scenario: Signing in with my own credentials
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "password"
    Then I arrive at the dashboard
    And I am signed in as "Sarah Johnson" from "Engineering"

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-002 Q-8, per increment plan §10.4.
  #
  # The finding this recorded — that the portal posted credentials the user had
  # never typed — is exactly what Q-8 authorises removing. The replacement
  # asserts the opposite: the portal sends the credentials it was GIVEN, and
  # nothing else.
  # ---------------------------------------------------------------------------
  Scenario: The portal sends the credentials I typed and no others
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "password"
    Then the portal sent the credentials I typed to the server

  @unauthenticated
  Scenario: Entering the portal stores a session token
    Given I have never signed in to the portal
    When I enter the portal
    Then a session token is stored in the browser
    And the session token carries my identity and role
    And the session token lasts 24 hours

  @unauthenticated
  Scenario: The dashboard is the way into every module
    Given I have never signed in to the portal
    When I enter the portal
    Then the dashboard offers these ways on:
      | Search Flights        |
      | Book Hotels           |
      | Manage Itinerary      |
      | Submit Travel Request |
      | Expense Reconciliation|

  @unauthenticated @inc-5
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 (finding P-5), per increment plan §9.
  #
  # This asserted that a `$rootScope` listener for 'auth:login' is registered —
  # checked ON THE EXPENSES PAGE. Expenses is React now, so there is no
  # `$rootScope` to inspect and nothing to count listeners on. ADR-013 absorbed
  # the announcement into the store.
  #
  # The OUTCOME it protected is kept: arriving at expenses signed in shows the
  # traveller's reports.
  # ---------------------------------------------------------------------------
  Scenario: Signing in gets me into the expenses area
    Given I have never signed in to the portal
    When I enter the portal
    And I visit the expenses area
    Then I am let in to "expenses"

  # ---------------------------------------------------------------------------
  # There is no way out
  # ---------------------------------------------------------------------------

  @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-002 Q-8 / ADR-010, per increment plan §10.4 — ALL SIX ROWS
  # TOGETHER.
  #
  # This outline is the clearest illustration in the migration of RE-POINT vs
  # SUPERSEDE. Its six rows changed owner across five increments — flights in
  # Inc-1, hotels in Inc-2, and so on — and every one of them kept PASSING,
  # because the React chrome deliberately carried no sign-out control either
  # (plan §4.2). Superseding them per-increment would have been wrong; ignoring
  # the per-increment re-point would have left five gates unable to account for
  # them.
  #
  # They supersede HERE, together, in the increment where sign-out ships.
  # Replaced by "Every screen offers a way to sign out" below, same six areas.
  # ---------------------------------------------------------------------------
  Scenario Outline: Every screen offers a way to sign out
    Given I am signed in to the travel portal
    When I visit "<area>"
    Then the page offers to sign me out

    Examples:
      | area           |
      | dashboard      |
      | flights        |
      | hotels         |
      | itinerary      |
      | travel-request |
      | expenses       |

  @inc-5
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 (finding P-5), per increment plan §9.3.
  #
  # This counted `$rootScope` listeners for 'auth:logout' — checked ON THE
  # EXPENSES PAGE. Expenses is React now, so there is no `$rootScope` and no
  # `$$listeners` to count. The mechanism the assertion reached for is gone.
  #
  # The FINDING it recorded is not gone, and is not weakened: auth:logout was
  # dead in both directions, and `AuthService.logout` still has no caller and
  # no control anywhere in the portal. That is what the replacement asserts,
  # through the UI rather than through the digest — which is also the stronger
  # statement, since it holds for both stacks at once.
  #
  # `:135`'s outline already pins "no screen offers a way to sign out" for all
  # six areas; this keeps the emitter half of the pair explicit.
  # ---------------------------------------------------------------------------
  @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-002 Q-8 / ADR-010, per increment plan §10.4.
  #
  # This scenario is itself an Inc-5 replacement — it took over from the
  # $rootScope.$$listeners check when expenses became React (ADR-005 P-5). It
  # recorded that auth:logout was dead in both directions and that
  # AuthService.logout had no caller and no control.
  #
  # Sign-out ships in this increment, so the finding is retired: logout now has
  # a caller, a control, and a server call. The replacement asserts the whole
  # round trip rather than just the control's presence.
  # ---------------------------------------------------------------------------
  Scenario: Signing out ends the session and returns me to the login screen
    Given I am signed in to the travel portal
    When I visit "expenses"
    And I sign out
    Then I land on the login screen
    And my session token is no longer stored

  Scenario: The dashboard carries no controls at all
    Given I am signed in to the travel portal
    When I visit "dashboard"
    Then the dashboard has no buttons on it

  # ---------------------------------------------------------------------------
  # Identity survives a reload  (constraint C-1 — REPAIRED in Inc-6)
  # ---------------------------------------------------------------------------

  # These scenarios sign in for real rather than starting from the shared stored
  # session, because identity is set by the act of signing in.

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-003 constraint C-1, authorised by ADR-010, per increment
  # plan §10.4 row `:156`.
  #
  # The legacy portal set $rootScope.currentUser on sign-in and never persisted
  # it (app/app.js:40 nulls it on every boot), so a reload left an
  # authenticated-but-anonymous session: the token survived, the identity did
  # not, and every module degraded to hardcoded values.
  #
  # ADR-010 assigns the repair to this increment. Note that plan §10.2 assumed
  # it had been built in Inc-0; it had not — Inc-0's store mirrors the legacy
  # field exactly. That gap was reported at the Inc-5 gate, which is why
  # `:235` below preserved there instead of superseding. It lands here.
  # ---------------------------------------------------------------------------
  Scenario: Reloading the page keeps both my token and my identity
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "password"
    And I reload the page
    Then the portal still knows me as "Sarah Johnson"
    And my session token is still stored

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-003 constraint C-1, authorised by ADR-010, per increment
  # plan §10.4 row `:165`.
  #
  # "The client never asks the server who the bearer is" was the root of three
  # separate defects — C-1, the presence-only route guard, and the missing 401
  # policy. GET /api/auth/me has existed on the server throughout and was never
  # called. It is called now, on boot, whenever a token is present without an
  # identity.
  # ---------------------------------------------------------------------------
  Scenario: The portal asks the server who the token belongs to
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "password"
    And I reload the page
    Then the portal asked the server to identify me
    And the portal still knows me as "Sarah Johnson"

  Scenario: A reload leaves me where I was rather than at the login screen
    Given I am signed in to the travel portal
    When I visit "itinerary"
    And I reload the page
    Then I am still on "itinerary"

  @unauthenticated @inc-6
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-003 constraint C-1, authorised by ADR-010, per increment
  # plan §10.4.
  #
  # HISTORY, because this scenario moved between increments and the reason
  # matters more than the move.
  #
  # Plan §9.3 budgeted this to supersede in Inc-5, on the grounds that "Inc-0's
  # identity rehydration means the report is filed by the real user". At the
  # Inc-5 gate that turned out to be wrong twice over: Inc-0 never built
  # rehydration, and nothing then authorised building it — ADR-003 logs C-1 as
  # a defect CANDIDATE, and ADR-005's supersede list does not name it. By
  # ADR-022's rule (authorisation, not mechanism) a defect candidate is not a
  # decision to fix, so it was PRESERVED in Inc-5 and reported.
  #
  # ADR-010 supplies the authorisation, and assigns it to THIS increment: the
  # C-1 repair lands with the authentication surface. So it supersedes now.
  #
  # This is also why ExpenseReconciliation.tsx ports controller:194 as the
  # CONDITIONAL it is rather than as its usual answer. Had it hardcoded the
  # placeholder, the repair would have been invisible here and this scenario
  # would have gone on passing while describing something untrue.
  # ---------------------------------------------------------------------------
  Scenario: After a reload my work is still attributed to me
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "password"
    And I visit "expenses"
    And I reload the page
    Then the portal still knows me as "Sarah Johnson"
    And a new expense report would be filed by "Sarah Johnson"

  # ---------------------------------------------------------------------------
  # The guard checks for a token, never for a valid one
  # ---------------------------------------------------------------------------

  @unauthenticated @inc-5
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-018 — the session-expiry policy, exactly as that ADR
  # predicted:
  #
  #   ":199 — A rejected session looks like an empty expense account — is
  #    UNTOUCHED, because expenses is still AngularJS. It supersedes when that
  #    module migrates in Increment 5, and until then the suite deliberately
  #    holds both behaviours at once."
  #
  # This is that increment. The two scenarios below are the expense
  # counterparts of the itinerary pair superseded in Inc-3.
  #
  # The presence-only guard is UNCHANGED and still defective: a planted junk
  # token opens every screen. What changed is what happens when the SERVER
  # rejects the token. Q-8 / ADR-010 fix the guard itself at the cutover.
  # ---------------------------------------------------------------------------
  Scenario: A token the server rejects sends me back to the login screen
    Given my browser holds a session token the server will reject
    When I go straight to "expenses"
    Then I am returned to the login screen
    And I am told my session has expired

  @unauthenticated @inc-5
  # SUPERSEDED by ADR-018 — the notice named the data; it now names the session,
  # and the traveller is never shown an empty account that misdescribes it.
  Scenario: A rejected session says so rather than looking like an empty account
    Given my browser holds a session token the server will reject
    When I go straight to "expenses"
    Then the server refused the request with 401
    And I see a notification containing "session has expired"
    And I am not invited to create my first expense report

  @unauthenticated @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-018 — the session-expiry policy, left open by Increment 0
  # (plan §13 item 12) and forced here because the itinerary is the first React
  # route that fetches on mount.
  #
  # The legacy caught every failure identically, so a rejected session produced
  # an empty-state screen telling the traveller they had no trips — a false
  # statement about their data. A 401 is now treated as a session event.
  #
  # :199 above, the expense equivalent, is deliberately NOT touched: expenses is
  # still AngularJS. The suite holds both behaviours at once until Increment 5.
  # ---------------------------------------------------------------------------
  Scenario: A rejected session says so and returns me to the login screen
    Given my browser holds a session token the server will reject
    When I go straight to "itinerary"
    Then I am returned to the login screen
    And I am told my session has expired
    And I am not told that I have no trips

  @unauthenticated @inc-3
  # SUPERSEDED by ADR-018 — the notice named the data; it now names the session.
  Scenario: A rejected session raises a notice that names the session
    Given my browser holds a session token the server will reject
    When I go straight to "itinerary"
    Then I see a notification containing "session has expired"

  # PRESERVED. Plan §7.4 expected this to supersede alongside the two above; it
  # does not. ADR-018 explains: `isAuthenticated()` reads localStorage live, but
  # the guard re-renders only on a STORE mutation. Taking the token away from
  # outside the app is not one, so nothing re-evaluates and the page stays.
  Scenario: Losing my session mid-visit leaves the page on screen
    Given I am signed in to the travel portal
    And I am on the itinerary page
    When my session token is taken away
    Then I am still on "itinerary"

  Scenario: The next move after losing my session sends me to the login screen
    Given I am signed in to the travel portal
    And I am on the itinerary page
    When my session token is taken away
    And I visit "expenses"
    Then I am returned to the login screen

  # ---------------------------------------------------------------------------
  # Signing in again
  # ---------------------------------------------------------------------------

  Scenario: A signed-in user can walk back to the login screen
    Given I am signed in to the travel portal
    When I visit "login"
    Then I land on the login screen
    And the login screen offers a single way in

  Scenario: Entering the portal a second time replaces my session token
    Given I am signed in to the travel portal
    When I visit "login"
    And I enter the portal again
    Then I arrive at the dashboard
    And my session token has been replaced

  # ---------------------------------------------------------------------------
  # NET-NEW — the authentication surface (Increment 6)
  #
  # None of the behaviour below existed in the AngularJS product. It is not a
  # port and has no baseline scenario to supersede.
  #
  # These scenarios inherit the Feature-level @existing-behavior tag, as every
  # net-new scenario added in Increments 1-5 does, so they run in the same suite
  # and are held to the same standard. @inc-6 is what distinguishes them: the
  # file's record of what the 2016 app DID is the untagged body plus the
  # superseded blocks above, and anything carrying an @inc-N tag is the
  # migration's own contract rather than a captured observation.
  #
  # Authorised by ADR-002 Q-8 (credential form, second employee), ADR-010
  # (sign-out, the authentication surface), ADR-003 C-1 (identity restoration)
  # and ADR-012 (legacy hash addresses break, and where they land instead).
  # ---------------------------------------------------------------------------

  @inc-6 @unauthenticated
  Scenario: A second employee can sign in as himself
    Given I have never signed in to the portal
    When I sign in as "manager@globaltravel.com" with password "password"
    Then I arrive at the dashboard
    And I am signed in as "Mike Chen" from "Engineering"

  @inc-6 @unauthenticated
  Scenario: The second employee is a manager, not an employee
    Given I have never signed in to the portal
    When I sign in as "manager@globaltravel.com" with password "password"
    Then the session token records my role as "manager"

  @inc-6 @unauthenticated
  Scenario: A wrong password is refused and nothing is stored
    Given I have never signed in to the portal
    When I sign in as "demo@globaltravel.com" with password "not-my-password"
    Then I am told the credentials were rejected
    And no session token is stored
    And I am still on the login screen

  @inc-6 @unauthenticated
  Scenario: An unknown email is refused the same way as a wrong password
    Given I have never signed in to the portal
    When I sign in as "nobody@globaltravel.com" with password "password"
    Then I am told the credentials were rejected
    And the refusal does not say whether the account exists

  @inc-6
  Scenario: Signing out clears my identity as well as my token
    Given I am signed in to the travel portal
    When I visit "dashboard"
    And I sign out
    Then my session token is no longer stored
    And the portal no longer knows who I am
    And the navigation bar offers no way to sign out

  @inc-6
  Scenario: After signing out a protected area turns me away again
    Given I am signed in to the travel portal
    When I visit "dashboard"
    And I sign out
    And I go straight to "expenses"
    Then I am returned to the login screen

  @inc-6
  # ADR-012: the fragment is never sent to the server, so GET / is transmitted,
  # React renders the portal root, and the fragment is ignored. No redirect
  # shim, no error, no 404, no blank page.
  #
  # Note the assertion is CONTENT, not URL. The ADR is explicit that "the
  # fragment remains in the address bar and is ignored", so the address stays
  # `/#!/flights` while the dashboard is what renders. A URL assertion here
  # would be asserting the opposite of the decision.
  Scenario: A legacy hash address lands on the portal root rather than failing
    Given I am signed in to the travel portal
    When I go to the legacy address "#!/flights"
    Then I am shown the dashboard
    And the address bar still shows "#!/flights"
    And the page did not fail

  @inc-6 @unauthenticated
  Scenario: A legacy hash address shows a stranger the login screen
    Given I have never signed in to the portal
    When I go to the legacy address "#!/flights"
    Then I land on the login screen

  # ---------------------------------------------------------------------------
  # The server's side of the bargain
  # ---------------------------------------------------------------------------

  Scenario: The server issues a token for the built-in employee
    When the built-in credentials are presented to the server
    Then the server responds with 200
    And the response carries a token and the employee's profile

  Scenario Outline: The server refuses anything but the built-in credentials
    When "<description>" is presented to the server
    Then the server refuses with 401 and the message "Invalid credentials"

    Examples:
      | description       |
      | the wrong password|
      | an unknown email  |
      | nothing at all    |

  Scenario: A refusal does not reveal whether the account exists
    When "the wrong password" is presented to the server
    And "an unknown email" is presented to the server
    Then both refusals read exactly the same

  Scenario: The server can identify the holder of a token
    Given I am signed in to the travel portal
    When the stored token is presented to the identity endpoint
    Then the server responds with 200
    And the server names me as "Sarah Johnson"

  Scenario Outline: The identity endpoint refuses anything else
    When "<credential>" is presented to the identity endpoint
    Then the identity endpoint refuses with 401 and the message "<message>"

    Examples:
      | credential      | message      |
      | a garbage token | Invalid token|
      | an empty token  | Unauthorized |
      | no header at all| Unauthorized |

  Scenario: Signing out on the server succeeds even without a session
    When a sign-out is sent to the server without a token
    Then the server responds with 200
    And the server reports "Logged out successfully"

  Scenario Outline: Every protected endpoint refuses a token the server cannot read
    When "<endpoint>" is requested with a garbage token
    Then the server refuses with 401
    And "<endpoint>" refuses a request with no token at all

    Examples:
      | endpoint             |
      | /api/trips           |
      | /api/travel-requests |
      | /api/expense-reports |

  Scenario: Flight search is protected like everything else
    When "/api/flights/search?from=SFO&to=JFK&date=2024-05-01" is requested with a garbage token
    Then the server refuses with 401

  Scenario: Airport reference data needs no session
    When "/api/airports" is requested with no token at all
    Then the server responds with 200

  Scenario: A second employee exists but is served the same data as the first
    When the manager's credentials are presented to the server
    Then the server responds with 200
    And the server names the account "Mike Chen" with the role "manager"
    And the manager is served exactly the same trips as the employee
