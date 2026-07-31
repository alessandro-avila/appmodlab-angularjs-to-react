/**
 * HotelBookingController
 * Legacy AngularJS controller with $scope, $rootScope events,
 * $watch, jQuery DOM manipulation, Lodash, and Moment.js usage.
 */
(function() {
  'use strict';

  angular.module('globalTravelApp')
    .controller('HotelBookingController', [
      '$scope', '$rootScope', '$timeout', '$filter', 'HotelBookingService',
      function($scope, $rootScope, $timeout, $filter, HotelBookingService) {

        // --- Legacy $scope state ---
        $scope.searchParams = {
          city: '',
          checkIn: null,
          checkOut: null,
          guests: 1,
          rooms: 1
        };

        $scope.hotels = [];
        $scope.filteredHotels = [];
        $scope.selectedHotel = null;
        $scope.selectedRoom = null;
        $scope.isLoading = false;
        $scope.hasSearched = false;
        $scope.errorMessage = '';
        $scope.bookingConfirmation = null;

        $scope.filters = {
          minRating: 0,
          maxPrice: 1000,
          amenities: [],
          sortBy: 'recommended'
        };

        $scope.availableAmenities = [
          'WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant',
          'Parking', 'Airport Shuttle', 'Business Center'
        ];

        // --- Legacy: $watch for date validation ---
        $scope.$watch('searchParams.checkIn', function(newVal) {
          if (newVal) {
            var checkIn = moment(newVal);
            var checkOut = moment($scope.searchParams.checkOut);
            if (!$scope.searchParams.checkOut || checkIn.isSameOrAfter(checkOut)) {
              $scope.searchParams.checkOut = checkIn.add(1, 'days').toDate();
            }
            $scope.nightCount = _calculateNights();
          }
        });

        $scope.$watch('searchParams.checkOut', function(newVal) {
          if (newVal) {
            $scope.nightCount = _calculateNights();
          }
        });

        // Deep watch on filters
        $scope.$watch('filters', function() {
          if ($scope.hasSearched) {
            $scope.applyFilters();
          }
        }, true);

        // --- Legacy: jQuery DOM manipulation ---
        $scope.initDatepickers = function() {
          $timeout(function() {
            $('#hotelCheckIn').datepicker({
              minDate: 0,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.searchParams.checkIn = new Date(dateText);
                });
              }
            });
            $('#hotelCheckOut').datepicker({
              minDate: 1,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.searchParams.checkOut = new Date(dateText);
                });
              }
            });
          }, 0);
        };

        // --- Search hotels ---
        $scope.searchHotels = function() {
          if (!$scope.searchParams.city) {
            $scope.errorMessage = 'Please enter a city.';
            $('#cityInput').addClass('has-error').delay(3000).queue(function() {
              $(this).removeClass('has-error').dequeue();
            });
            return;
          }
          if (!$scope.searchParams.checkIn || !$scope.searchParams.checkOut) {
            $scope.errorMessage = 'Please select check-in and check-out dates.';
            return;
          }

          $scope.isLoading = true;
          $scope.errorMessage = '';
          $scope.hasSearched = true;
          $scope.selectedHotel = null;
          $scope.selectedRoom = null;

          var params = {
            city: $scope.searchParams.city,
            checkIn: moment($scope.searchParams.checkIn).format('YYYY-MM-DD'),
            checkOut: moment($scope.searchParams.checkOut).format('YYYY-MM-DD'),
            guests: $scope.searchParams.guests,
            rooms: $scope.searchParams.rooms
          };

          HotelBookingService.searchHotels(params).then(function(results) {
            $scope.hotels = results;
            $scope.applyFilters();
            $rootScope.$broadcast('notification:add', 'Found ' + results.length + ' hotels in ' + params.city, 'success');
          }).catch(function(err) {
            $scope.errorMessage = 'Hotel search failed. Please try again.';
            $rootScope.$broadcast('notification:add', 'Hotel search failed', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Apply filters using Lodash ---
        $scope.applyFilters = function() {
          var filtered = _.clone($scope.hotels);

          // Filter by rating
          filtered = _.filter(filtered, function(hotel) {
            return hotel.rating >= $scope.filters.minRating;
          });

          // Filter by price
          filtered = _.filter(filtered, function(hotel) {
            return hotel.pricePerNight <= $scope.filters.maxPrice;
          });

          // Filter by amenities
          if ($scope.filters.amenities.length > 0) {
            filtered = _.filter(filtered, function(hotel) {
              return _.every($scope.filters.amenities, function(amenity) {
                return _.includes(hotel.amenities, amenity);
              });
            });
          }

          // Sort
          switch ($scope.filters.sortBy) {
            case 'priceLow':
              filtered = _.sortBy(filtered, 'pricePerNight');
              break;
            case 'priceHigh':
              filtered = _.sortBy(filtered, 'pricePerNight').reverse();
              break;
            case 'rating':
              filtered = _.orderBy(filtered, ['rating'], ['desc']);
              break;
            case 'recommended':
            default:
              filtered = _.orderBy(filtered, ['featured', 'rating'], ['desc', 'desc']);
              break;
          }

          $scope.filteredHotels = filtered;
        };

        // --- Toggle amenity filter ---
        $scope.toggleAmenity = function(amenity) {
          var idx = $scope.filters.amenities.indexOf(amenity);
          if (idx > -1) {
            $scope.filters.amenities.splice(idx, 1);
          } else {
            $scope.filters.amenities.push(amenity);
          }
        };

        $scope.isAmenitySelected = function(amenity) {
          return _.includes($scope.filters.amenities, amenity);
        };

        // --- Select hotel & view rooms ---
        $scope.selectHotel = function(hotel) {
          $scope.selectedHotel = hotel;
          $scope.selectedRoom = null;
          $scope.isLoading = true;

          HotelBookingService.getHotelRooms(hotel.id, {
            checkIn: moment($scope.searchParams.checkIn).format('YYYY-MM-DD'),
            checkOut: moment($scope.searchParams.checkOut).format('YYYY-MM-DD')
          }).then(function(rooms) {
            $scope.selectedHotel.rooms = rooms;
            // jQuery scroll (anti-pattern)
            var $rooms = $('#hotel-rooms');
            if ($rooms.length) {
              $('html, body').animate({ scrollTop: $rooms.offset().top - 20 }, 400);
            }
          }).catch(function() {
            $scope.errorMessage = 'Could not load room details.';
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Select room ---
        $scope.selectRoom = function(room) {
          $scope.selectedRoom = room;
        };

        // --- Book hotel room ---
        $scope.bookRoom = function() {
          if (!$scope.selectedHotel || !$scope.selectedRoom) return;

          $scope.isLoading = true;

          var bookingData = {
            hotelId: $scope.selectedHotel.id,
            roomId: $scope.selectedRoom.id,
            checkIn: moment($scope.searchParams.checkIn).format('YYYY-MM-DD'),
            checkOut: moment($scope.searchParams.checkOut).format('YYYY-MM-DD'),
            guests: $scope.searchParams.guests,
            rooms: $scope.searchParams.rooms,
            totalPrice: $scope.selectedRoom.pricePerNight * $scope.nightCount * $scope.searchParams.rooms
          };

          HotelBookingService.bookRoom(bookingData).then(function(confirmation) {
            $scope.bookingConfirmation = confirmation;
            $rootScope.$broadcast('notification:add',
              'Hotel booked! Confirmation: ' + confirmation.confirmationCode, 'success');
            $rootScope.$broadcast('itinerary:refresh');

            // jQuery show confirmation modal (anti-pattern)
            $('#bookingConfirmationModal').modal('show');
          }).catch(function(err) {
            $rootScope.$broadcast('notification:add', 'Hotel booking failed. Please try again.', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Helpers ---
        $scope.getStars = function(rating) {
          return new Array(Math.round(rating));
        };

        $scope.formatCurrency = function(amount) {
          return $filter('currency')(amount, '$', 2);
        };

        function _calculateNights() {
          if ($scope.searchParams.checkIn && $scope.searchParams.checkOut) {
            return moment($scope.searchParams.checkOut).diff(moment($scope.searchParams.checkIn), 'days');
          }
          return 0;
        }

        // --- Listen for $rootScope events ---
        var deregFlightSelected = $rootScope.$on('flight:selected', function(event, flight) {
          $scope.searchParams.city = flight.destination;
          $scope.searchParams.checkIn = moment(flight.departDate).toDate();
          $scope.searchParams.checkOut = moment(flight.departDate).add(3, 'days').toDate();
        });

        $scope.$on('$destroy', function() {
          deregFlightSelected();
        });

        // --- Initialise ---
        $scope.nightCount = 0;
        $scope.initDatepickers();
      }
    ]);
})();
