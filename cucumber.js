/**
 * Cucumber configuration for the Track A green baseline.
 *
 * WHAT THESE SUITES RUN AGAINST HAS CHANGED, AND THE TAG HAS NOT.
 *
 * They were captured against the LEGACY AngularJS application on :8080 with
 * the mock API on :3000, as a snapshot of behaviour that nothing under `app/`
 * was expected to change. Six increments later they run against the REACT
 * application on :5173, with the same mock API, and `app/` no longer exists
 * (ADR-023).
 *
 * `@existing-behavior` is retained on every scenario deliberately. It is the
 * record of what the 2016 application did, and the fact that these scenarios
 * still pass — unedited except where a recorded decision authorised a change,
 * each one annotated with the ADR that authorised it — is the evidence the
 * migration preserved behaviour.
 *
 * Scenarios carrying an `@inc-N` tag are the exception: those are the
 * migration's own contract, either superseding a baseline scenario or adding
 * net-new behaviour.
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
