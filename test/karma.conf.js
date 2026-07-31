/**
 * GlobalTravel Corp - Karma Configuration
 * Legacy test runner setup for AngularJS 1.6.x
 */
module.exports = function(config) {
  config.set({
    basePath: '../',

    frameworks: ['jasmine'],

    files: [
      // Bower dependencies
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/jquery-ui/jquery-ui.min.js',
      'bower_components/lodash/dist/lodash.min.js',
      'bower_components/moment/min/moment.min.js',
      'bower_components/angular/angular.min.js',
      'bower_components/angular-ui-router/release/angular-ui-router.min.js',
      'bower_components/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
      'bower_components/restangular/dist/restangular.min.js',
      'bower_components/angular-mocks/angular-mocks.js',

      // Application files
      'app/app.js',
      'app/app.routes.js',
      'app/services/**/*.js',
      'app/components/**/*.js',
      'app/directives/**/*.js',
      'app/filters/**/*.js',

      // Test specs
      'test/spec/**/*.spec.js'
    ],

    exclude: [],

    preprocessors: {},

    reporters: ['progress'],

    port: 9876,

    colors: true,

    logLevel: config.LOG_INFO,

    autoWatch: !process.env.CI,

    browsers: ['ChromeHeadless'],

    singleRun: !!process.env.CI,

    concurrency: Infinity
  });
};
