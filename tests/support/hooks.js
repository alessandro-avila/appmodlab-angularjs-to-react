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
const TravelRequestPage = require('../pages/travel-request.page');
const { ExpensePage } = require('../pages/expense.page');

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
  this.travelRequests = new TravelRequestPage(this.page);
  this.expenses = new ExpensePage(this.page);
  this.memory = this.memory || {};
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

/**
 * Travel requests live in the same kind of mutable array, and three things
 * leak: a submitted request is appended for good, editing a seeded one
 * overwrites it in place, and — because the API merges with Object.assign — an
 * edit can add a field (travelerName) that the seed never had and that no
 * later PUT can remove. So the seeded requests are not patched back, they are
 * deleted and rebuilt from the exact bodies in api-mock/server.js.
 *
 * The POST route merges the request body over its defaults, so it will honour
 * an id supplied here. That is used for SETUP ONLY — no scenario relies on it.
 */
const REQUEST_DEFAULTS = [
  {
    id: 'tr-1',
    userId: 1,
    destination: 'London, UK',
    departDate: '2024-05-01',
    returnDate: '2024-05-05',
    purpose: 'Client onboarding meetings',
    department: 'Engineering',
    justification: 'Need to meet with new enterprise client for product integration.',
    estimatedCosts: { flights: 1200, hotels: 800, meals: 300, transport: 150, other: 50 },
    totalEstimate: 2500,
    travelers: [{ name: 'Sarah Johnson', email: 'demo@globaltravel.com' }],
    needsVisa: false,
    needsInsurance: true,
    status: 'pending',
    createdAt: '2024-02-15T10:30:00Z',
    approvals: [{ approver: 'Mike Chen', role: 'Manager', status: 'pending', date: null }]
  },
  {
    id: 'tr-2',
    userId: 1,
    destination: 'Tokyo, Japan',
    departDate: '2024-06-10',
    returnDate: '2024-06-17',
    purpose: 'Partner conference and site visit',
    department: 'Engineering',
    justification: 'Annual partner conference attendance required by agreement.',
    estimatedCosts: { flights: 2000, hotels: 1400, meals: 500, transport: 300, other: 200 },
    totalEstimate: 4400,
    travelers: [
      { name: 'Sarah Johnson', email: 'demo@globaltravel.com' },
      { name: 'Alex Rivera', email: 'alex@globaltravel.com' }
    ],
    needsVisa: true,
    needsInsurance: true,
    status: 'approved',
    createdAt: '2024-01-20T14:00:00Z',
    approvals: [
      { approver: 'Mike Chen', role: 'Manager', status: 'approved', date: '2024-01-22T09:15:00Z' },
      { approver: 'VP Finance', role: 'VP', status: 'approved', date: '2024-01-25T11:30:00Z' }
    ]
  }
];

/**
 * Expense reports leak the same way: submit appends for good, delete removes a
 * seed for good. There is no PUT caller here, so nothing mutates a seed in
 * place — but the delete scenarios remove exp-2 outright, so the seeds are
 * rebuilt wholesale rather than patched. Bound to EVERY expense scenario, for
 * the same reason as travel requests: the read-only ones assert on the seeded
 * figures and need them intact.
 */
