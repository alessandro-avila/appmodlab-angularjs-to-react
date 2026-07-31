/**
 * FlightSearchController
 * Legacy AngularJS controller with $scope, $rootScope events,
 * $watch, jQuery DOM manipulation, Lodash, and Moment.js usage.
 */
(function() {
  'use strict';

  angular.module('globalTravelApp')
    .controller('FlightSearchController', [
      '$scope', '$rootScope', '$timeout', 'FlightSearchService',
      function($scope, $rootScope, $timeout, FlightSearchService) {

        // --- Legacy $scope state ---
        $scope.searchParams = {
          origin: '',
          destination: '',
          departDate: null,
          returnDate: null,
          passengers: 1,
          cabinClass: 'economy',
          tripType: 'roundtrip'
        };

        $scope.flights = [];
        $scope.filteredFlights = [];
        $scope.selectedFlight = null;
        $scope.isLoading = false;
        $scope.hasSearched = false;
        $scope.sortField = 'price';
        $scope.sortReverse = false;
        $scope.errorMessage = '';

        $scope.filters = {
          maxPrice: 5000,
          stops: 'any',
          airline: '',
          departTimeRange: 'any'
        };

        $scope.airlines = [];
        $scope.priceRange = { min: 0, max: 5000 };

        // --- Legacy: $watch on search params to auto-validate ---
        $scope.$watch('searchParams.departDate', function(newVal, oldVal) {
          if (newVal && oldVal && newVal !== oldVal) {
            var dept = moment(newVal);
            var ret = moment($scope.searchParams.returnDate);
            if ($scope.searchParams.returnDate && dept.isAfter(ret)) {
              $scope.searchParams.returnDate = dept.add(1, 'days').toDate();
            }
          }
        });

        $scope.$watch('searchParams.tripType', function(newVal) {
          if (newVal === 'oneway') {
            $scope.searchParams.returnDate = null;
          }
        });

        // Deep watch on filters to re-apply
        $scope.$watch('filters', function(newFilters) {
          if ($scope.hasSearched) {
            $scope.applyFilters();
          }
        }, true);

        // --- Legacy: jQuery DOM manipulation ---
        $scope.initDatepickers = function() {
          $timeout(function() {
            // jQuery datepicker initialisation mixed with Angular (anti-pattern)
            $('#departDate').datepicker({
              minDate: 0,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.searchParams.departDate = new Date(dateText);
                });
              }
            });
            $('#returnDate').datepicker({
              minDate: 1,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.searchParams.returnDate = new Date(dateText);
                });
              }
            });
          }, 0);
        };

        // --- Search flights ---
        $scope.searchFlights = function() {
          if (!$scope.validateSearch()) {
            return;
          }

          $scope.isLoading = true;
          $scope.errorMessage = '';
          $scope.hasSearched = true;

          // jQuery: show spinner overlay (anti-pattern)
          $('#search-overlay').fadeIn(200);

          var params = angular.copy($scope.searchParams);
          params.departDate = moment(params.departDate).format('YYYY-MM-DD');
          if (params.returnDate) {
            params.returnDate = moment(params.returnDate).format('YYYY-MM-DD');
          }

          FlightSearchService.search(params).then(function(results) {
            $scope.flights = results;
            $scope.airlines = _.uniq(_.map(results, 'airline'));
            $scope.priceRange.min = _.minBy(results, 'price') ? _.minBy(results, 'price').price : 0;
            $scope.priceRange.max = _.maxBy(results, 'price') ? _.maxBy(results, 'price').price : 5000;
            $scope.filters.maxPrice = $scope.priceRange.max;
            $scope.applyFilters();

            $rootScope.$broadcast('notification:add', 'Found ' + results.length + ' flights', 'success');
          }).catch(function(err) {
            $scope.errorMessage = 'Failed to search flights. Please try again.';
            $rootScope.$broadcast('notification:add', 'Flight search failed', 'error');
          }).finally(function() {
            $scope.isLoading = false;
            $('#search-overlay').fadeOut(200);
          });
        };

        // --- Validate search form ---
        $scope.validateSearch = function() {
          if (!$scope.searchParams.origin || !$scope.searchParams.destination) {
            $scope.errorMessage = 'Please enter origin and destination.';
            // jQuery highlight (anti-pattern)
            $('.search-field-required').addClass('has-error').delay(3000).queue(function() {
              $(this).removeClass('has-error').dequeue();
            });
            return false;
          }
          if (!$scope.searchParams.departDate) {
            $scope.errorMessage = 'Please select a departure date.';
            return false;
          }
          if ($scope.searchParams.tripType === 'roundtrip' && !$scope.searchParams.returnDate) {
            $scope.errorMessage = 'Please select a return date for round trips.';
            return false;
          }
          return true;
        };

        // --- Apply filters using Lodash ---
        $scope.applyFilters = function() {
          var filtered = _.clone($scope.flights);

          filtered = _.filter(filtered, function(flight) {
            return flight.price <= $scope.filters.maxPrice;
          });

          if ($scope.filters.stops !== 'any') {
            var maxStops = parseInt($scope.filters.stops, 10);
            filtered = _.filter(filtered, function(flight) {
              return flight.stops <= maxStops;
            });
          }

          if ($scope.filters.airline) {
            filtered = _.filter(filtered, { airline: $scope.filters.airline });
          }

          if ($scope.filters.departTimeRange !== 'any') {
            filtered = _.filter(filtered, function(flight) {
              var hour = moment(flight.departureTime, 'HH:mm').hour();
              switch ($scope.filters.departTimeRange) {
                case 'morning': return hour >= 6 && hour < 12;
                case 'afternoon': return hour >= 12 && hour < 18;
                case 'evening': return hour >= 18 || hour < 6;
                default: return true;
              }
            });
          }

          // Sort using Lodash
          filtered = _.orderBy(filtered, [$scope.sortField], [$scope.sortReverse ? 'desc' : 'asc']);

          $scope.filteredFlights = filtered;
        };

        // --- Sorting ---
        $scope.sortBy = function(field) {
          if ($scope.sortField === field) {
            $scope.sortReverse = !$scope.sortReverse;
          } else {
            $scope.sortField = field;
            $scope.sortReverse = false;
          }
          $scope.applyFilters();
        };

        // --- Select a flight ---
        $scope.selectFlight = function(flight) {
          $scope.selectedFlight = flight;
          // jQuery scroll to details panel (anti-pattern)
          var $details = $('#flight-details');
          if ($details.length) {
            $('html, body').animate({ scrollTop: $details.offset().top - 20 }, 400);
          }
          $rootScope.$broadcast('flight:selected', flight);
        };

        // --- Book selected flight ---
        $scope.bookFlight = function() {
          if (!$scope.selectedFlight) return;

          $scope.isLoading = true;

          FlightSearchService.bookFlight($scope.selectedFlight.id, {
            passengers: $scope.searchParams.passengers,
            cabinClass: $scope.searchParams.cabinClass
          }).then(function(booking) {
            $rootScope.$broadcast('notification:add', 'Flight booked successfully! Confirmation: ' + booking.confirmationCode, 'success');
            $rootScope.$broadcast('itinerary:refresh');
            $scope.selectedFlight.booked = true;
          }).catch(function(err) {
            $rootScope.$broadcast('notification:add', 'Booking failed. Please try again.', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Format helpers using Moment.js ---
        $scope.formatDuration = function(minutes) {
          var duration = moment.duration(minutes, 'minutes');
          return Math.floor(duration.asHours()) + 'h ' + duration.minutes() + 'm';
        };

        $scope.formatTime = function(time) {
          return moment(time, 'HH:mm').format('h:mm A');
        };

        $scope.formatDate = function(date) {
          return moment(date).format('ddd, MMM D, YYYY');
        };

        // --- Listen for $rootScope events ---
        var deregisterUserChange = $rootScope.$on('auth:login', function(event, user) {
          $scope.searchParams.cabinClass = _.get(user, 'preferences.cabinClass', 'economy');
        });

        // Clean up listeners on destroy
        $scope.$on('$destroy', function() {
          deregisterUserChange();
        });

        // --- Initialise ---
        $scope.initDatepickers();
      }
    ]);
})();
