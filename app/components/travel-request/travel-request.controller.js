/**
 * TravelRequestController
 * Legacy AngularJS controller with $scope, $rootScope events,
 * $watch, jQuery DOM manipulation, Lodash, and Moment.js usage.
 */
(function() {
  'use strict';

  angular.module('globalTravelApp')
    .controller('TravelRequestController', [
      '$scope', '$rootScope', '$timeout', 'TravelRequestService',
      function($scope, $rootScope, $timeout, TravelRequestService) {

        // --- Legacy $scope state ---
        $scope.requests = [];
        $scope.filteredRequests = [];
        $scope.isLoading = false;
        $scope.errorMessage = '';
        $scope.showForm = false;
        $scope.editMode = false;
        $scope.selectedRequest = null;
        $scope.filterStatus = 'all';
        $scope.searchQuery = '';

        $scope.newRequest = _getEmptyRequest();

        $scope.departments = [
          'Engineering', 'Sales', 'Marketing', 'Finance',
          'Human Resources', 'Operations', 'Legal', 'Executive'
        ];

        $scope.travelPurposes = [
          'Client Meeting', 'Conference', 'Training',
          'Team Building', 'Site Visit', 'Vendor Meeting', 'Other'
        ];

        // --- Legacy: $watch on form fields for budget estimation ---
        $scope.$watch('newRequest.estimatedCosts', function(newVal) {
          if (newVal) {
            $scope.newRequest.totalEstimate = _.sum([
              parseFloat(newVal.flights) || 0,
              parseFloat(newVal.hotels) || 0,
              parseFloat(newVal.meals) || 0,
              parseFloat(newVal.transport) || 0,
              parseFloat(newVal.other) || 0
            ]);
          }
        }, true);

        $scope.$watch('newRequest.departDate', function(newVal) {
          if (newVal && $scope.newRequest.returnDate) {
            $scope.newRequest.tripDuration = moment($scope.newRequest.returnDate)
              .diff(moment(newVal), 'days');
          }
        });

        $scope.$watch('newRequest.returnDate', function(newVal) {
          if (newVal && $scope.newRequest.departDate) {
            $scope.newRequest.tripDuration = moment(newVal)
              .diff(moment($scope.newRequest.departDate), 'days');
          }
        });

        // Watch search query and filter status
        $scope.$watchGroup(['searchQuery', 'filterStatus'], function() {
          $scope.applyFilters();
        });

        // --- Legacy: jQuery datepicker initialisation ---
        $scope.initDatepickers = function() {
          $timeout(function() {
            $('#trDepartDate').datepicker({
              minDate: 0,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.newRequest.departDate = new Date(dateText);
                });
              }
            });
            $('#trReturnDate').datepicker({
              minDate: 1,
              dateFormat: 'mm/dd/yy',
              onSelect: function(dateText) {
                $scope.$apply(function() {
                  $scope.newRequest.returnDate = new Date(dateText);
                });
              }
            });
          }, 0);
        };

        // --- Load requests ---
        $scope.loadRequests = function() {
          $scope.isLoading = true;
          $scope.errorMessage = '';

          TravelRequestService.getRequests().then(function(requests) {
            $scope.requests = requests;
            $scope.applyFilters();
          }).catch(function(err) {
            $scope.errorMessage = 'Failed to load travel requests.';
            $rootScope.$broadcast('notification:add', 'Failed to load requests', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Apply filters with Lodash ---
        $scope.applyFilters = function() {
          var filtered = _.clone($scope.requests);

          if ($scope.filterStatus !== 'all') {
            filtered = _.filter(filtered, { status: $scope.filterStatus });
          }

          if ($scope.searchQuery) {
            var query = $scope.searchQuery.toLowerCase();
            filtered = _.filter(filtered, function(req) {
              return req.destination.toLowerCase().indexOf(query) > -1 ||
                     req.purpose.toLowerCase().indexOf(query) > -1 ||
                     req.travelerName.toLowerCase().indexOf(query) > -1;
            });
          }

          // Sort by most recent first
          $scope.filteredRequests = _.orderBy(filtered, ['createdAt'], ['desc']);
        };

        // --- Toggle form ---
        $scope.toggleForm = function() {
          $scope.showForm = !$scope.showForm;
          $scope.editMode = false;
          $scope.newRequest = _getEmptyRequest();

          if ($scope.showForm) {
            // jQuery scroll & animation (anti-pattern)
            $timeout(function() {
              $('#travel-request-form').hide().slideDown(300);
              $scope.initDatepickers();
            }, 0);
          }
        };

        // --- Edit existing request ---
        $scope.editRequest = function(request) {
          $scope.editMode = true;
          $scope.showForm = true;
          $scope.newRequest = angular.copy(request);
          $scope.newRequest.departDate = moment(request.departDate).toDate();
          $scope.newRequest.returnDate = moment(request.returnDate).toDate();

          $timeout(function() {
            var $form = $('#travel-request-form');
            if ($form.length) {
              $('html, body').animate({ scrollTop: $form.offset().top - 20 }, 400);
            }
            $scope.initDatepickers();
          }, 0);
        };

        // --- Submit request ---
        $scope.submitRequest = function() {
          if (!$scope.validateRequest()) return;

          $scope.isLoading = true;

          var requestData = angular.copy($scope.newRequest);
          requestData.departDate = moment(requestData.departDate).format('YYYY-MM-DD');
          requestData.returnDate = moment(requestData.returnDate).format('YYYY-MM-DD');
          requestData.submittedAt = moment().toISOString();
          requestData.travelerName = $rootScope.currentUser ? $rootScope.currentUser.name : 'Demo User';
          requestData.travelerEmail = $rootScope.currentUser ? $rootScope.currentUser.email : 'demo@globaltravel.com';

          var promise;
          if ($scope.editMode) {
            promise = TravelRequestService.updateRequest(requestData.id, requestData);
          } else {
            promise = TravelRequestService.submitRequest(requestData);
          }

          promise.then(function(result) {
            var msg = $scope.editMode ? 'Travel request updated' : 'Travel request submitted';
            $rootScope.$broadcast('notification:add', msg + ' successfully!', 'success');
            $scope.showForm = false;
            $scope.editMode = false;
            $scope.newRequest = _getEmptyRequest();
            $scope.loadRequests();
          }).catch(function(err) {
            $scope.errorMessage = 'Failed to submit request. Please try again.';
            $rootScope.$broadcast('notification:add', 'Request submission failed', 'error');
          }).finally(function() {
            $scope.isLoading = false;
          });
        };

        // --- Validate form ---
        $scope.validateRequest = function() {
          $scope.errorMessage = '';

          if (!$scope.newRequest.destination) {
            $scope.errorMessage = 'Destination is required.';
            // jQuery highlight (anti-pattern)
            $('#destinationField').addClass('has-error');
            return false;
          }
          if (!$scope.newRequest.departDate || !$scope.newRequest.returnDate) {
            $scope.errorMessage = 'Travel dates are required.';
            return false;
          }
          if (moment($scope.newRequest.returnDate).isBefore(moment($scope.newRequest.departDate))) {
            $scope.errorMessage = 'Return date must be after departure date.';
            return false;
          }
          if (!$scope.newRequest.purpose) {
            $scope.errorMessage = 'Travel purpose is required.';
            return false;
          }
          if (!$scope.newRequest.department) {
            $scope.errorMessage = 'Department is required.';
            return false;
          }
          if ($scope.newRequest.totalEstimate <= 0) {
            $scope.errorMessage = 'Please provide cost estimates.';
            return false;
          }
          return true;
        };

        // --- Cancel request ---
        $scope.cancelRequest = function(request) {
          if (!confirm('Are you sure you want to cancel this travel request?')) return;

          TravelRequestService.cancelRequest(request.id).then(function() {
            request.status = 'cancelled';
            $rootScope.$broadcast('notification:add', 'Travel request cancelled', 'warning');
          }).catch(function() {
            $rootScope.$broadcast('notification:add', 'Failed to cancel request', 'error');
          });
        };

        // --- View request details ---
        $scope.viewRequest = function(request) {
          $scope.selectedRequest = request;
          // jQuery modal (anti-pattern)
          $('#requestDetailModal').modal('show');
        };

        // --- Format helpers ---
        $scope.formatDate = function(date) {
          return moment(date).format('MMM D, YYYY');
        };

        $scope.getStatusClass = function(status) {
          switch (status) {
            case 'approved': return 'label-success';
            case 'pending': return 'label-warning';
            case 'rejected': return 'label-danger';
            case 'cancelled': return 'label-default';
            default: return 'label-info';
          }
        };

        $scope.getStatusCounts = function() {
          return {
            all: $scope.requests.length,
            pending: _.filter($scope.requests, { status: 'pending' }).length,
            approved: _.filter($scope.requests, { status: 'approved' }).length,
            rejected: _.filter($scope.requests, { status: 'rejected' }).length
          };
        };

        // --- Private helpers ---
        function _getEmptyRequest() {
          return {
            destination: '',
            departDate: null,
            returnDate: null,
            purpose: '',
            department: '',
            justification: '',
            tripDuration: 0,
            totalEstimate: 0,
            estimatedCosts: {
              flights: 0,
              hotels: 0,
              meals: 0,
              transport: 0,
              other: 0
            },
            travelers: [{ name: '', email: '' }],
            needsVisa: false,
            needsInsurance: true,
            notes: ''
          };
        }

        // --- Listen for $rootScope events ---
        var deregLogin = $rootScope.$on('auth:login', function() {
          $scope.loadRequests();
        });

        $scope.$on('$destroy', function() {
          deregLogin();
        });

        // --- Initialise ---
        $scope.loadRequests();
      }
    ]);
})();
