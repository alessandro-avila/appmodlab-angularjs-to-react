/**
 * GlobalTravel Corp - FlightSearchController Tests
 * Sample Jasmine tests for AngularJS 1.6.x
 * Anti-patterns:
 *   - Testing $scope-based controller (legacy pattern)
 *   - Manual $httpBackend / Restangular mock setup
 *   - Testing implementation details rather than behavior
 *
 * ---------------------------------------------------------------------------
 * Reconciled against the running application.
 *
 * This suite was written against a controller that does not exist. Four
 * assumptions in it were wrong, and in every case the application was taken as
 * correct and the test was rewritten. The reconciliation is recorded in
 * specs/frd-flight-search.md under "Test Reconciliation".
 *
 *   1. Nothing is fetched when the controller starts, so there was never a
 *      response for $httpBackend.flush() to release.
 *   2. There is no popular-routes feature on this screen.
 *   3. Searching issues GET /api/flights, not POST.
 *   4. The filter model is { maxPrice, stops, airline, departTimeRange }.
 * ---------------------------------------------------------------------------
 */
'use strict';

describe('FlightSearchController', function() {
  var $controller, $rootScope, $scope, $httpBackend, Restangular;

  beforeEach(module('globalTravelApp'));

  beforeEach(inject(function(_$controller_, _$rootScope_, _$httpBackend_, _Restangular_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
    $httpBackend = _$httpBackend_;
    Restangular = _Restangular_;

    // Mock the auth token
    localStorage.setItem('authToken', 'mock-jwt-token');

    // Reconciliation 1: the popular-routes response that used to be primed here
    // was never requested. FlightSearchService.getPopularRoutes() exists but no
    // controller calls it, so priming it left an unused mock behind.
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    localStorage.removeItem('authToken');
  });

  function createController() {
    var ctrl = $controller('FlightSearchController', {
      $scope: $scope,
      $rootScope: $rootScope
    });
    return ctrl;
  }

  describe('Initialization', function() {
    it('should initialize with default search params', function() {
      createController();

      expect($scope.searchParams).toBeDefined();
      expect($scope.searchParams.cabinClass).toBe('economy');
      expect($scope.searchParams.origin).toBe('');
      expect($scope.searchParams.destination).toBe('');
    });

    it('should initialize with empty results', function() {
      createController();

      expect($scope.flights).toBeDefined();
      expect($scope.flights.length).toBe(0);
    });

    it('should set loading to false after init', function() {
      createController();

      expect($scope.isLoading).toBe(false);
    });

    it('should not request anything on init', function() {
      // Reconciliation 1: startup is entirely local. The screen shows an empty
      // form until the employee searches; nothing is fetched to fill it.
      createController();

      $httpBackend.verifyNoOutstandingRequest();
      expect($scope.hasSearched).toBe(false);
    });

    it('should not offer popular routes', function() {
      // Reconciliation 2: this test previously expected $scope.popularRoutes to
      // hold two suggested routes. The screen has no such feature — there is no
      // popularRoutes property and nothing in the template renders one. The
      // service exposes getPopularRoutes(), but no controller calls it.
      createController();

      expect($scope.popularRoutes).toBeUndefined();
    });

    it('should initialize the filters the screen actually offers', function() {
      // Reconciliation 4: records the real filter model, which the Filters
      // tests below depend on.
      createController();

      expect($scope.filters).toEqual({
        maxPrice: 5000,
        stops: 'any',
        airline: '',
        departTimeRange: 'any'
      });
    });
  });

  describe('Search Flights', function() {
    var mockFlights;

    beforeEach(function() {
      mockFlights = [
        {
          id: 'f1',
          airline: 'United Airlines',
          origin: 'SFO',
          destination: 'JFK',
          departureTime: '08:30',
          arrivalTime: '17:00',
          durationMinutes: 330,
          stops: 1,
          price: 450.00,
          cabinClass: 'economy'
        },
        {
          id: 'f2',
          airline: 'Delta Air Lines',
          origin: 'SFO',
          destination: 'JFK',
          departureTime: '10:00',
          arrivalTime: '18:15',
          durationMinutes: 315,
          stops: 0,
          price: 520.00,
          cabinClass: 'economy'
        },
        {
          id: 'f3',
          airline: 'American Airlines',
          origin: 'SFO',
          destination: 'JFK',
          departureTime: '14:30',
          arrivalTime: '23:00',
          durationMinutes: 330,
          stops: 1,
          price: 380.00,
          cabinClass: 'economy'
        }
      ];
    });

    it('should validate required fields before searching', function() {
      createController();

      $scope.searchParams.origin = '';
      $scope.searchParams.destination = '';

      $scope.searchFlights();

      expect($scope.errorMessage).toBeDefined();
      expect($scope.errorMessage).toContain('origin');
    });

    it('should search for flights with valid params', function() {
      // Reconciliation 3: the search is a GET with the criteria as query
      // parameters (FlightSearchService.search uses Restangular getList).
      // Reconciliation 5: the form defaults to a round trip, which will not
      // submit without a return date.
      $httpBackend.expectGET(/\/api\/flights\?/).respond(200, mockFlights);

      createController();

      $scope.searchParams.origin = 'SFO';
      $scope.searchParams.destination = 'JFK';
      $scope.searchParams.departDate = new Date('2024-04-15');
      $scope.searchParams.returnDate = new Date('2024-04-20');

      $scope.searchFlights();
      expect($scope.isLoading).toBe(true);

      $httpBackend.flush();

      expect($scope.flights.length).toBe(3);
      expect($scope.isLoading).toBe(false);
    });

    it('should refuse a round trip without a return date', function() {
      // Reconciliation 5: recorded because three tests in this suite assumed a
      // search would go out without one.
      createController();

      $scope.searchParams.origin = 'SFO';
      $scope.searchParams.destination = 'JFK';
      $scope.searchParams.departDate = new Date('2024-04-15');

      $scope.searchFlights();

      expect($scope.searchParams.tripType).toBe('roundtrip');
      expect($scope.errorMessage).toBe('Please select a return date for round trips.');
      expect($scope.isLoading).toBe(false);
    });

    it('should handle search errors gracefully', function() {
      $httpBackend.expectGET(/\/api\/flights\?/).respond(500, { error: 'Server error' });

      createController();

      $scope.searchParams.origin = 'SFO';
      $scope.searchParams.destination = 'JFK';
      $scope.searchParams.departDate = new Date('2024-04-15');
      $scope.searchParams.returnDate = new Date('2024-04-20');

      $scope.searchFlights();
      $httpBackend.flush();

      expect($scope.errorMessage).toBeDefined();
      expect($scope.isLoading).toBe(false);
    });

    it('should reset the maximum price filter to the dearest result', function() {
      // Records the behaviour that surprises employees most: whatever price
      // ceiling they set is discarded by the next search.
      $httpBackend.expectGET(/\/api\/flights\?/).respond(200, mockFlights);

      createController();
      $scope.filters.maxPrice = 100;

      $scope.searchParams.origin = 'SFO';
      $scope.searchParams.destination = 'JFK';
      $scope.searchParams.departDate = new Date('2024-04-15');
      $scope.searchParams.returnDate = new Date('2024-04-20');

      $scope.searchFlights();
      $httpBackend.flush();

      expect($scope.priceRange.max).toBe(520);
      expect($scope.filters.maxPrice).toBe(520);
    });
  });

  describe('Filters', function() {
    // Reconciliation 4: these tests used a filter model of
    // { airlines: [], stops: null, priceRange: {} }. The screen offers a single
    // airline, a maximum stop count, one price ceiling and a departure window.
    it('should filter by airline', function() {
      createController();

      $scope.flights = [
        { airline: 'United Airlines', price: 450, stops: 1 },
        { airline: 'Delta Air Lines', price: 520, stops: 0 },
        { airline: 'United Airlines', price: 380, stops: 1 }
      ];
      $scope.filteredFlights = $scope.flights.slice();
      $scope.filters = {
        maxPrice: 5000,
        stops: 'any',
        airline: 'United Airlines',
        departTimeRange: 'any'
      };

      $scope.applyFilters();

      expect($scope.filteredFlights.length).toBe(2);
      expect($scope.filteredFlights[0].airline).toBe('United Airlines');
    });

    it('should filter by number of stops', function() {
      createController();

      $scope.flights = [
        { airline: 'United Airlines', price: 450, stops: 1 },
        { airline: 'Delta Air Lines', price: 520, stops: 0 },
        { airline: 'American Airlines', price: 380, stops: 2 }
      ];
      $scope.filteredFlights = $scope.flights.slice();
      $scope.filters = {
        maxPrice: 5000,
        stops: '0',
        airline: '',
        departTimeRange: 'any'
      };

      $scope.applyFilters();

      expect($scope.filteredFlights.length).toBe(1);
      expect($scope.filteredFlights[0].stops).toBe(0);
    });

    it('should treat the stop filter as an upper bound', function() {
      // "1 Stop or fewer" keeps direct flights too.
      createController();

      $scope.flights = [
        { airline: 'United Airlines', price: 450, stops: 1 },
        { airline: 'Delta Air Lines', price: 520, stops: 0 },
        { airline: 'American Airlines', price: 380, stops: 2 }
      ];
      $scope.filters = {
        maxPrice: 5000,
        stops: '1',
        airline: '',
        departTimeRange: 'any'
      };

      $scope.applyFilters();

      expect($scope.filteredFlights.length).toBe(2);
    });
  });

  describe('Sorting', function() {
    it('should sort flights by price', function() {
      createController();

      $scope.flights = [
        { price: 520, airline: 'Delta' },
        { price: 380, airline: 'American' },
        { price: 450, airline: 'United' }
      ];

      $scope.sortField = 'price';
      $scope.sortReverse = false;
      $scope.applyFilters();

      expect($scope.filteredFlights[0].price).toBe(380);
      expect($scope.filteredFlights[2].price).toBe(520);
    });

    it('should reverse the order when the same column is chosen twice', function() {
      // Reconciliation 6: the list arrives already sorted by price ascending,
      // so the first press of Price reverses it rather than sorting it.
      createController();

      $scope.flights = [
        { price: 520, airline: 'Delta' },
        { price: 380, airline: 'American' },
        { price: 450, airline: 'United' }
      ];

      expect($scope.sortField).toBe('price');
      expect($scope.sortReverse).toBe(false);

      $scope.sortBy('price');
      expect($scope.sortReverse).toBe(true);
      expect($scope.filteredFlights[0].price).toBe(520);

      $scope.sortBy('price');
      expect($scope.sortReverse).toBe(false);
      expect($scope.filteredFlights[0].price).toBe(380);

      $scope.sortBy('durationMinutes');
      expect($scope.sortField).toBe('durationMinutes');
      expect($scope.sortReverse).toBe(false);
    });
  });

  describe('Flight Selection', function() {
    it('should select a flight and broadcast event', function() {
      // Reconciliation 7: this test used to replace $rootScope.$broadcast with a
      // spy. ui-router also broadcasts through it and reads defaultPrevented off
      // the result, so the stub broke the next digest. Listening for the event
      // records the same behaviour without disabling the event bus.
      createController();

      var flight = { id: 'f1', airline: 'United', price: 450 };
      var announced = [];
      $rootScope.$on('flight:selected', function(event, selected) {
        announced.push(selected);
      });

      $scope.selectFlight(flight);

      expect($scope.selectedFlight).toBe(flight);
      expect(announced).toEqual([flight]);
    });
  });

  describe('Dates', function() {
    it('should push the return date out when departure passes it', function() {
      // Only once a departure date is already set: the watch ignores the first
      // value, so choosing a departure date on a fresh form leaves the return
      // date untouched.
      createController();

      $scope.searchParams.departDate = new Date('2026-08-10T00:00:00');
      $scope.searchParams.returnDate = new Date('2026-08-20T00:00:00');
      $scope.$digest();

      $scope.searchParams.departDate = new Date('2026-08-25T00:00:00');
      $scope.$digest();

      expect($scope.searchParams.returnDate.getDate()).toBe(26);
      expect($scope.searchParams.returnDate.getMonth()).toBe(7);
    });

    it('should clear the return date when the trip becomes one way', function() {
      createController();

      $scope.searchParams.returnDate = new Date('2026-08-20T00:00:00');
      $scope.$digest();

      $scope.searchParams.tripType = 'oneway';
      $scope.$digest();

      expect($scope.searchParams.returnDate).toBeNull();
    });
  });
});
