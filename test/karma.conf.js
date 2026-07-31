/**
 * GlobalTravel Corp - Karma Configuration
 * Legacy test runner setup for AngularJS 1.6.x
 */
var fs = require('fs');

// Chromium needs different flags inside a container than on a developer laptop:
//   --no-sandbox            Chrome refuses to start as root, and the setuid
//                           sandbox is unavailable in most container runtimes.
//   --disable-dev-shm-usage Docker gives /dev/shm only 64MB by default, which
//                           makes Chrome crash mid-run. This writes to /tmp.
//   --disable-gpu           No GPU in a container; avoids a noisy fallback.
// Detected via /.dockerenv (present in every Docker container) because the
// CODESPACES / REMOTE_CONTAINERS vars are only injected by VS Code at runtime.
var inContainer = !!(process.env.CODESPACES || process.env.REMOTE_CONTAINERS ||
  process.env.DEVCONTAINER || process.env.CI || fs.existsSync('/.dockerenv'));

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

    customLaunchers: {
      ChromeHeadlessContainer: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      }
    },

    browsers: [inContainer ? 'ChromeHeadlessContainer' : 'ChromeHeadless'],

    singleRun: !!process.env.CI,

    concurrency: Infinity
  });
};
