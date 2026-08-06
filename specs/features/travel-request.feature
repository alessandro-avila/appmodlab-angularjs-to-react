@existing-behavior @feature-travel-request
Feature: Travel requests
  Employees raise a travel request before a trip, track its approval status,
  edit it while it is still pending, and cancel it.

  These scenarios describe what the AngularJS portal DOES TODAY. They are a
  regression net for the React migration, not a statement of what it should do.
  Everything below was confirmed by driving the running application.

  Three findings shape this file and must survive into the migration as
  DECISIONS, not as behaviour to copy:

  1. THE SEARCH BOX IS BROKEN. applyFilters() reads req.travelerName, a field
     the seeded requests do not carry. Typing anything into the search box
     throws a TypeError out of the digest, so filteredRequests is never
     reassigned and the table does not change. The user sees their text in the
     box and no effect whatsoever. (controller :122)

  2. THE ERROR ALERT CANNOT BE DISMISSED. The alert is wrapped in ng-if, which
     creates a child scope; its close button assigns errorMessage = '' onto
     that child, shadowing the controller's copy. ng-if still watches the
     parent, which is still truthy, so the alert stays on screen. This is the
     same ng-if scope-shadowing defect already recorded against the itinerary
     status filter — a defect class, not a one-off.

  3. THE STATUS FILTER, BY CONTRAST, WORKS. The filter row sits outside the
     ng-if, so its assignments land on the controller scope. Where the form
     lives inside an ng-if it is still safe, because its ng-models are dotted
     (newRequest.destination) and resolve up the prototype chain.

  Requests are held in a mutable module-level array in the mock API, so
  creating, editing or cancelling one survives for the life of the server
  process. Every scenario that writes is tagged @mutates-fixture; the fixture is
  restored before and after it.

  Background:
    Given I am signed in to the travel portal
    And I am on the travel requests page

  # ------------------------------------------------------------ the request list

  Scenario: My travel requests are listed newest first
    Then the requests listed are "London, UK, Tokyo, Japan"

  Scenario: Each request row summarises the trip
    Then the request for "London, UK" reads:
      | Purpose      | Client onboarding meetings |
      | Travel Dates | May 1, 2024 - May 5, 2024  |
      | Duration     | 4 days                     |
      | Estimate     | $2500.00                   |
      | Status       | pending                    |
      | Submitted    | Feb 15, 2024 11:30 AM      |

  Scenario: The summary cards count requests by status
    Then the request summary cards read:
      | Total Requests | 2 |
      | Pending        | 1 |
      | Approved       | 1 |
      | Rejected       | 0 |

  Scenario Outline: Only a pending request can be edited or cancelled
    Then the request for "<destination>" offers the actions "<actions>"

    Examples:
      | destination  | actions                   |
      | London, UK   | View Details, Edit, Cancel |
      | Tokyo, Japan | View Details               |

  # ------------------------------------------------------------- status filtering

  Scenario Outline: Filtering by status narrows the list
    When I filter the requests by "<status>"
    Then the requests listed are "<listed>"

    Examples:
      | status   | listed                   |
      | Pending  | London, UK               |
      | Approved | Tokyo, Japan             |
      | All      | London, UK, Tokyo, Japan |

  Scenario: Filtering to a status nothing holds empties the table
    When I filter the requests by "Rejected"
    Then no request table is shown
    And I am invited to create my first request

  Scenario: The chosen status filter is highlighted
    When I filter the requests by "Approved"
    Then the "Approved" request filter is highlighted
    And the "Pending" request filter is not highlighted

  Scenario: Filtering happens in the browser, without asking the server again
    When I filter the requests by "Pending"
    Then the requests were not fetched again

  # ------------------------------------------------------- searching (broken)

  Scenario: Searching throws an error and filters nothing
    When I search the requests for "London"
    Then the browser reports that travelerName could not be read
    And the requests listed are "London, UK, Tokyo, Japan"

  Scenario: The search box keeps the text I typed even though nothing happens
    When I search the requests for "Tokyo"
    Then the request search box still reads "Tokyo"

  Scenario: Searching for something no request matches still lists everything
    When I search the requests for "zzzznowhere"
    Then the requests listed are "London, UK, Tokyo, Japan"

  Scenario: A status filter set before a search survives the failed search
    When I filter the requests by "Pending"
    And I search the requests for "London"
    Then the requests listed are "London, UK"

  # ------------------------------------------------------------- request details

  Scenario: The detail dialogue shows the trip and its costs
    When I open the details of the request for "London, UK"
    Then the request detail dialogue is headed "Travel Request — London, UK"
    And the request detail dialogue shows:
      | Department       | Engineering                |
      | Purpose          | Client onboarding meetings |
      | Duration         | 4 days                     |
      | Status           | pending                    |
      | Total Estimate   | $2500.00                   |
      | Visa Required    | No                         |
      | Travel Insurance | Yes                        |

  Scenario: The detail dialogue breaks the estimate down by category
    When I open the details of the request for "London, UK"
    Then the request cost breakdown reads:
      | Flights   | $1,200.00 |
      | Hotels    | $800.00   |
      | Meals     | $300.00   |
      | Transport | $150.00   |
      | Other     | $50.00    |
      | Total     | $2500.00  |

  Scenario: The traveller line is blank because no request carries a traveller name
    When I open the details of the request for "London, UK"
    Then the request detail dialogue shows a blank traveller

  # SEAM-2 — the approval chain is stored and served but never shown.
  Scenario: The approval chain is never shown, though the server holds one
    When I open the details of the request for "London, UK"
    Then the request detail dialogue says nothing about approvals
    And the server holds an approval chain for that request
    And nothing on the travel requests page can approve or reject

  # -------------------------------------------------------------- the request form

  Scenario: The form is hidden until I ask for it
    Then the travel request form is not shown
    When I start a new travel request
    Then the travel request form is shown
    And the new request button now reads "Cancel"

  Scenario: Abandoning the form clears what I typed
    Given I have started a new travel request
    And I have entered "Oslo, Norway" as the request destination
    When I abandon the travel request form
    And I start a new travel request
    Then the request destination is empty

  Scenario Outline: The form refuses to submit until every required field is filled
    Given I have started a new travel request
    When I fill the travel request form as far as "<filled>" and submit it
    Then the travel request form complains "<complaint>"

    Examples:
      | filled           | complaint                                |
      | nothing          | Destination is required.                 |
      | destination      | Travel dates are required.               |
      | backwards dates  | Return date must be after departure date. |
      | dates            | Travel purpose is required.              |
      | purpose          | Department is required.                  |
      | department       | Please provide cost estimates.           |

  Scenario: The destination field is marked when it is the field at fault
    Given I have started a new travel request
    When I fill the travel request form as far as "nothing" and submit it
    Then the request destination field is marked as being in error

  Scenario: The complaint cannot be dismissed
    Given I have started a new travel request
    When I fill the travel request form as far as "nothing" and submit it
    And I dismiss the travel request complaint
    Then the travel request form still complains "Destination is required."

  Scenario: The estimate adds up the cost categories as I type
    Given I have started a new travel request
    When I estimate 900 for flights and 600 for hotels
    Then the travel request total estimate reads "$1,500.00"

  Scenario: The duration is shown once the dates make sense
    Given I have started a new travel request
    When I choose 10 September 2026 to 17 September 2026 for the trip
    Then the travel request duration badge reads "7 day(s)"

  Scenario: A backwards date range hides the duration rather than showing a negative one
    Given I have started a new travel request
    When I choose 10 September 2026 to 5 September 2026 for the trip
    Then no travel request duration badge is shown
    And the controller has worked the duration out as -5 days

  # --------------------------------------------------------------------- creating

  @mutates-fixture
  Scenario: Submitting a complete request stores it and puts it at the top of the list
    Given I have started a new travel request
    When I fill in a complete travel request for "Berlin, Germany"
    And I submit the travel request
    Then I see a notification containing "Travel request submitted successfully!"
    And the travel request form is not shown
    And the requests listed are "Berlin, Germany, London, UK, Tokyo, Japan"
    And the request for "Berlin, Germany" is "pending"

  @mutates-fixture
  Scenario: A newly created request is counted in the summary cards
    Given I have started a new travel request
    When I fill in a complete travel request for "Berlin, Germany"
    And I submit the travel request
    Then the request summary cards read:
      | Total Requests | 3 |
      | Pending        | 2 |
      | Approved       | 1 |
      | Rejected       | 0 |

  # $rootScope.currentUser is set during login and never persisted, so a restored
  # browser session cannot say who is signed in. Requests raised in such a
  # session are filed under the fallback name.
  @mutates-fixture
  Scenario: A request raised in a restored session is filed under "Demo User"
    Given I have started a new travel request
    When I fill in a complete travel request for "Berlin, Germany"
    And I submit the travel request
    Then the stored request for "Berlin, Germany" names the traveller "Demo User"
    And the portal does not remember who is signed in

  @mutates-fixture
  Scenario: The form never collects who is travelling
    Given I have started a new travel request
    When I fill in a complete travel request for "Berlin, Germany"
    And I submit the travel request
    Then the stored request for "Berlin, Germany" lists one nameless traveller

  # ---------------------------------------------------------------------- editing

  @mutates-fixture
  Scenario: Editing a pending request opens the form already filled in
    When I edit the request for "London, UK"
    Then the travel request form is shown
    And the request destination is "London, UK"
    And the travel request total estimate reads "$2,500.00"
    And the travel request submit button offers to update rather than submit

  @mutates-fixture
  Scenario: Saving an edit updates the request
    When I edit the request for "London, UK"
    And I change the request destination to "London, England"
    And I submit the travel request
    Then I see a notification containing "Travel request updated successfully!"
    And the requests listed are "London, England, Tokyo, Japan"

  # ------------------------------------------------------------------- cancelling

  @mutates-fixture
  Scenario: Cancelling a request asks first, then marks it cancelled
    When I cancel the request for "London, UK"
    Then I am asked "Are you sure you want to cancel this travel request?"
    And the last notification reads "Travel request cancelled"
    And the request for "London, UK" is "cancelled"
    And the server holds the request for "London, UK" as "cancelled"

  @mutates-fixture
  Scenario: Declining the confirmation leaves the request alone
    When I decline to cancel the request for "London, UK"
    Then the request for "London, UK" is "pending"
    And no travel request was written to the server

  @mutates-fixture
  Scenario: A cancelled request loses its edit and cancel actions
    When I cancel the request for "London, UK"
    Then the request for "London, UK" offers the actions "View Details"

  # The cancel handler updates the request in place but never re-runs
  # applyFilters(), so the table keeps showing it under a filter it no longer
  # matches — while the summary cards, which are recomputed on every digest,
  # already disagree.
  @mutates-fixture
  Scenario: A request cancelled under the Pending filter stays on screen and contradicts the cards
    Given I have filtered the requests by "Pending"
    When I cancel the request for "London, UK"
    Then the requests listed are "London, UK"
    And the request for "London, UK" is "cancelled"
    And the request summary cards read:
      | Total Requests | 2 |
      | Pending        | 0 |
      | Approved       | 1 |
      | Rejected       | 0 |

  # ------------------------------------------------------ SEAM-1: no policy at all

  Scenario: The portal never asks the server for the travel policy
    Then the travel policy was never requested
    And the server publishes a travel policy

  Scenario: No spending limit is shown anywhere on the page
    Then nothing on the travel requests page mentions a policy or a limit

  @mutates-fixture
  Scenario: A request far above the policy limit is accepted without a word
    Given I have started a new travel request
    When I fill in a complete travel request for "Sydney, Australia" estimating 5000 for flights
    And I submit the travel request
    Then I see a notification containing "Travel request submitted successfully!"
    And the travel request form complains about nothing
    And the stored request for "Sydney, Australia" is estimated at 5000
    And the server would have said the maximum flight cost is 2000
