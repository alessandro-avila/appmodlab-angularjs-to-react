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

  @unauthenticated
  Scenario: Signing in announces itself to the modules that care
    Given I have never signed in to the portal
    When I enter the portal
    And I visit the expenses area
    Then something is listening for a sign-in announcement

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

  Scenario: Nothing is listening for a sign-out announcement
    Given I am signed in to the travel portal
    When I visit "expenses"
    Then nothing is listening for a sign-out announcement

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
  Scenario: After a reload my work is attributed to a placeholder
    Given I have never signed in to the portal
    When I enter the portal
    And I visit "expenses"
    And I am known to the portal as "Sarah Johnson"
    And I reload the page
    Then the portal does not remember who is signed in
    And a new expense report would be filed by "Demo User"

  # ---------------------------------------------------------------------------
  # The guard checks for a token, never for a valid one
  # ---------------------------------------------------------------------------

  @unauthenticated
  Scenario: A token the server rejects still opens the portal
    Given my browser holds a session token the server will reject
    When I go straight to "expenses"
    Then I am let in to "expenses"

  @unauthenticated
  Scenario: A rejected session looks like an empty expense account
    Given my browser holds a session token the server will reject
    When I go straight to "expenses"
    Then the server refused the request with 401
    And I am invited to create my first expense report
    And nothing on the page tells me my session is the problem

  @unauthenticated
  Scenario: A rejected session looks like an empty itinerary
    Given my browser holds a session token the server will reject
    When I go straight to "itinerary"
    Then I am told "No trips yet"
    And I am encouraged to book a flight or hotel to get started
    And nothing on the page tells me my session is the problem

  @unauthenticated
  Scenario: A rejected session raises a failure notice that names the data, not the session
    Given my browser holds a session token the server will reject
    When I go straight to "itinerary"
    Then I see a notification containing "Failed to load itinerary"

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
