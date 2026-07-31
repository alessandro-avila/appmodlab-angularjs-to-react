/**
 * ItineraryController
 * Legacy AngularJS controller with $scope, $rootScope events,
 * $watch, jQuery DOM manipulation, Lodash, and Moment.js usage.
 */
(function() {
  'use strict';

  angular.module('globalTravelApp')
    .controller('ItineraryController', [
      '$scope', '$rootScope', '$timeout', '$filter', 'ItineraryService',
      function($scope, $rootScope, $timeout, $filter, ItineraryService) {

        // --- Legacy $scope state ---
        $scope.itinerary = null;
        $scope.trips = [];
        $scope.selectedTrip = null;
        $scope.isLoading = false;
        $scope.errorMessage = '';
        $scope.viewMode = 'list'; // 'list' or 'timeline'
        $scope.filterStatus = 'all';

        $scope.newNote = '';
        $scope.editingItem = null;

        // --- Load trips on init ---
        $scope.loadTrips = function() {
          $scope.isLoading = true;
          $scope.errorMessage = '';

          ItineraryService.getTrips().then(function(trips) {
            $scope.trips = _.map(trips, function(trip) {
              trip.startFormatted = moment(trip.startDate).format('MMM D, YYYY');
              trip.endFormatted = moment(trip.endDate).format('MMM D, YYYY');
              trip.daysUntil = moment(trip.startDate).diff(moment(), 'days');
              trip.duration = moment(trip.endDate).diff(moment(trip.startDate), 'days');
              trip.status = _getTripStatus(trip);
              return trip;
            });

            // Sort by nearest trip first
            $scope.trips = _.orderBy($scope.trips, ['startDate'], ['asc']);

            if ($scope.trips.length > 0 && !$scope.selectedTrip) {
              $scope.selectTrip($scope.trips[0]);
            }
          }).catch(function(err) {
            $scope.errorMessage = 'Failed to load trips. Please try again.';
            $rootScope.$broadcast('notification:add', 'Failed to load itinerary', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Select trip and load details ---
        $scope.selectTrip = function(trip) {
          $scope.selectedTrip = trip;
          $scope.isLoading = true;

          ItineraryService.getTripDetails(trip.id).then(function(details) {
            $scope.itinerary = details;

            // Group items by day using Lodash
            $scope.itinerary.dayGroups = _.groupBy(details.items, function(item) {
              return moment(item.date).format('YYYY-MM-DD');
            });

            // Convert to array of { date, items } sorted by date
            $scope.itinerary.days = _.map(_.keys($scope.itinerary.dayGroups), function(date) {
              return {
                date: date,
                dateFormatted: moment(date).format('dddd, MMMM D'),
                dayNumber: moment(date).diff(moment(trip.startDate), 'days') + 1,
                items: _.sortBy($scope.itinerary.dayGroups[date], 'time')
              };
            });
            $scope.itinerary.days = _.sortBy($scope.itinerary.days, 'date');

            $scope.calculateTotals();

            // jQuery scroll (anti-pattern)
            var $details = $('#itinerary-details');
            if ($details.length) {
              $('html, body').animate({ scrollTop: $details.offset().top - 20 }, 400);
            }
          }).catch(function(err) {
            $scope.errorMessage = 'Failed to load trip details.';
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Calculate trip totals with Lodash ---
        $scope.calculateTotals = function() {
          if (!$scope.itinerary || !$scope.itinerary.items) return;

          var items = $scope.itinerary.items;
          $scope.itinerary.totals = {
            flights: _.sumBy(_.filter(items, { type: 'flight' }), 'cost'),
            hotels: _.sumBy(_.filter(items, { type: 'hotel' }), 'cost'),
            activities: _.sumBy(_.filter(items, { type: 'activity' }), 'cost'),
            transport: _.sumBy(_.filter(items, { type: 'transport' }), 'cost')
          };
          $scope.itinerary.totals.total = _.sum(_.values($scope.itinerary.totals));
        };

        // --- Legacy: $watch on filter ---
        $scope.$watch('filterStatus', function(newVal) {
          if ($scope.itinerary && $scope.itinerary.days) {
            $scope.getFilteredDays();
          }
        });

        $scope.getFilteredDays = function() {
          if ($scope.filterStatus === 'all') {
            $scope.displayDays = $scope.itinerary.days;
          } else {
            $scope.displayDays = _.filter($scope.itinerary.days, function(day) {
              return _.some(day.items, { status: $scope.filterStatus });
            });
          }
          return $scope.displayDays;
        };

        // --- Toggle view mode with jQuery animation ---
        $scope.toggleView = function(mode) {
          $scope.viewMode = mode;
          // jQuery animation (anti-pattern)
          $timeout(function() {
            if (mode === 'timeline') {
              $('.itinerary-timeline').hide().fadeIn(300);
            } else {
              $('.itinerary-list').hide().fadeIn(300);
            }
          }, 0);
        };

        // --- Add note to itinerary item ---
        $scope.addNote = function(item) {
          if (!$scope.newNote.trim()) return;

          ItineraryService.addNote(item.id, $scope.newNote).then(function(note) {
            if (!item.notes) item.notes = [];
            item.notes.push({
              text: $scope.newNote,
              createdAt: moment().format('MMM D, YYYY h:mm A'),
              author: $rootScope.currentUser ? $rootScope.currentUser.name : 'You'
            });
            $scope.newNote = '';
            $rootScope.$broadcast('notification:add', 'Note added', 'success');
          }).catch(function() {
            $rootScope.$broadcast('notification:add', 'Failed to add note', 'error');
          });
        };

        // --- Cancel / remove itinerary item ---
        $scope.cancelItem = function(item) {
          if (!confirm('Are you sure you want to cancel this item?')) return;

          ItineraryService.cancelItem(item.id).then(function() {
            item.status = 'cancelled';
            $scope.calculateTotals();
            $rootScope.$broadcast('notification:add', item.type + ' cancelled', 'warning');
          }).catch(function() {
            $rootScope.$broadcast('notification:add', 'Failed to cancel item', 'error');
          });
        };

        // --- Print itinerary (jQuery) ---
        $scope.printItinerary = function() {
          // jQuery clone for print (anti-pattern)
          var printContent = $('#itinerary-details').clone();
          printContent.find('.btn, .no-print').remove();
          var printWindow = window.open('', '_blank');
          printWindow.document.write('<html><head><title>Itinerary</title>');
          printWindow.document.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">');
          printWindow.document.write('</head><body class="container">');
          printWindow.document.write(printContent.html());
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
        };

        // --- Format helpers ---
        $scope.formatDate = function(date) {
          return moment(date).format('ddd, MMM D, YYYY');
        };

        $scope.formatTime = function(time) {
          return moment(time, 'HH:mm').format('h:mm A');
        };

        $scope.getItemIcon = function(type) {
          switch (type) {
            case 'flight': return 'glyphicon-plane';
            case 'hotel': return 'glyphicon-bed';
            case 'activity': return 'glyphicon-flag';
            case 'transport': return 'glyphicon-road';
            default: return 'glyphicon-map-marker';
          }
        };

        $scope.getStatusLabel = function(status) {
          switch (status) {
            case 'confirmed': return 'label-success';
            case 'pending': return 'label-warning';
            case 'cancelled': return 'label-danger';
            default: return 'label-default';
          }
        };

        // --- Private helpers ---
        function _getTripStatus(trip) {
          var now = moment();
          var start = moment(trip.startDate);
          var end = moment(trip.endDate);
          if (now.isBefore(start)) return 'upcoming';
          if (now.isAfter(end)) return 'completed';
          return 'active';
        }

        // --- Listen for itinerary refresh from other components ---
        var deregRefresh = $rootScope.$on('itinerary:refresh', function() {
          $scope.loadTrips();
        });

        $scope.$on('$destroy', function() {
          deregRefresh();
        });

        // --- Initialise ---
        $scope.loadTrips();
      }
    ]);
})();