const EXPENSE_DEFAULTS = [
  {
    id: 'exp-1',
    userId: 1,
    title: 'NYC Business Trip Expenses',
    tripDestination: 'New York',
    travelRequestId: null,
    status: 'pending',
    submittedAt: '2024-03-20T10:00:00Z',
    submittedBy: 'Sarah Johnson',
    totalAmount: 1875.50,
    expenses: [
      { id: 'e-1', date: '2024-03-15', category: 'flights', description: 'SFO to JFK round trip', amount: 930.00, currency: 'USD', notes: '' },
      { id: 'e-2', date: '2024-03-15', category: 'hotels', description: 'Grand Hyatt - 3 nights', amount: 750.00, currency: 'USD', notes: 'Corporate rate applied' },
      { id: 'e-3', date: '2024-03-16', category: 'meals', description: 'Client dinner at Nobu', amount: 145.50, currency: 'USD', notes: 'With client team' },
      { id: 'e-4', date: '2024-03-17', category: 'transport', description: 'Uber rides', amount: 50.00, currency: 'USD', notes: '' }
    ]
  },
  {
    id: 'exp-2',
    userId: 1,
    title: 'Q1 Miscellaneous',
    tripDestination: 'Local',
    travelRequestId: null,
    status: 'draft',
    submittedAt: null,
    submittedBy: 'Sarah Johnson',
    totalAmount: 250.00,
    expenses: [
      { id: 'e-5', date: '2024-02-10', category: 'other', description: 'Office supplies for remote work', amount: 150.00, currency: 'USD', notes: '' },
      { id: 'e-6', date: '2024-02-20', category: 'meals', description: 'Team lunch', amount: 100.00, currency: 'USD', notes: 'Team building event' }
    ]
  }
];

const API_ROOT = 'http://localhost:3000/api';

async function restoreItineraryFixture() {
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

async function restoreRequestFixture(headers) {
  const res = await fetch(`${API_ROOT}/travel-requests`, { headers });
  if (!res.ok) throw new Error(`could not read travel requests: HTTP ${res.status}`);
  const current = await res.json();

  for (const request of current) {
    const gone = await fetch(`${API_ROOT}/travel-requests/${request.id}`, {
      method: 'DELETE',
      headers
    });
    if (!gone.ok) throw new Error(`could not remove ${request.id}: HTTP ${gone.status}`);
  }

  for (const request of REQUEST_DEFAULTS) {
    const made = await fetch(`${API_ROOT}/travel-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });
    if (!made.ok) throw new Error(`could not rebuild ${request.id}: HTTP ${made.status}`);
  }
}

async function restoreExpenseFixture(headers) {
  const res = await fetch(`${API_ROOT}/expense-reports`, { headers });
  if (!res.ok) throw new Error(`could not read expense reports: HTTP ${res.status}`);
  const current = await res.json();

  for (const report of current) {
    const gone = await fetch(`${API_ROOT}/expense-reports/${report.id}`, { method: 'DELETE', headers });
    if (!gone.ok) throw new Error(`could not remove ${report.id}: HTTP ${gone.status}`);
  }

  for (const report of EXPENSE_DEFAULTS) {
    const made = await fetch(`${API_ROOT}/expense-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(report)
    });
    if (!made.ok) throw new Error(`could not rebuild ${report.id}: HTTP ${made.status}`);
  }
}

async function restoreExpenses() {
  await restoreExpenseFixture({
    'Content-Type': 'application/json',
    Authorization: ['Bearer', authToken].join(' ')
  });
}

async function restoreFixture() {
  await restoreItineraryFixture();
  await restoreRequests();
}

/**
 * Rebuilt for EVERY travel-request scenario, not just the ones that write.
 * Read-only scenarios assert on the seeded values, so they need the fixture as
 * clean as the ones that mutate it — the lesson already learned on the
 * itinerary, where an untagged scenario starved a later one.
 */
async function restoreRequests() {
  await restoreRequestFixture({
    'Content-Type': 'application/json',
    Authorization: ['Bearer', authToken].join(' ')
  });
}

Before({ tags: '@feature-travel-request' }, restoreRequests);
After({ tags: '@feature-travel-request' }, restoreRequests);

Before({ tags: '@feature-expense-reconciliation' }, restoreExpenses);
After({ tags: '@feature-expense-reconciliation' }, restoreExpenses);

Before({ tags: '@mutates-fixture' }, restoreFixture);
After({ tags: '@mutates-fixture' }, restoreFixture);

After(async function (scenario) {
  if (scenario.result && scenario.result.status === Status.FAILED && this.page) {
    const shot = await this.page.screenshot({ fullPage: true });
    this.attach(shot, 'image/png');
  }
  if (this.context) await this.context.close();
});
