/**
 * Step definitions for the expense-reconciliation green baseline.
 *
 * Assertions describe what the AngularJS application does today. Several steps
 * deliberately assert a defect (the stuck date filter, the un-dismissable alert,
 * the blank modal fields); each carries a comment saying so, because a future
 * reader must not "fix" the test.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Given, When, Then } = require('@cucumber/cucumber');

const API_ROOT = 'http://localhost:3000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: ['Bearer', token].join(' ') };
}

async function tokenOf(world) {
  return world.page.evaluate(() => localStorage.getItem('authToken'));
}

function splitList(text) {
  return text.split(',').map(s => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------- navigation

Given('I am on the expenses page', async function () {
  await this.expenses.open();
});

// ---------------------------------------------------------------- dashboard

Then('the expense dashboard shows {string} reports', async function (count) {
  assert.strictEqual(await this.expenses.tileValue('Reports'), count);
});

Then('the expense dashboard tile {string} reads {string}', async function (label, value) {
  const actual = await this.expenses.tileValue(label);
  assert.strictEqual(actual, value, `tile "${label}" read "${actual}"`);
});

Then('no stored expense report has the status {string}', async function (status) {
  const reports = await this.expenses.storedReports();
  const offenders = reports.filter(r => r.status === status).map(r => r.title);
  assert.deepStrictEqual(offenders, [], `unexpected ${status} reports: ${offenders.join(', ')}`);
});

Then('the derived top expense category is {string}', async function (category) {
  const dashboard = await this.expenses.dashboard();
  assert.strictEqual(dashboard.topCategory, category);
});

// The controller derives topCategory on every load and no template binds it.
Then('no dashboard tile displays the top expense category', async function () {
  const dashboard = await this.expenses.dashboard();
  const tiles = await this.expenses.dashboardTiles();
  const shown = tiles.some(t => t.value.toLowerCase().includes(String(dashboard.topCategory).toLowerCase()));
  assert.strictEqual(shown, false, 'a tile rendered the top category after all');
});

// ---------------------------------------------------------------- report list

Then('the expense report list contains {string} and {string}', async function (first, second) {
  const titles = await this.expenses.visibleReportTitles();
  assert.ok(titles.includes(first), `missing "${first}" in ${JSON.stringify(titles)}`);
  assert.ok(titles.includes(second), `missing "${second}" in ${JSON.stringify(titles)}`);
});

Then('the expense report list contains exactly {string}', async function (expected) {
  const titles = await this.expenses.visibleReportTitles();
  assert.deepStrictEqual(titles.sort(), splitList(expected).sort());
});

Then('the expense reports appear in the order {string}', async function (expected) {
  const titles = await this.expenses.visibleReportTitles();
  assert.deepStrictEqual(titles, splitList(expected));
});

Then('the expense report row {string} reads:', async function (title, table) {
  const cells = await this.expenses.reportRowCells(title);
  const index = { destination: 1, items: 2, total: 3, status: 4, submitted: 5 };
  for (const [field, expected] of table.raw()) {
    assert.strictEqual(cells[index[field]], expected, `${field} column read "${cells[index[field]]}"`);
  }
});

Then('the expense report row {string} shows the submitted column as {string}', async function (title, expected) {
  const cells = await this.expenses.reportRowCells(title);
  assert.strictEqual(cells[5], expected);
});

Then('the expense report {string} offers the actions {string}', async function (title, expected) {
  const titles = await this.expenses.rowActionTitles(title);
  assert.deepStrictEqual(titles, splitList(expected));
});

Then('no expense reports are listed', async function () {
  assert.deepStrictEqual(await this.expenses.visibleReportIds(), []);
  assert.strictEqual(await this.expenses.emptyStateVisible(), true, 'expected the empty state');
});

Then('the expense empty state invites me to {string}', async function (label) {
  assert.strictEqual(await this.expenses.emptyStateButtonLabel(), label);
});

Then('{int} expense reports are still stored', async function (count) {
  const res = await fetch(`${API_ROOT}/expense-reports`, { headers: authHeaders(await tokenOf(this)) });
  const reports = await res.json();
  assert.strictEqual(reports.length, count);
});

Then('{int} expense report is still stored', async function (count) {
  const res = await fetch(`${API_ROOT}/expense-reports`, { headers: authHeaders(await tokenOf(this)) });
  const reports = await res.json();
  assert.strictEqual(reports.length, count);
});

// ---------------------------------------------------------------- filters

When('I filter expense reports by {string}', async function (status) {
  await this.expenses.filterBy(status);
});

Then('the expense filter is set to {string}', async function (status) {
  assert.strictEqual(await this.expenses.filterStatus(), status);
});

Then('the expense status filter shares the controller scope', async function () {
  const controller = await this.expenses.controllerScopeId();
  const button = await this.expenses.scopeIdOf('.btn-group.btn-group-sm .btn');
  assert.strictEqual(button, controller, 'the filter buttons sit on a child scope');
});

Then('the expense search box shares the controller scope', async function () {
  const controller = await this.expenses.controllerScopeId();
  const box = await this.expenses.scopeIdOf('input[placeholder="Search reports..."]');
  assert.strictEqual(box, controller, 'the search box sits on a child scope');
});

// The Draft button's ng-class names only the unselected state, so selecting it
// removes btn-default and adds nothing. Asserted as observed, not as intended.
Then('the {string} expense filter button carries no highlight class', async function (name) {
  const cls = (await this.expenses.filterButtonClass(name)) || '';
  const highlights = ['btn-primary', 'btn-warning', 'btn-success', 'btn-danger', 'btn-info'];
  const found = highlights.filter(h => cls.split(/\s+/).includes(h));
  assert.deepStrictEqual(found, [], `expected no highlight, class was "${cls}"`);
  assert.strictEqual(cls.split(/\s+/).includes('btn-default'), false, 'btn-default should be stripped');
});

Then('the {string} expense filter button carries a highlight class when selected', async function (name) {
  await this.expenses.filterBy(name);
  const cls = (await this.expenses.filterButtonClass(name)) || '';
  const highlights = ['btn-primary', 'btn-warning', 'btn-success', 'btn-danger'];
  assert.ok(highlights.some(h => cls.split(/\s+/).includes(h)), `class was "${cls}"`);
});

When('I search expense reports for {string}', async function (text) {
  await this.expenses.search(text);
});

Then('the expense search box still reads {string}', async function (text) {
  assert.strictEqual(await this.expenses.searchText(), text);
});

// ---------------------------------------------------------------- date range

When('I set the expense from-date to {string}', async function (value) {
  await this.expenses.setFromDate(value);
});

When('I clear the expense from-date', async function () {
  await this.expenses.setFromDate('');
});

Then('the expense from-date reads {string}', async function (value) {
  assert.strictEqual(await this.expenses.fromDateText(), value);
});

Then('the recorded expense date range is empty', async function () {
  const range = await this.expenses.dateRangeModel();
  assert.ok(!range.start, `start was "${range.start}"`);
  assert.ok(!range.end, `end was "${range.end}"`);
});

Then('the recorded expense date range start is not empty', async function () {
  const range = await this.expenses.dateRangeModel();
  assert.ok(range.start, 'the calendar did not reach the model');
});

Then('clicking the expense from-date opens no calendar', async function () {
  assert.strictEqual(await this.expenses.calendarIsOpenFor('#reportStartDate'), false);
});

Then('clicking the expense from-date opens a calendar', async function () {
  assert.strictEqual(await this.expenses.calendarIsOpenFor('#reportStartDate'), true);
  await this.expenses.closeCalendar();
});

When('I pick the first available day from the expense from-date calendar', async function () {
  await this.expenses.calendarIsOpenFor('#reportStartDate');
  await this.expenses.pickFirstAvailableCalendarDay();
});

// ---------------------------------------------------------------- the form

Then('the new expense report button reads {string}', async function (label) {
  assert.strictEqual(await this.expenses.newReportButtonLabel(), label);
});

When('I start a new expense report', async function () {
  await this.expenses.openForm();
});

When('I cancel the expense report form', async function () {
  await this.expenses.cancelForm();
});

Then('the expense report form is open', async function () {
  assert.strictEqual(await this.expenses.formVisible(), true);
});

Then('the expense report form is closed', async function () {
  assert.strictEqual(await this.expenses.formVisible(), false);
});

When('I name the expense report {string}', async function (title) {
  await this.expenses.fillReportTitle(title);
});

When('I describe the expense trip destination as {string}', async function (destination) {
  await this.expenses.fillDestination(destination);
});

When('I link the expense report to travel request {string}', async function (id) {
  await this.expenses.fillLinkedRequest(id);
});

When('I note {string} on the expense report', async function (note) {
  await this.expenses.fillNotes(note);
});

Then('the expense report title box is empty', async function () {
  assert.strictEqual(await this.expenses.reportTitleText(), '');
});

Then('the expense category dropdown offers {string}', async function (expected) {
  const options = (await this.expenses.categoryOptions()).map(o => o.trim()).filter(o => o !== 'Select...');
  assert.deepStrictEqual(options, splitList(expected));
});

Then('the expense currency dropdown offers {string}', async function (expected) {
  const options = (await this.expenses.currencyOptions()).map(o => o.trim());
  assert.deepStrictEqual(options, splitList(expected));
});

// The dropdown is Title Case; every stored expense uses the server's lowercase
// vocabulary. The two sets do not intersect (FRD Known Limitation 1).
Then('every stored expense line uses a category outside that list', async function () {
  const offered = (await this.expenses.categoryOptions()).map(o => o.trim());
  const res = await fetch(`${API_ROOT}/expense-reports`, { headers: authHeaders(await tokenOf(this)) });
  const reports = await res.json();
  const stored = [];
  reports.forEach(r => (r.expenses || []).forEach(e => stored.push(e.category)));
  assert.ok(stored.length > 0, 'no stored expenses to check');
  const overlap = stored.filter(c => offered.includes(c));
  assert.deepStrictEqual(overlap, [], `these stored categories are offered too: ${overlap.join(', ')}`);
});

// ---------------------------------------------------------------- line items

When('I enter an expense line for {string} costing {string} under category {string}', async function (description, amount, category) {
  await this.expenses.enterLineItem({ description, amount, category });
});

When('I enter an expense line for {string} costing {string} under category {string} in {string}', async function (description, amount, category, currency) {
  await this.expenses.enterLineItem({ description, amount, category, currency });
});

When('I enter an expense line for {string} costing {string}', async function (description, amount) {
  await this.expenses.enterLineItem({ description, amount });
});

When('I add the expense line', async function () {
  await this.expenses.submitLineItem();
});

When('I remove the first expense line', async function () {
  await this.expenses.removeFirstLineItem();
});

Then('the expense report form holds no line items', async function () {
  assert.strictEqual(await this.expenses.lineItemCount(), 0);
});

Then('the expense report form holds {int} line item', async function (count) {
  assert.strictEqual(await this.expenses.lineItemCount(), count);
});

Then('the expense line table shows {int} row', async function (count) {
  assert.strictEqual(await this.expenses.lineItemRowCount(), count);
});

Then('the expense line total is {string}', async function (total) {
  assert.strictEqual(await this.expenses.runningTotal(), Number(total));
});

Then('the expense line total is rendered as {string}', async function (rendered) {
  assert.strictEqual(await this.expenses.renderedTotal(), rendered);
});

// Removing the last item leaves totalAmount stale, because the recompute watch
// is guarded by expenses.length > 0. Observed behaviour, deliberately asserted.
Then('the expense line total is still {string}', async function (total) {
  assert.strictEqual(await this.expenses.runningTotal(), Number(total));
});

Then('the expense line table is hidden', async function () {
  assert.strictEqual(await this.expenses.itemsTableVisible(), false);
});

Then('the expense category breakdown reads {string}', async function (expected) {
  const labels = (await this.expenses.breakdownBarLabels()).map(l => l.trim());
  assert.deepStrictEqual(labels, [expected]);
});

Then('the expense category breakdown has a blank label', async function () {
  const breakdown = await this.expenses.categoryBreakdown();
  assert.ok(Object.prototype.hasOwnProperty.call(breakdown, ''), `keys were ${JSON.stringify(Object.keys(breakdown))}`);
});

Then('the first expense line has no category', async function () {
  const items = await this.expenses.lineItems();
  assert.strictEqual(items[0].category, '');
});

Then('the expense entry fields are cleared', async function () {
  const model = await this.expenses.newExpenseModel();
  assert.strictEqual(model.description, '');
  assert.strictEqual(model.amount, null);
  assert.strictEqual(model.category, '');
});

Then('{int} expense entry fields are flashed', async function (count) {
  assert.strictEqual(await this.expenses.highlightedFieldCount(), count);
});

Then('no expense notification is raised', async function () {
  assert.strictEqual(await this.expenses.notificationCount(), 0);
});

Then('the flashed expense fields are labelled {string}', async function (expected) {
  const labels = (await this.expenses.highlightedFieldLabels()).map(l => l.replace(/\s*\*$/, '').trim());
  assert.deepStrictEqual(labels, splitList(expected));
});

Then('no expense entry field is flashed {int} seconds later', async function (seconds) {
  await this.expenses.settle(seconds * 1000 + 700);
  assert.strictEqual(await this.expenses.highlightedFieldCount(), 0);
});

// ---------------------------------------------------------------- expense date

When('I pick the first available day from the expense date calendar', async function () {
  await this.expenses.calendarIsOpenFor('#expenseDate');
  await this.expenses.pickFirstAvailableCalendarDay();
});

When('I open the expense date calendar', async function () {
  assert.strictEqual(await this.expenses.calendarIsOpenFor('#expenseDate'), true);
});

// onSelect assigns a Date object, which ng-model renders through toString() —
// so the field fills with "Sat Aug 01 2026 00:00:00 GMT+0200 (…)".
Then('the expense date field shows a raw JavaScript date string', async function () {
  const text = await this.expenses.expenseDateFieldText();
  assert.ok(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT/.test(text),
    `expected a JavaScript date string, got "${text}"`);
});

Then('the calendar cannot advance to the next month', async function () {
  assert.strictEqual(await this.expenses.calendarNextMonthDisabled(), true);
});

Then('most days in the expense date calendar are unselectable', async function () {
  const counts = await this.expenses.calendarUnselectableCounts();
  assert.ok(counts.unselectable > counts.total / 2,
    `only ${counts.unselectable} of ${counts.total} cells were unselectable`);
  await this.expenses.closeCalendar();
});

// ---------------------------------------------------------------- receipts

When('I attach a receipt file to the expense entry', async function () {
  const file = path.join(os.tmpdir(), 'baseline-receipt.txt');
  fs.writeFileSync(file, 'baseline receipt fixture');
  this.memory.receiptName = path.basename(file);
  await this.expenses.attachReceipt(file);
});

Then('the expense entry shows the attached receipt name', async function () {
  const model = await this.expenses.newExpenseModel();
  assert.strictEqual(model.receiptName, this.memory.receiptName);
  const hint = await this.expenses.receiptHintText();
  assert.ok(hint && hint.includes(this.memory.receiptName), `hint read "${hint}"`);
});

Then('the expense line table shows {int} paperclip', async function (count) {
  assert.strictEqual(await this.expenses.paperclipCount(), count);
});

Then('the expense line table shows {int} receipt dash', async function (count) {
  assert.strictEqual(await this.expenses.receiptDashCount(), count);
});

// ---------------------------------------------------------------- submit

When('I submit the expense report', async function () {
  await this.expenses.submitReport();
});

Then('the expense error reads {string}', async function (message) {
  const text = await this.expenses.errorText();
  assert.ok(text && text.includes(message), `error read "${text}"`);
});

When('I press the close button on the expense error', async function () {
  await this.expenses.dismissError();
});

// ng-if creates a child scope; the close button writes errorMessage on the
// child, so the controller's copy — and therefore the alert — never clears.
Then('the expense error is still shown', async function () {
  assert.strictEqual(await this.expenses.errorVisible(), true);
});

Then('the controller still holds the expense error message', async function () {
  const message = await this.expenses.errorModel();
  assert.ok(message, 'the controller message was cleared after all');
});

Then('the expense error alert sits on a different scope from the controller', async function () {
  const controller = await this.expenses.controllerScopeId();
  const alert = await this.expenses.scopeIdOf('.alert-danger');
  assert.notStrictEqual(alert, controller, 'the alert shares the controller scope');
});

Then('the stored expense report {string} has the status {string}', async function (title, status) {
  const report = await this.expenses.storedReport(title);
  assert.ok(report, `no stored report titled "${title}"`);
  assert.strictEqual(report.status, status);
});

Then('the stored expense report {string} was submitted by {string}', async function (title, who) {
  const report = await this.expenses.storedReport(title);
  assert.strictEqual(report.submittedBy, who);
});

Then('the stored expense report {string} carries a submission date', async function (title) {
  const report = await this.expenses.storedReport(title);
  assert.ok(report.submittedAt, 'submittedAt was empty');
});

Then('the stored expense report {string} carries the note {string}', async function (title, note) {
  const report = await this.expenses.storedReport(title);
  assert.strictEqual(report.notes, note);
});

Then('the stored expense report {string} is linked to travel request {string}', async function (title, id) {
  const report = await this.expenses.storedReport(title);
  assert.strictEqual(report.travelRequestId, id);
});

Then('no travel request {string} exists on the server', async function (id) {
  const res = await fetch(`${API_ROOT}/travel-requests/${id}`, { headers: authHeaders(await tokenOf(this)) });
  assert.strictEqual(res.status, 404);
});

// ---------------------------------------------------------------- detail modal

When('I open the expense report {string}', async function (title) {
  await this.expenses.openReport(title);
});

When('I close the expense detail dialogue', async function () {
  await this.expenses.closeModal();
});

Then('the expense detail dialogue is shown', async function () {
  assert.strictEqual(await this.expenses.modalVisible(), true);
});

Then('the expense detail dialogue is hidden', async function () {
  assert.strictEqual(await this.expenses.modalVisible(), false);
});

Then('the expense detail dialogue is titled {string}', async function (expected) {
  assert.strictEqual(await this.expenses.modalHeaderText(), expected);
});

Then('the expense detail dialogue lists {int} expense lines', async function (count) {
  const rows = await this.expenses.modalLineRows();
  assert.strictEqual(rows.length, count);
});

Then('the expense detail dialogue totals by category:', async function (table) {
  const totals = await this.expenses.modalCategoryTotals();
  for (const [category, amount] of table.raw()) {
    assert.strictEqual(totals[category], Number(amount), `${category} totalled ${totals[category]}`);
  }
});

// getReportDetails does not re-apply the list decorations, so the modal binds
// two fields that are undefined on the freshly fetched report.
Then('the expense detail dialogue shows {string} as blank', async function (label) {
  const value = await this.expenses.modalMetaValue(label);
  assert.strictEqual((value || '').trim(), '', `"${label}" read "${value}"`);
  const fields = await this.expenses.selectedReportFields();
  assert.strictEqual(fields.submittedFormatted, undefined, 'submittedFormatted survived the refetch');
});

Then('the expense detail dialogue shows an unnumbered item count', async function () {
  const body = await this.expenses.modalBodyText();
  assert.ok(/(^|\s)expense items/.test(body), `body read "${body.slice(0, 120)}"`);
  const fields = await this.expenses.selectedReportFields();
  assert.strictEqual(fields.expenseCount, undefined, 'expenseCount survived the refetch');
});

Then('the expense detail dialogue shows {string} as {string}', async function (label, value) {
  assert.strictEqual(await this.expenses.modalMetaValue(label), value);
});

// ---------------------------------------------------------------- delete

When('I delete the expense report {string}', async function (title) {
  this.dialogs = await this.expenses.deleteReport(title, { accept: true });
});

When('I decline to delete the expense report {string}', async function (title) {
  this.dialogs = await this.expenses.deleteReport(title, { accept: false });
});

// ---------------------------------------------------------------- server seams

Then('the server refuses to approve an expense report', async function () {
  const res = await fetch(`${API_ROOT}/expense-reports/exp-1/approve`, {
    method: 'POST', headers: authHeaders(await tokenOf(this)), body: '{}'
  });
  assert.strictEqual(res.status, 404);
});

Then('the server refuses to reject an expense report', async function () {
  const res = await fetch(`${API_ROOT}/expense-reports/exp-1/reject`, {
    method: 'POST', headers: authHeaders(await tokenOf(this)), body: '{}'
  });
  assert.strictEqual(res.status, 404);
});

Then('requesting expense statistics returns {string}', async function (status) {
  const res = await fetch(`${API_ROOT}/expense-reports/statistics`, { headers: authHeaders(await tokenOf(this)) });
  this.memory.statisticsBody = await res.json();
  assert.strictEqual(String(res.status), status);
});

Then('the expense statistics error reads {string}', function (message) {
  assert.strictEqual(this.memory.statisticsBody.error, message);
});

Then('posting a receipt for expense {string} returns {string}', async function (expenseId, status) {
  const res = await fetch(`${API_ROOT}/expenses/${expenseId}/receipt`, {
    method: 'POST', headers: authHeaders(await tokenOf(this)), body: '{}'
  });
  assert.strictEqual(String(res.status), status);
});

Then('requesting expense reports without a token returns {string}', async function (status) {
  const res = await fetch(`${API_ROOT}/expense-reports`);
  assert.strictEqual(String(res.status), status);
});
