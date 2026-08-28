@existing-behavior @feature-travel-request
Feature: Travel requests
  Employees raise a travel request before a trip, track its approval status,
  edit it while it is still pending, and cancel it.

  These scenarios describe what the AngularJS portal DOES TODAY. They are a
  regression net for the React migration, not a statement of what it should do.
  Everything below was confirmed by driving the running application.

  Three findings shape this file. Two of them were repaired in Increment 4;
  the third was already correct and is preserved:

  1. THE SEARCH BOX WAS BROKEN. applyFilters() read req.travelerName, a field
     the seeded requests do not carry. Typing anything into the search box
     threw a TypeError out of the digest, so filteredRequests was never
     reassigned and the table did not change. The user saw their text in the
     box and no effect whatsoever. (controller :122)

     SUPERSEDED in Inc-4 by ADR-005, which lists the inert search among "the
     four dead controls" and resolves them "by being reimplemented correctly".

  2. THE ERROR ALERT COULD NOT BE DISMISSED. The alert was wrapped in ng-if,
     which creates a child scope; its close button assigned errorMessage = ''
     onto that child, shadowing the controller's copy. ng-if still watched the
     parent, which was still truthy, so the alert stayed on screen. The same
     ng-if scope-shadowing defect recorded against the itinerary status filter
     — a defect class, not a one-off.

     SUPERSEDED in Inc-4 by ADR-005, whose Supersede row names "the
     un-dismissable alerts" in the same breath as the four dead controls.

  3. THE STATUS FILTER, BY CONTRAST, WORKED ALL ALONG. The filter row sits
     outside the ng-if, so its assignments landed on the controller scope.
     Where the form lives inside an ng-if it was still safe, because its
     ng-models are dotted (newRequest.destination) and resolve up the
     prototype chain. Nothing here changed.

  VALIDATION IS FAIL-FAST AND ORDER-DEPENDENT, AND STAYS THAT WAY. Six checks
  run in a fixed order; the first failure wins and exactly one message is shown
  (controller :198-228). The React form reproduces the order and the message
  text exactly. Showing every error at once would be a different product
  decision and is not taken here.

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

  # ------------------------------------------------------- searching (was broken)

  @inc-4
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 (see also ADR-022), per increment plan §8.3.
  #
  # ADR-005's scenario classification lists "the four dead controls" under
  # Supersede — "the scenario encodes a defect that ADR-001/002 already decided
  # to fix" — and its rejection of the Fix-Bugs path says those defects "are
  # resolved by being reimplemented correctly". The inert search box is one of
  # the four. It searches.
  #
  # The legacy read `req.travelerName.toLowerCase()` on requests that carry no
  # such field, throwing a TypeError out of the digest before
  # `filteredRequests` was reassigned. The intent was plainly to search
  # destination, purpose and traveller name; that is what it does now, with the
  # absent field simply contributing nothing rather than throwing.
  #
  # NOT writing code to reproduce a TypeError is the point: the defect is
  # resolved by reimplementation, not preserved by simulation.
  # ---------------------------------------------------------------------------
  Scenario: Searching narrows the list to matching requests
    When I search the requests for "London"
    Then the requests listed are "London, UK"
    And the browser reported no error

  @inc-4
  # SUPERSEDED by ADR-005 — the box still keeps the text, but something happens
  # now. The assertion is unchanged; the scenario's claim about it is not.
  Scenario: The search box keeps the text I typed
    When I search the requests for "Tokyo"
    Then the request search box still reads "Tokyo"
    And the requests listed are "Tokyo, Japan"

  @inc-4
  # SUPERSEDED by ADR-005 — a search nothing matches now empties the table
  # rather than leaving every request on screen.
  Scenario: Searching for something no request matches empties the table
    When I search the requests for "zzzznowhere"
    Then no request table is shown
    And I am invited to create my first request

  @inc-4
  # SUPERSEDED by ADR-005 — the two filters now COMBINE rather than the search
  # failing and leaving the status filter's result untouched. The expected list
  # is unchanged, because "London" is the only pending request either way; what
  # changed is why.
  Scenario: A status filter and a search combine
    When I filter the requests by "Pending"
    And I search the requests for "London"
    Then the requests listed are "London, UK"

  @inc-4
  # NET-NEW — searching has never had behaviour to pin before.
  Scenario: Searching matches the purpose as well as the destination
    When I search the requests for "onboarding"
    Then the requests listed are "London, UK"

  @inc-4
  # NET-NEW — the legacy lower-cased the query and the field, so case
  # insensitivity was always intended; it was simply never reachable.
  Scenario: Searching ignores case
    When I search the requests for "tOkYo"
    Then the requests listed are "Tokyo, Japan"

  @inc-4
  # NET-NEW — clearing the box restores the full list.
  Scenario: Clearing the search restores every request
    When I search the requests for "London"
    And I clear the request search
    Then the requests listed are "London, UK, Tokyo, Japan"

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

  @inc-4
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 — "the un-dismissable alerts" appear in the SAME
  # Supersede row as the four dead controls, and for the same reason.
  #
  # The close button sat inside the alert's own ng-if, so `errorMessage = ''`
  # landed on the child scope and shadowed the controller's copy. ng-if kept
  # watching the parent, which was still truthy, so the alert never went away.
  # Same scope-shadowing class as the itinerary status filter (finding P-2).
  #
  # React has no scope chain and, more to the point, ADR-005 authorises the
  # repair. The complaint dismisses.
  # ---------------------------------------------------------------------------
  Scenario: The complaint can be dismissed
    Given I have started a new travel request
    When I fill the travel request form as far as "nothing" and submit it
    And I dismiss the travel request complaint
    Then the travel request form complains about nothing

  @inc-4
  # NET-NEW — dismissing must not be mistaken for fixing. Submitting again with
  # the same empty form raises the same complaint.
  Scenario: A dismissed complaint returns if the form is still wrong
    Given I have started a new travel request
    When I fill the travel request form as far as "nothing" and submit it
    And I dismiss the travel request complaint
    And I submit the travel request
    Then the travel request form complains "Destination is required."

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
