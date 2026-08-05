@existing-behavior @feature-flight-search
Feature: Flight search

  What the GlobalTravel portal does today when an employee looks for a flight.

  These scenarios are a snapshot of the legacy AngularJS application as it behaves
  right now. Several of them describe behaviour a reader may find surprising. They
  are written as they are because the application is the specification for this
  baseline — whether a behaviour is desirable is decided later, in assessment and
  planning, not here.

  Two facts about the mock backend shape every scenario below:
    - It generates flights randomly on every request (between 5 and 12 of them, with
      random prices, times and stop counts) and it does not seed. Two identical
      searches return different results.
    - Because of that, nothing here asserts a literal flight count or price. The
      scenarios assert relationships that hold for any generated result set.

  Background:
    Given I am signed in to the travel portal
    And I am on the flight search page

  # ---------------------------------------------------------------------------
  # Validation
  # ---------------------------------------------------------------------------

  Scenario: Searching without an origin or destination is refused
    When I search without entering an origin or a destination
    Then I see the message "Please enter origin and destination."
    And no flight results are shown

  Scenario: Searching without a departure date is refused
    Given I have entered "SFO" as the origin and "JFK" as the destination
    When I search without choosing a departure date
    Then I see the message "Please select a departure date."
    And no flight results are shown

  Scenario: A round trip without a return date is refused
    Given I have entered "SFO" as the origin and "JFK" as the destination
    And the trip type is "roundtrip"
    And I have chosen a departure date
    When I search without choosing a return date
    Then I see the message "Please select a return date for round trips."
    And no flight results are shown

  # ---------------------------------------------------------------------------
  # Searching
  # ---------------------------------------------------------------------------

  Scenario: A valid round trip search returns flights
    When I search "SFO" to "JFK" as a round trip
    Then flight results are shown
    And every result shows an airline, a departure time, a duration, a stop count and a price
    And the results are ordered by price from lowest to highest

  Scenario: Repeating the same search returns a different set of flights
    When I search "SFO" to "JFK" as a round trip
    And I note the flights I was offered
    And I search "SFO" to "JFK" as a round trip again
    Then the flights I am offered are not the same as the ones I noted

  Scenario: The departure date I searched for does not reach the results
    When I search "SFO" to "JFK" as a round trip departing "12/15/2026"
    And I select the first flight offered
    Then the flight is dated today, not "12/15/2026"

  # ---------------------------------------------------------------------------
  # Dates
  # ---------------------------------------------------------------------------

  Scenario: Choosing a departure date after the return date moves the return date
    Given the trip type is "roundtrip"
    And the departure date is "08/10/2026"
    And the return date is "08/20/2026"
    When I change the departure date to "08/25/2026"
    Then the return date becomes "08/26/2026"

  Scenario: The first departure date I choose leaves the return date alone
    Given the trip type is "roundtrip"
    And the return date is "08/20/2026"
    And no departure date has been chosen yet
    When I choose "08/25/2026" as the departure date
    Then the return date is still "08/20/2026"

  Scenario: Switching to a one way trip clears the return date
    Given the trip type is "roundtrip"
    And the return date is "08/20/2026"
    When I switch the trip type to "oneway"
    Then the return date is empty

  Scenario: A chosen date is shown as a raw date string, not as a calendar date
    When I choose "08/25/2026" as the departure date
    Then the departure date field reads "Tue Aug 25 2026" followed by a time and time zone

  Scenario: The flight I selected covers the date calendar
    Given I have searched "SFO" to "JFK" as a round trip
    And I have selected the first flight offered
    When I open the departure date calendar
    Then the days behind the selected flight cannot be clicked
    And the days clear of the selected flight can still be clicked

  # ---------------------------------------------------------------------------
  # The maximum price filter
  # ---------------------------------------------------------------------------

  Scenario: The maximum price filter is reset by every search
    Given I have searched "SFO" to "JFK" as a round trip
    And I have lowered the maximum price filter to its lowest setting
    When I search "SFO" to "JFK" as a round trip again
    Then the maximum price filter no longer holds the value I set
    And the maximum price filter is back at the top of the new price range

  Scenario: The maximum price filter cannot be taken below the cheapest flight
    When I search "SFO" to "JFK" as a round trip
    Then the maximum price filter will not go below the price of the cheapest flight
    And lowering it as far as it goes still leaves at least one flight listed

  Scenario: The maximum price filter cannot always reach the dearest flight
    When I search "SFO" to "JFK" as a round trip
    Then the maximum price filter is at most the price of the dearest flight
    And any flight priced above the maximum price filter is left out of the list

  Scenario: The result count in the notification can exceed the number of flights listed
    When I search "SFO" to "JFK" as a round trip
    Then the notification counts every flight that was found
    And the list shows only the flights at or below the maximum price filter

  # ---------------------------------------------------------------------------
  # The other filters
  # ---------------------------------------------------------------------------

  Scenario: Filtering by airline shows only that airline
    Given I have searched "SFO" to "JFK" as a round trip
    When I filter by one of the airlines offered
    Then every flight listed is operated by that airline

  Scenario: Filtering by stops shows only flights within that stop count
    Given I have searched "SFO" to "JFK" as a round trip
    When I filter by "Non-stop"
    Then no flight listed has a stop

  Scenario Outline: Filtering by departure time uses fixed time bands
    Given I have searched "SFO" to "JFK" as a round trip
    When I filter by the "<band>" departure time
    Then every flight listed departs between "<from>" and "<to>"

    Examples:
      | band      | from  | to    |
      | morning   | 06:00 | 11:59 |
      | afternoon | 12:00 | 17:59 |
      | evening   | 18:00 | 05:59 |

  # ---------------------------------------------------------------------------
  # Sorting
  # ---------------------------------------------------------------------------

  Scenario: Sorting by a new column orders it from lowest to highest
    Given I have searched "SFO" to "JFK" as a round trip
    When I sort by "duration"
    Then the results are ordered by duration from lowest to highest

  Scenario: Sorting by the column already sorted reverses it
    Given I have searched "SFO" to "JFK" as a round trip
    And the results are sorted by "price" from lowest to highest
    When I sort by "price" again
    Then the results are ordered by price from highest to lowest

  # ---------------------------------------------------------------------------
  # Selecting and booking
  # ---------------------------------------------------------------------------

  Scenario: Selecting a flight opens its details
    Given I have searched "SFO" to "JFK" as a round trip
    When I select the first flight offered
    Then the details of that flight are shown

  Scenario: Flights are offered without a flight number
    Given I have searched "SFO" to "JFK" as a round trip
    When I select the first flight offered
    Then no result carries a flight number
    And the details name the airline followed by an empty flight number

  Scenario: Booking the selected flight confirms it with a code
    Given I have searched "SFO" to "JFK" as a round trip
    And I have selected the first flight offered
    When I book the selected flight
    Then I see a notification containing "Flight booked successfully! Confirmation:"
    And the itinerary is asked to refresh
