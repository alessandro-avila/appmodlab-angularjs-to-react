/**
 * GlobalTravel Corp - UI-Router Configuration
 */
(function() {
  'use strict';

  angular.module('globalTravelApp')
    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
      
      $urlRouterProvider.otherwise('/login');

      $stateProvider
        .state('login', {
          url: '/login',
          template: '<div class="container"><h2>Login</h2><p>Mock login - click to enter</p><button ng-click="enter()">Enter Portal</button></div>',
          controller: ['$scope', '$state', 'AuthService', function($scope, $state, AuthService) {
            $scope.enter = function() {
              // login() is async — wait for the token before changing state,
              // otherwise the requireAuth guard bounces back to /login.
              AuthService.login('demo@globaltravel.com', 'password')
                .then(function() {
                  $state.go('dashboard');
                });
            };
          }]
        })
        .state('dashboard', {
          url: '/dashboard',
          template: '<div class="container"><h1>GlobalTravel Corp Portal</h1><ul><li><a ui-sref="flights">Search Flights</a></li><li><a ui-sref="hotels">Book Hotels</a></li><li><a ui-sref="itinerary">Manage Itinerary</a></li><li><a ui-sref="travelRequest">Submit Travel Request</a></li><li><a ui-sref="expenses">Expense Reconciliation</a></li></ul></div>',
          data: { requireAuth: true }
        })
        .state('travelRequest', {
          url: '/travel-request',
          templateUrl: 'components/travel-request/travel-request.template.html',
          controller: 'TravelRequestController',
          data: { requireAuth: true }
        })
        .state('expenses', {
          url: '/expenses',
          templateUrl: 'components/expense-reconciliation/expense.template.html',
          controller: 'ExpenseController',
          data: { requireAuth: true }
        });
    }]);
})();
