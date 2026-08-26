@existing-behavior @feature-hotel-booking
Feature: Hotel booking

  What the GlobalTravel portal does today when an employee looks for a hotel.

  These scenarios are a snapshot of the legacy AngularJS application as it behaves
  right now. Several of them describe behaviour a reader may find surprising, and
  one section records an outright dead end. They are written as they are because
  the application is the specification for this baseline — whether a behaviour is
  desirable is decided later, in assessment and planning, not here.

  The headline finding is in "Choosing a room": the room table renders no rows at
  all, so a hotel booking cannot be completed through the user interface.
  Everything upstream of it — searching, filtering, sorting — works.

  Two facts about the mock backend shape every scenario below:
    - It generates hotels randomly on every request (between 6 and 15 of them,
      with random ratings, prices and amenities) and it does not seed. Two
      identical searches return different results.
    - Because of that, nothing here asserts a literal hotel count or price. The
      scenarios assert relationships that hold for any generated result set.

  Background:
    Given I am signed in to the travel portal
    And I am on the hotel booking page

  # ---------------------------------------------------------------------------
  # Validation
  # ---------------------------------------------------------------------------

  Scenario: Searching without a destination city is refused
    When I search for hotels without entering a city
    Then I am shown the hotel error "Please enter a city."
    And no hotels are listed

  Scenario: Searching without dates is refused
    Given I have entered "Boston" as the destination city
    When I search for hotels without choosing any dates
    Then I am shown the hotel error "Please select check-in and check-out dates."
    And no hotels are listed

  # ---------------------------------------------------------------------------
  # Dates and the night count
  # ---------------------------------------------------------------------------

  Scenario: Choosing a check-in date fills in the check-out date for me
    When I choose "12 August 2026" as the check-in date
    Then the check-out date is "13 August 2026"
    And the stay is shown as "1 night(s)"

  Scenario: A chosen date is displayed as a raw JavaScript date string
    # The datepicker writes "08/12/2026", then Angular re-renders the bound Date
    # object over it. The user is left looking at the object, timezone and all.
    When I choose "12 August 2026" as the check-in date
    Then the check-in field reads a date string starting "Wed Aug 12 2026"

  Scenario: Choosing only a check-out date leaves the stay length unknown
    When I choose "10 August 2026" as the check-out date
    Then no night count is shown

  Scenario: Choosing a check-in after the check-out silently discards my check-out
    # The user asked for 10 -> 20 August. They are given 20 -> 21 August without
    # being told, because the check-in watcher rewrites any check-out that does
    # not fall after the check-in.
    Given I have chosen "10 August 2026" as the check-out date
    When I choose "20 August 2026" as the check-in date
    Then the check-out date is "21 August 2026"
    And the stay is shown as "1 night(s)"

  # ---------------------------------------------------------------------------
  # Searching
  # ---------------------------------------------------------------------------

  Scenario: A successful search lists hotels for the chosen city
    When I search for hotels in "Boston"
    Then at least one hotel is listed
    And the hotel count line agrees with the number of hotels listed
    And every hotel listed is in "Boston"
    And I am told how many hotels were found in "Boston"

  Scenario: Each hotel card shows a rating summary worked out in the browser
    # ratingText and reviewSummary are not sent by the API — the service adds
    # them to every hotel after the response arrives.
    When I search for hotels in "Boston"
    Then the first hotel card shows a rating word and a review count

  Scenario: Each hotel card prices the whole stay, not just one night
    When I search for hotels in "Boston" staying 3 nights in 2 rooms
    Then the first hotel card total is six times its nightly price

  Scenario: The hotel address is never shown
    # The card has a place for an address; the API never sends one.
    When I search for hotels in "Boston"
    Then the first hotel card shows no address

  # ---------------------------------------------------------------------------
  # Filtering — applied live, without searching again
  # ---------------------------------------------------------------------------

  Scenario: Filters take effect without searching again
    Given I have searched for hotels in "Boston"
    When I set the minimum rating to 4 stars
    Then the hotel list is filtered without asking the server again

  Scenario: The minimum rating filter keeps only hotels at or above it
    Given I have searched for hotels in "Boston"
    When I set the minimum rating to 4 stars
    Then the hotels listed are exactly those rated 4 stars or better
    And the hotel count line agrees with the number of hotels listed

  Scenario: The maximum price filter keeps only hotels at or below it
    Given I have searched for hotels in "Boston"
    When I set the maximum nightly price to 150
    Then the hotels listed are exactly those costing 150 or less per night

  Scenario: Eight amenities can be filtered on
    Given I have searched for hotels in "Boston"
    Then the amenities offered are "WiFi, Pool, Gym, Spa, Restaurant, Parking, Airport Shuttle, Business Center"

  Scenario: Choosing several amenities requires a hotel to have all of them
    Given I have searched for hotels in "Boston"
    When I filter on the amenity "WiFi"
    And I also filter on the amenity "Pool"
    Then the hotels listed are exactly those offering both "WiFi" and "Pool"
    And no more hotels are listed than when only "WiFi" was chosen

  Scenario: An impossible combination of filters empties the list
    Given I have searched for hotels in "Boston"
    When I set the minimum rating to 5 stars
    And I set the maximum nightly price to 50
    Then no hotels are listed
    And I am told that no hotels match my criteria

  # ---------------------------------------------------------------------------
  # Sorting
  # ---------------------------------------------------------------------------

  Scenario: Ordering by price, low to high
    Given I have searched for hotels in "Boston"
    When I order the hotels by "Price: Low to High"
    Then the hotels are listed from cheapest to dearest

  Scenario: Ordering by price, high to low
    Given I have searched for hotels in "Boston"
    When I order the hotels by "Price: High to Low"
    Then the hotels are listed from dearest to cheapest

  Scenario: Ordering by guest rating
    Given I have searched for hotels in "Boston"
    When I order the hotels by "Guest Rating"
    Then the hotels are listed from best rated to worst rated

  Scenario: The recommended order puts featured hotels first
    Given I have searched for hotels in "Boston"
    When I order the hotels by "Recommended"
    Then every featured hotel is listed before every hotel that is not featured

  # ---------------------------------------------------------------------------
  # Choosing a room — where the journey ends
  # ---------------------------------------------------------------------------

  Scenario: Viewing rooms opens a panel naming the hotel
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    Then a room panel opens headed with that hotel's name

  Scenario: The room table is empty even though rooms were loaded
    # The API returns five rooms and the controller stores all five. The table
    # repeats them "track by room.id", but the API sends no id, so every row has
    # the same tracking key and AngularJS refuses to render the repeat.
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    Then five rooms have been loaded
    But the room table shows no rows
    And the browser reports a duplicate-key error for the room list

  Scenario: A hotel booking cannot be completed through the interface
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    Then there is no room I can select
    And no booking summary is offered

  # ---------------------------------------------------------------------------
  # Booking — reachable only by driving the controller directly
  # ---------------------------------------------------------------------------

  @bypasses-ui
  Scenario: Driven directly, a booking is priced at nothing and confirmed with nothing
    # The room table cannot be used, so this scenario selects a room through the
    # controller to reach the code behind it. Three defects meet here: the nightly
    # price is read from a field the API does not send, so the total is not a
    # number; the confirmation code is read from a field the API does not send
    # either; and the room identifier is never transmitted.
    Given I have searched for hotels in "Boston"
    And I have viewed the rooms of the first hotel
    And I select the first room by driving the controller directly
    Then the booking summary shows no total price
    When I confirm the booking
    Then the booking request carries no room identifier
    And the booking request prices the stay as nothing
    But the booking is accepted
    And the last notification reads "Hotel booked! Confirmation: undefined"
    And the confirmation dialogue shows neither a confirmation code nor a total

  # ---------------------------------------------------------------------------
  # Cross-feature coupling
  # ---------------------------------------------------------------------------

  @deferred-to-inc-2
  Scenario: Selecting a flight does not carry the destination over to hotels
    # The hotel controller listens for a "flight:selected" event to pre-fill the
    # city and the dates. The two screens are separate routes, so the hotel
    # controller does not exist when the event is broadcast and is created fresh
    # afterwards. The pre-fill can never happen.
    #
    # -- Increment 1 note -------------------------------------------------------
    # After Inc-1, flight search is React and hotel booking is still AngularJS.
    # ADR-005 rejected an in-page interop bridge, so this journey is DEFERRED and
    # remains unserved until Increment 2 migrates hotel booking. No interop is
    # built for it.
    #
    # The outcome is unchanged and the assertions below are untouched: the
    # legacy emitter is gone, and the AngularJS listener that survives is never
    # reached — previously because the two controllers were never alive together,
    # now because nothing broadcasts. The scenario therefore still PASSES, and it
    # is tagged rather than dropped so the deferral is visible.
    #
    # ADR-013 maps `flight:selected` to NO store concern: it is deliberately
    # dropped, not ported. Increment 2 must satisfy this scenario BY
    # CONSTRUCTION — there is no pre-fill mechanism at all — rather than by
    # accident. Making the pre-fill work would be an unauthorised behaviour
    # change (increment-plan §2.4).
    # ---------------------------------------------------------------------------
    Given I have selected a flight to "Boston" on the flight search page
    When I go to the hotel booking page
    Then the destination city is empty
    And no check-in date is set
