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

  @inc-2
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-009 (explicit date parsing) — the same mechanism as
  # flight-search:91, migrated in Increment 1.
  #
  # The legacy field was <input type="text"> with ng-model bound to a Date.
  # AngularJS re-rendered the model over the text the datepicker had written, so
  # the field displayed Date.prototype.toString(). Date entry is now a native
  # date input parsed with an explicit format.
  # ---------------------------------------------------------------------------
  Scenario: A chosen date is displayed as a calendar date
    When I choose "12 August 2026" as the check-in date
    Then the check-in field reads the calendar date "08/12/2026"

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

  @inc-2
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005, which names "ngRepeat:dupes blocking hotel booking"
  # as a Supersede.
  #
  # The legacy table repeated `room in selectedHotel.rooms track by room.id`.
  # The API sends no `id`, so all five track-keys were `undefined` — a
  # duplicate-key set — and AngularJS refused to render the repeat. React keys
  # the rows by a field that exists, so the table renders and no error occurs.
  # The scenario inverts: five loaded, five shown, no error.
  # ---------------------------------------------------------------------------
  Scenario: The room table shows every room that was loaded
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    Then five rooms have been loaded
    And the room table shows five rows
    And the browser reports no duplicate-key error for the room list

  @inc-2
  # NET-NEW. The columns have never been seen populated, because the table has
  # never rendered. Shapes taken from the discovery document, Q1.
  Scenario: Each room row shows its type, price, beds and maximum guests
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    Then every room row shows a type, a nightly price, a bed description and a maximum guest count

  @inc-2
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 and Q-3 (a booking must persist and appear on the
  # itinerary). The completion path becomes reachable for the first time.
  # ---------------------------------------------------------------------------
  Scenario: A hotel booking can be completed through the interface
    Given I have searched for hotels in "Boston"
    When I view the rooms of the first hotel
    And I select the first room
    Then a booking summary is offered
    And the booking summary shows a total for the stay

  @inc-2
  # NET-NEW. Selecting a room is behaviour that has never been reachable.
  Scenario: Selecting a room updates the booking summary
    Given I have searched for hotels in "Boston"
    And I have viewed the rooms of the first hotel
    When I select the room named "Standard Double"
    Then the booking summary names the room "Standard Double"
    And the booking summary total is that room's nightly price times the number of nights

  @inc-2
  # NET-NEW. Discovery Q2 found `available: 0` is reachable on three of the five
  # room types — Presidential Suite 12/30 samples, Deluxe King 8/30, Executive
  # Suite 6/30. The legacy template has no `available`-conditional markup at all,
  # so this behaviour is defined here for the first time.
  Scenario: A room with no availability cannot be selected
    Given I have searched for hotels in "Boston"
    And I have viewed the rooms of the first hotel
    When a room has no rooms left
    Then that room is marked as unavailable
    And that room cannot be selected

  # ---------------------------------------------------------------------------
  # Booking — reachable through the interface for the first time
  # ---------------------------------------------------------------------------

  @inc-2
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 and Q-3, per increment plan §6.5 scenario 24:
  #   "the scenario exists ONLY because the table could not be used. It is
  #    rewritten as a UI scenario and @bypasses-ui is removed ... The three
  #    defects it documents are fixed as part of building a path that has never
  #    existed."
  #
  # @bypasses-ui is REMOVED — the suite goes from 4 bypasses to 3 — because the
  # scenario no longer needs to drive the controller to reach the code behind an
  # unrenderable table.
  #
  # The three defects, and what each becomes (discovery document Q3, Q4, Q5):
  #   1. roomId was `selectedRoom.id`, and rooms carry no `id`, so `undefined`
  #      was transmitted. `type` is unique within a response and is now sent.
  #   2. totalPrice read `room.pricePerNight`, which does not exist on a room —
  #      a HOTEL has `pricePerNight`, a ROOM has `price`. The total was NaN.
  #   3. the notification read `confirmation.confirmationCode`; the payload
  #      carries `confirmationNumber`, so it rendered the text "undefined".
  # ---------------------------------------------------------------------------
  Scenario: A completed booking is priced and confirmed
    Given I have searched for hotels in "Boston"
    And I have viewed the rooms of the first hotel
    And I select the first room
    When I confirm the booking
    Then the booking request identifies the room
    And the booking request prices the stay
    And the booking is accepted
    And the last notification reads "Hotel booked!" followed by a confirmation code
    And the confirmation dialogue shows a confirmation code and a total

  @inc-2
  # NET-NEW. The confirmation dialogue was a Bootstrap 3 jQuery modal opened by
  # $('#bookingConfirmationModal').modal('show'). It is now a React modal
  # (ADR-007 category 2). No user has seen it, because the path to it never
  # existed.
  Scenario: The confirmation dialogue can be dismissed
    Given I have searched for hotels in "Boston"
    And I have viewed the rooms of the first hotel
    And I select the first room
    And I confirm the booking
    When I close the confirmation dialogue
    Then the confirmation dialogue is no longer shown

  # ---------------------------------------------------------------------------
  # Cross-feature coupling
  # ---------------------------------------------------------------------------

  Scenario: Selecting a flight does not carry the destination over to hotels
    # The hotel controller listens for a "flight:selected" event to pre-fill the
    # city and the dates. The two screens are separate routes, so the hotel
    # controller does not exist when the event is broadcast and is created fresh
    # afterwards. The pre-fill can never happen.
    #
    # -- Increment 2 note: PRESERVE, decided ------------------------------------
    # Both modules are now React, so a store read COULD trivially make the
    # pre-fill work. It is deliberately not built.
    #
    # This was raised at the start of Increment 2 because restoring the pre-fill
    # was requested, and it contradicts increment-plan §6.5 and §6.8, which make
    # this scenario an exit criterion:
    #   "the React implementation must contain NO pre-fill mechanism at all ...
    #    A React store that helpfully wires flight:selected to a hotel-search
    #    pre-fill turns this scenario red and is an unauthorised behaviour
    #    change."
    # The decision taken was to KEEP THE PLAN: no pre-fill mechanism, this
    # scenario stays PRESERVE and green, and the pre-fill becomes its own later
    # increment with its own Gherkin and ADR (the route plan §2.4 describes).
    #
    # ADR-013 maps `flight:selected` to NO store concern. Increment 2 satisfies
    # this scenario BY CONSTRUCTION — there is no pre-fill mechanism to disable —
    # and a unit test asserts the absence so it cannot be added by accident.
    # ---------------------------------------------------------------------------
    Given I have selected a flight to "Boston" on the flight search page
    When I go to the hotel booking page
    Then the destination city is empty
    And no check-in date is set
