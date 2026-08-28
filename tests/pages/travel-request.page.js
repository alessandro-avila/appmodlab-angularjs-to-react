/**
 * Page object for the travel requests screen — React since Increment 4.
 *
 * Two things this page object used to expose have gone, because the defects
 * they existed to observe were REPAIRED under ADR-005 (see also ADR-022):
 *
 *  - `readAlertScope` read the ng-if child scope around the error alert, which
 *    was the mechanism of the un-dismissable complaint. The alert dismisses
 *    now, so there is no second scope to read.
 *  - The search box works, so nothing here has to accommodate a TypeError.
 *
 * Scope note: the route publishes a scope-shaped snapshot at
 * `window.__flightSearch.scope` (see `src/lib/test-seam.ts`) under the same
 * property names the AngularJS controller used — requests, filteredRequests,
 * isLoading, errorMessage, showForm, editMode, filterStatus, searchQuery,
 * selectedRequest, newRequest. Every `fn` written against the legacy still
 * works.
 */
const { BASE_URL } = require('../support/world');

const ROOT = '.travel-request-container';
const API = 'http://localhost:3000/api';

/** "2026-09-10T00:00:00" or a Date -> "2026-09-10". */
function toDateInputValue(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

class TravelRequestPage {
  constructor(page) {
    this.page = page;
  }

  // ------------------------------------------------------------------ navigation

  async open() {
    await this.page.goto(`${BASE_URL}/travel-request`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector(ROOT, { timeout: 20000 });
    await this.page.waitForFunction(
      () => !!(window.__flightSearch && window.__flightSearch.scope),
      null,
      { timeout: 20000 }
    );
    await this.page.waitForSelector('table.table tbody tr, h4.text-muted', { timeout: 20000 });
    await this.settle();
  }

  async settle() {
    await this.page.waitForTimeout(350);
  }

  // ---------------------------------------------------------------- scope access

  /** Read the published snapshot. */
  async readScope(fn) {
    return this.page.evaluate(
      (body) =>
        // eslint-disable-next-line no-new-func
        new Function('sc', `return (${body})(sc)`)(window.__flightSearch.scope),
      fn.toString()
    );
  }

  // -------------------------------------------------------------------- the list

  get rows() {
    return this.page.locator('table.table tbody tr');
  }

  row(destination) {
    return this.rows.filter({ hasText: destination });
  }

  async listedDestinations() {
    return this.readScope((sc) => sc.filteredRequests.map((r) => r.destination));
  }

  async statusOf(destination) {
    return this.readScope((sc) => sc.filteredRequests.map((r) => [r.destination, r.status])).then(
      (pairs) => (pairs.find(([d]) => d === destination) || [])[1]
    );
  }

  async hasTable() {
    return (await this.page.locator('table.table').count()) > 0;
  }

  async emptyStateHeading() {
    const heading = this.page.locator('h4.text-muted');
    return (await heading.count()) ? heading.innerText() : null;
  }

  /** The cells of one row, keyed by the table's own column headings. */
  async rowCells(destination) {
    const headings = await this.page.locator('table.table thead th').allInnerTexts();
    const cells = await this.row(destination).locator('td').allInnerTexts();
    const out = {};
    headings.forEach((h, i) => {
      out[h.trim()] = (cells[i] || '').trim();
    });
    return out;
  }

  /** The title attributes of the action buttons on one row, in order. */
  async rowActions(destination) {
    return this.row(destination).locator('.btn-group button').evaluateAll((els) =>
      els.map((el) => el.getAttribute('title'))
    );
  }

  // ---------------------------------------------------------------- summary cards

  async summaryCards() {
    return this.page.locator('.panel .panel-body').evaluateAll((els) =>
      els
        .filter((el) => el.querySelector('h2'))
        .map((el) => [el.querySelector('p').textContent.trim(), el.querySelector('h2').textContent.trim()])
    );
  }

  // -------------------------------------------------------------------- filtering

  get filterButtons() {
    return this.page.locator('.btn-group .btn').filter({ hasText: /All|Pending|Approved|Rejected/ });
  }

  filterButton(label) {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  async filterBy(label) {
    await this.filterButton(label).click();
    await this.settle();
  }

  async filterIsHighlighted(label) {
    const cls = await this.filterButton(label).getAttribute('class');
    return !cls.includes('btn-default');
  }

  // -------------------------------------------------------------------- searching

  get searchBox() {
    return this.page.locator('input[placeholder="Search requests..."]');
  }

  async search(text) {
    await this.searchBox.fill(text);
    await this.page.waitForTimeout(700);
  }

  async searchText() {
    return this.searchBox.inputValue();
  }

  // ---------------------------------------------------------------- detail dialog

  get modal() {
    return this.page.locator('#requestDetailModal');
  }

  async openDetails(destination) {
    await this.row(destination).locator('button[title="View Details"]').click();
    await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async closeDetails() {
    await this.modal.locator('.modal-footer button').click();
    await this.page.waitForTimeout(600);
  }

  async modalTitle() {
    return (await this.modal.locator('.modal-title').innerText()).trim();
  }

  async modalText() {
    return this.modal.innerText();
  }

  /** Reads "Label: value" pairs out of the dialogue body. */
  async modalField(label) {
    return this.modal.locator('.modal-body p').evaluateAll(
      (els, wanted) => {
        for (const el of els) {
          const strong = el.querySelector('strong');
          if (strong && strong.textContent.trim().replace(/:$/, '') === wanted) {
            return el.textContent.replace(strong.textContent, '').trim();
          }
        }
        return null;
      },
      label
    );
  }

  async modalCostBreakdown() {
    return this.modal.locator('.modal-body table tr').evaluateAll((rows) =>
      rows.map((r) => Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim()))
    );
  }

  // ------------------------------------------------------------------- the form

  get form() {
    return this.page.locator('#travel-request-form');
  }

  get newRequestButton() {
    return this.page.locator('h2.page-header button');
  }

  async newRequestButtonLabel() {
    return (await this.newRequestButton.innerText()).trim();
  }

  async formIsShown() {
    return (await this.form.count()) > 0 && this.form.isVisible();
  }

  async toggleForm() {
    await this.newRequestButton.click();
    await this.page.waitForTimeout(700);
  }

  async startNewRequest() {
    await this.toggleForm();
    await this.form.waitFor({ state: 'visible', timeout: 10000 });
  }

  get destinationInput() {
    return this.page.locator('#destinationField input');
  }

  get costInputs() {
    return this.form.locator('input[type="number"]');
  }

  get submitButton() {
    return this.form.locator('button[type="submit"]');
  }

  get errorAlert() {
    return this.page.locator('.travel-request-container > .alert-danger');
  }

  async setDestination(value) {
    await this.destinationInput.fill(value);
    await this.settle();
  }

  async selectPurpose() {
    // Addressed by id now — the ng-model attribute went with AngularJS.
    await this.page.locator('#trPurpose').selectOption({ index: 1 });
    await this.settle();
  }

  async selectDepartment() {
    await this.page.locator('#trDepartment').selectOption({ index: 1 });
    await this.settle();
  }

  async setCosts(flights, hotels) {
    await this.costInputs.nth(0).fill(String(flights));
    await this.costInputs.nth(1).fill(String(hotels));
    await this.settle();
  }

  /**
   * Both date fields are native date inputs now (ADR-009 / ADR-014). The
   * jQuery UI datepickers, whose ng-model held a Date object rather than the
   * typed string, are gone — so the dates are simply typed.
   *
   * The scenarios pass the values the legacy needed, which are full local
   * datetime strings ("2026-09-10T00:00:00"). A native date input accepts only
   * `yyyy-MM-dd`, so the day part is taken here rather than rewriting every
   * step: the SCENARIOS should not churn because the widget changed.
   */
  async setTripDates(depart, ret) {
    await this.page.locator('#trDepartDate').fill(toDateInputValue(depart));
    await this.page.locator('#trReturnDate').fill(toDateInputValue(ret));
    await this.settle();
  }

  async submitForm() {
    await this.submitButton.click();
    await this.page.waitForTimeout(1400);
  }

  async submitButtonLabel() {
    return (await this.submitButton.innerText()).trim();
  }

  async errorMessage() {
    return this.readScope((sc) => sc.errorMessage);
  }

  async dismissError() {
    await this.errorAlert.locator('button.close').click();
    await this.page.waitForTimeout(500);
  }

  async destinationFieldClass() {
    return this.page.locator('#destinationField').getAttribute('class');
  }

  async totalEstimateText() {
    return (await this.form.locator('p.h4.text-primary').innerText()).trim();
  }

  async durationBadge() {
    const badge = this.form.locator('.label-info');
    return (await badge.count()) ? (await badge.innerText()).trim() : null;
  }

  async editRequest(destination) {
    await this.row(destination).locator('button[title="Edit"]').click();
    await this.form.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(700);
  }

  /**
   * Cancelling goes through a REACT confirmation now, not `window.confirm()`.
   * It is still blocking: nothing is sent until a button is pressed. The
   * message is returned in the same shape the dialog handler produced, so the
   * step definitions and scenarios are unchanged.
   */
  async cancelRequest(destination, { accept = true } = {}) {
    await this.row(destination).locator('button[title="Cancel"]').click();

    const dialog = this.page.locator('[data-testid="confirm-dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    const message = (
      await this.page.locator('[data-testid="confirm-message"]').innerText()
    ).trim();

    await dialog.getByRole('button', { name: accept ? 'OK' : 'Cancel' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 10000 });
    await this.page.waitForTimeout(1200);

    return [{ type: 'confirm', message }];
  }

  // --------------------------------------------------------------- notifications

  async lastNotification() {
    const alerts = this.page.locator('.notification-area .alert');
    const count = await alerts.count();
    if (!count) return null;
    return (await alerts.nth(count - 1).innerText()).replace(/\s*×\s*$/, '').trim();
  }

  // -------------------------------------------------------------- the server side

  async authToken() {
    return this.page.evaluate(() => localStorage.getItem('authToken'));
  }

  async fromServer(path) {
    const token = await this.authToken();
    const res = await fetch(`${API}${path}`, { headers: { Authorization: ['Bearer', token].join(' ') } });
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
    return res.json();
  }

  async serverRequests() {
    return this.fromServer('/travel-requests');
  }

  async serverRequestFor(destination) {
    const all = await this.serverRequests();
    return all.find((r) => r.destination === destination) || null;
  }

  async serverPolicy() {
    return this.fromServer('/travel-policy');
  }

  async serverApprovals(id) {
    return this.fromServer(`/travel-requests/${id}/approvals`);
  }

  async pageText() {
    return this.page.locator(ROOT).innerText();
  }

  /**
   * Every button on the page except the four status filters, whose labels
   * ("Approved", "Rejected") are about filtering, not deciding.
   */
  async actionButtonLabels() {
    return this.page.locator(`${ROOT} button, .modal button`).evaluateAll((els) =>
      els
        .filter((el) => !el.closest('.btn-group') || el.closest('table'))
        .map((el) => el.textContent.trim())
    );
  }

  /** SEAM-2: there is no endpoint behind an approval decision either. */
  async serverAcceptsApprovalOf(id) {
    const token = await this.authToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: ['Bearer', token].join(' ')
    };
    const results = [];
    for (const path of [`/travel-requests/${id}/approve`, `/travel-requests/${id}/reject`]) {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision: 'approved' })
      });
      results.push({ path, status: res.status });
    }
    return results;
  }
}

module.exports = TravelRequestPage;
