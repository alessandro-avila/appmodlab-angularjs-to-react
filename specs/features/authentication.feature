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

  @unauthenticated
  Scenario: The login screen asks for no credentials
    Given I have never signed in to the portal
    When I open the portal
    Then the login screen has no fields to type into
    And the login screen reads "Mock login - click to enter"

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

  @unauthenticated
  Scenario: Entering the portal signs me in as the built-in employee
    Given I have never signed in to the portal
    When I enter the portal
    Then I arrive at the dashboard
    And I am signed in as "Sarah Johnson" from "Engineering"

  @unauthenticated
  Scenario: The portal signs in with credentials nobody typed
    Given I have never signed in to the portal
    When I enter the portal
    Then the portal sent the built-in credentials to the server

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

  Scenario Outline: No screen offers a way to sign out
    Given I am signed in to the travel portal
    When I visit "<area>"
    Then nothing on the page offers to sign me out

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
  Scenario: Nothing anywhere announces a sign-out
    Given I am signed in to the travel portal
    When I visit "expenses"
    Then nothing on the page offers to sign me out
    And my session token is still stored

  Scenario: The dashboard carries no controls at all
    Given I am signed in to the travel portal
    When I visit "dashboard"
    Then the dashboard has no buttons on it

  # ---------------------------------------------------------------------------
  # Identity does not survive a reload  (constraint C-1)
  # ---------------------------------------------------------------------------

  # Identity is only ever set by the act of signing in, so these scenarios sign
  # in for real rather than starting from the shared stored session.

  @unauthenticated
  Scenario: Reloading the page keeps my token but forgets who I am
    Given I have never signed in to the portal
    When I enter the portal
    And I am known to the portal as "Sarah Johnson"
    And I reload the page
    Then the portal does not remember who is signed in
    But my session token is still stored

  @unauthenticated
  Scenario: The portal never asks the server who the token belongs to
    Given I have never signed in to the portal
    When I enter the portal
    And I reload the page
    Then the portal made no request to identify me
    And the portal does not remember who is signed in

  Scenario: A reload leaves me where I was rather than at the login screen
    Given I am signed in to the travel portal
    When I visit "itinerary"
    And I reload the page
    Then I am still on "itinerary"

  @unauthenticated
  # ---------------------------------------------------------------------------
  # PRESERVED — and deliberately NOT superseded, against increment plan §9.3.
  #
  # Plan §9.3 row `:179` expected this to supersede, on the grounds that
  # "Inc-0's identity rehydration means the report is filed by the real user".
  # Two things are wrong with that:
  #
  #   1. Increment 0 did not implement rehydration. `src/stores/auth-store.ts`
  #      mirrors the legacy field exactly — `user: null` at construction, set
  #      only by a live sign-in, never read back from the token.
  #   2. Nothing authorises rehydrating it. ADR-003 logs C-1 as a "defect
  #      CANDIDATE"; ADR-005's supersede list names the four dead controls,
  #      ngRepeat:dupes, SEAM-3/4/5 and the alerts — not C-1.
  #
  # ADR-022's rule decides it: authorisation, not mechanism. A defect candidate
  # is not a decision to fix, which is the same reason `flight:selected` stays
  # dropped. So the placeholder attribution is PINNED, and stays pinned until
  # something authorises otherwise.
  #
  # STEP ORDER CHANGED (not the assertions). "I am known to the portal" now
  # runs BEFORE the move to expenses. Signing in happens on the AngularJS login
  # screen, and under ADR-012 `/expenses` is a real path, so that move is a
  # DOCUMENT BOUNDARY — in-memory identity is already gone on arrival. The
  # baseline's `#!/expenses` was a same-document fragment, which is why the
  # original order worked. Every assertion is unchanged and still passes; only
  # the precondition moved to the side of the crossing where it can hold.
  # ---------------------------------------------------------------------------
  Scenario: After a reload my work is attributed to a placeholder
    Given I have never signed in to the portal
    When I enter the portal
    And I am known to the portal as "Sarah Johnson"
    And I visit "expenses"
    And I reload the page
    Then the portal does not remember who is signed in
    And a new expense report would be filed by "Demo User"

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
