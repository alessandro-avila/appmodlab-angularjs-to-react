/**
 * Cucumber configuration for the Track A green baseline.
 *
 * These suites run against the LEGACY AngularJS application served on :8080
 * with the mock API on :3000. They are a snapshot of current behaviour —
 * nothing under app/ is expected to change to make them pass.
 */
module.exports = {
  default: {
    require: ['tests/support/**/*.js', 'tests/steps/**/*.js'],
    paths: ['specs/features/*.feature'],
    format: ['progress', 'summary'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
    timeout: 60000
  }
};
