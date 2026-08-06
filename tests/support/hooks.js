/**
 * Lifecycle hooks for the green baseline.
 *
 * The login screen of the legacy app is a single "Enter Portal" button that
 * writes a JWT into localStorage (there is no credential form — see ADR-002
 * Q-8). We click it once, capture the resulting storage state, and start every
 * scenario from it.
 */
const fs = require('fs');
const path = require('path');
const { BeforeAll, AfterAll, Before, After, Status } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { BASE_URL } = require('./world');
const FlightSearchPage = require('../pages/flight-search.page');
const HotelBookingPage = require('../pages/hotel-booking.page');
const ItineraryPage = require('../pages/itinerary.page');

const AUTH_STATE = path.join(__dirname, '..', '.auth', 'state.json');
const HEADED = process.env.BASELINE_HEADED === '1';

let browser;
let authToken;

BeforeAll({ timeout: 120 * 1000 }, async function () {
  browser = await chromium.launch({ headless: !HEADED });

  // Authenticate once and persist the state for every scenario to reuse.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Enter Portal' }).click();
  await page.waitForURL(/#!\/dashboard/, { timeout: 15000 });
  await page.waitForFunction(() => !!localStorage.getItem('authToken'), null, { timeout: 15000 });
  authToken = await page.evaluate(() => localStorage.getItem('authToken'));

  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });
  await context.storageState({ path: AUTH_STATE });
  await context.close();
});

AfterAll(async function () {
  if (browser) await browser.close();
});

Before(async function () {
  this.context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 720 }
  });
  this.page = await this.context.newPage();
  this.consoleErrors = [];
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') this.consoleErrors.push(msg.text());
  });
  // Some scenarios need to know what the browser asked the API for — whether a
  // filter triggered a fresh search, and what a booking actually sent.
  this.requests = [];
  this.page.on('request', (req) => {
    this.requests.push({ method: req.method(), url: req.url(), postData: req.postData() });
  });
  this.flights = new FlightSearchPage(this.page);
  this.hotels = new HotelBookingPage(this.page);
  this.itinerary = new ItineraryPage(this.page);
});

/**
 * The mock API keeps trips in a mutable module-level array, so cancelling an
 * itinerary item survives for the life of the server process and would leak
 * into every later scenario — and into the next run. Scenarios that cancel are
 * tagged @mutates-fixture; the fixture is put back both before and after, so a
 * run that dies half way through still leaves the next one a clean slate.
 *
 * This restores DATA through the app's own API. Nothing under app/ is touched.
 */
const FIXTURE_DEFAULTS = [{ id: 'item-4', status: 'pending' }];

async function restoreFixture() {
  for (const item of FIXTURE_DEFAULTS) {
    const res = await fetch(`http://localhost:3000/api/itinerary-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status: item.status })
    });
    if (!res.ok) {
      throw new Error(`could not restore ${item.id}: HTTP ${res.status}`);
    }
  }
}

Before({ tags: '@mutates-fixture' }, restoreFixture);
After({ tags: '@mutates-fixture' }, restoreFixture);

After(async function (scenario) {
  if (scenario.result && scenario.result.status === Status.FAILED && this.page) {
    const shot = await this.page.screenshot({ fullPage: true });
    this.attach(shot, 'image/png');
  }
  if (this.context) await this.context.close();
});
