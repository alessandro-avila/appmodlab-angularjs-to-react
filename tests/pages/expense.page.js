/**
 * ExpensePage — Page Object for the expense-reconciliation screen.
 *
 * Green baseline (Track A): every accessor reports what the AngularJS application
 * does today. Where a control is inert, the accessor exposes the evidence rather
 * than hiding it — see readAlertScope() and dateRangeModel().
 */
const { BASE_URL } = require('../support/world');

'use strict';

const ROOT = '.container-fluid';
const FORM = '#new-expense-report';
const SEARCH = 'input[placeholder="Search reports..."]';
const DESC = FORM + ' input[ng-model="newExpense.description"]';
const AMOUNT = FORM + ' input[ng-model="newExpense.amount"]';
const CATEGORY = FORM + ' select[ng-model="newExpense.category"]';
const CURRENCY = FORM + ' select[ng-model="newExpense.currency"]';
const TITLE = FORM + ' input[ng-model="newReport.title"]';
const DESTINATION = FORM + ' input[ng-model="newReport.tripDestination"]';
const LINK_FIELD = FORM + ' input[ng-model="newReport.travelRequestId"]';
const NOTES = FORM + ' textarea[ng-model="newReport.notes"]';
const MODAL = '#expenseDetailModal';

class ExpensePage {
  constructor(page) {
    this.page = page;
  }

  // ---------- navigation ----------

  async open() {
    await this.page.goto(`${BASE_URL}/#!/expenses`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector(ROOT + ' table.table tbody tr, h4:has-text("No expense reports found")', { timeout: 20000 });
    await this.settle();
  }

  async settle(ms = 600) {
    await this.page.waitForTimeout(ms);
  }

  /** Wait for every notification toast to expire; they overlay the New Report button. */
  async waitForToastsToClear(timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await this.page.locator('.notification-area .alert').count()) === 0) return true;
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  // ---------- scope access ----------

  /** Read the controller scope (the element that owns filterStatus, searchQuery, dateRange). */
  async readScope(fn) {
    return this.page.evaluate(([body, root]) => {
      const sc = angular.element(document.querySelector(root)).scope();
      return new Function('sc', 'return (' + body + ')(sc)')(sc);
    }, [fn.toString(), ROOT]);
  }

  /** Read the scope attached to the error alert — an ng-if CHILD of the controller scope. */
  async readAlertScope(fn) {
    return this.page.evaluate((body) => {
      const el = document.querySelector('.alert-danger');
      if (!el) return null;
      const sc = angular.element(el).scope();
      return new Function('sc', 'return (' + body + ')(sc)')(sc);
    }, fn.toString());
  }

  async scopeIdOf(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? angular.element(el).scope().$id : null;
    }, selector);
  }

  async controllerScopeId() {
    return this.scopeIdOf(ROOT);
  }

  // ---------- dashboard ----------

  async dashboard() {
    return this.readScope(sc => sc.dashboard);
  }

  async dashboardTiles() {
    return this.page.locator(ROOT + ' .panel-body').evaluateAll(els =>
      els.filter(e => e.querySelector('h3')).map(e => ({
        value: e.querySelector('h3').textContent.trim(),
        label: (e.textContent.replace(e.querySelector('h3').textContent, '') || '').trim()
      })));
  }

  async tileValue(label) {
    const tiles = await this.dashboardTiles();
    const hit = tiles.find(t => t.label.toLowerCase() === label.toLowerCase());
    return hit ? hit.value : null;
  }

  // ---------- report list ----------

  async visibleReportIds() {
    return this.readScope(sc => sc.filteredReports.map(r => r.id));
  }

  async visibleReportTitles() {
    return this.page.locator(ROOT + ' > .panel table.table > tbody > tr').evaluateAll(rows =>
      rows.map(r => r.querySelector('td strong') ? r.querySelector('td strong').textContent.trim() : ''));
  }

  reportRow(title) {
    return this.page.locator(ROOT + ' > .panel table.table > tbody > tr').filter({ hasText: title });
  }

  async reportRowCells(title) {
    const cells = await this.reportRow(title).locator('td').allInnerTexts();
    return cells.map(c => c.replace(/\s+/g, ' ').trim());
  }

  async rowActionTitles(title) {
    return this.reportRow(title).locator('.btn-group button').evaluateAll(bs => bs.map(b => b.getAttribute('title')));
  }

  async emptyStateVisible() {
    return this.page.locator('h4:has-text("No expense reports found")').isVisible().catch(() => false);
  }

  async emptyStateButtonLabel() {
    return (await this.page.locator('button:has-text("Create Your First Report")').innerText()).trim();
  }

  async reportListVisible() {
    return this.page.locator(ROOT + ' > .panel table.table').isVisible().catch(() => false);
  }

  // ---------- filters ----------

  filterButton(name) {
    return this.page.locator(ROOT + ' > .row .btn-group.btn-group-sm button').filter({ hasText: new RegExp('^\\s*' + name + '\\s*$', 'i') });
  }

  async filterBy(name) {
    await this.filterButton(name).click();
    await this.settle(500);
  }

  async filterButtonClass(name) {
    return this.filterButton(name).getAttribute('class');
  }

  async filterStatus() {
    return this.readScope(sc => sc.filterStatus);
  }

  async search(text) {
    await this.page.fill(SEARCH, text);
    await this.settle(700);
  }

  async searchText() {
    return this.page.inputValue(SEARCH);
  }

  async setFromDate(value) {
    await this.page.fill('#reportStartDate', value);
    await this.settle(800);
  }

  async setToDate(value) {
    await this.page.fill('#reportEndDate', value);
    await this.settle(800);
  }

  async fromDateText() {
    return this.page.inputValue('#reportStartDate');
  }

  async dateRangeModel() {
    return this.readScope(sc => sc.dateRange);
  }

  async calendarIsOpenFor(selector) {
    await this.page.click(selector);
    await this.settle(700);
    const open = await this.page.locator('#ui-datepicker-div').isVisible().catch(() => false);
    return open;
  }

  async closeCalendar() {
    await this.page.keyboard.press('Escape');
    await this.settle(300);
  }

  async pickFirstAvailableCalendarDay() {
    await this.page.locator('#ui-datepicker-div a.ui-state-default').first().click();
    await this.settle(800);
  }

  async calendarNextMonthDisabled() {
    const cls = await this.page.locator('#ui-datepicker-div .ui-datepicker-next').getAttribute('class');
    return /ui-state-disabled/.test(cls || '');
  }

  async calendarUnselectableCounts() {
    return {
      unselectable: await this.page.locator('#ui-datepicker-div td.ui-datepicker-unselectable').count(),
      total: await this.page.locator('#ui-datepicker-div td').count()
    };
  }

  // ---------- new report form ----------

  newReportButton() {
    return this.page.locator(ROOT + ' > .page-header button, ' + ROOT + ' button.pull-right').first();
  }

  async newReportButtonLabel() {
    return (await this.newReportButton().innerText()).trim();
  }

  async openForm() {
    await this.waitForToastsToClear();
    await this.newReportButton().click();
    await this.page.waitForSelector(FORM, { state: 'visible', timeout: 10000 });
    await this.settle(800);
  }

  async cancelForm() {
    await this.waitForToastsToClear();
    await this.page.locator(FORM + ' button.btn-default').filter({ hasText: /cancel/i }).click();
    await this.settle(800);
  }

  async formVisible() {
    return this.page.locator(FORM).isVisible().catch(() => false);
  }

  async fillReportTitle(value) {
    await this.page.fill(TITLE, value);
    await this.settle(250);
  }

  async reportTitleText() {
    return this.page.inputValue(TITLE);
  }

  async fillDestination(value) {
    await this.page.fill(DESTINATION, value);
    await this.settle(250);
  }

  async fillLinkedRequest(value) {
    await this.page.fill(LINK_FIELD, value);
    await this.settle(250);
  }

  async fillNotes(value) {
    await this.page.fill(NOTES, value);
    await this.settle(250);
  }

  async categoryOptions() {
    return this.page.locator(CATEGORY + ' option').allInnerTexts();
  }

  async currencyOptions() {
    return this.page.locator(CURRENCY + ' option').allInnerTexts();
  }

  // ---------- line items ----------

  addItemButton() {
    return this.page.locator(FORM + ' button.btn-success').first();
  }

  async addItemButtonLabel() {
    return (await this.addItemButton().innerText()).trim();
  }

  async enterLineItem({ description, amount, category, currency }) {
    if (category !== undefined) await this.page.selectOption(CATEGORY, { label: category });
    if (currency !== undefined) await this.page.selectOption(CURRENCY, { label: currency });
    if (description !== undefined) await this.page.fill(DESC, description);
    if (amount !== undefined) await this.page.fill(AMOUNT, String(amount));
    await this.settle(300);
  }

  async submitLineItem() {
    await this.addItemButton().click();
    await this.settle(600);
  }

  async lineItemCount() {
    return this.readScope(sc => sc.newReport.expenses.length);
  }

  async lineItems() {
    return this.readScope(sc => sc.newReport.expenses.map(e => ({
      id: e.id, category: e.category, amount: e.amount, currency: e.currency,
      description: e.description, dateFormatted: e.dateFormatted,
      amountFormatted: e.amountFormatted, receiptName: e.receiptName
    })));
  }

  async lineItemRowCount() {
    return this.page.locator(FORM + ' table tbody tr').count();
  }

  async lineItemRowTexts() {
    return this.page.locator(FORM + ' table tbody tr').evaluateAll(rs =>
      rs.map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  }

  async removeFirstLineItem() {
    await this.page.locator(FORM + ' table tbody button.btn-danger').first().click();
    await this.settle(600);
  }

  async runningTotal() {
    return this.readScope(sc => sc.newReport.totalAmount);
  }

  async categoryBreakdown() {
    return this.readScope(sc => sc.newReport.categoryBreakdown);
  }

  async renderedTotal() {
    const el = this.page.locator(FORM + ' table tfoot td strong').last();
    return (await el.count()) ? (await el.innerText()).trim() : null;
  }

  async breakdownBarLabels() {
    return this.page.locator(FORM + ' .progress .progress-bar').allInnerTexts();
  }

  async itemsTableVisible() {
    return this.page.locator(FORM + ' table').isVisible().catch(() => false);
  }

  async highlightedFieldCount() {
    return this.page.locator('.expense-required.has-error').count();
  }

  async highlightedFieldLabels() {
    return this.page.locator('.expense-required').evaluateAll(els =>
      els.map(e => (e.querySelector('label') ? e.querySelector('label').textContent : '').replace(/\s+/g, ' ').trim()));
  }

  async newExpenseModel() {
    return this.readScope(sc => ({
      date: String(sc.newExpense.date), category: sc.newExpense.category,
      description: sc.newExpense.description, amount: sc.newExpense.amount,
      currency: sc.newExpense.currency, receiptName: sc.newExpense.receiptName
    }));
  }

  async expenseDateFieldText() {
    return this.page.inputValue('#expenseDate');
  }

  async attachReceipt(filePath) {
    await this.page.setInputFiles('#receiptFileInput', filePath);
    await this.settle(700);
  }

  async receiptHintText() {
    const el = this.page.locator(FORM + ' div.text-muted').filter({ hasText: /\.(txt|png|pdf|jpg)/i }).first();
    return (await el.count()) ? (await el.innerText()).trim() : null;
  }

  async paperclipCount() {
    return this.page.locator(FORM + ' table tbody .glyphicon-paperclip').count();
  }

  async receiptDashCount() {
    return this.page.locator(FORM + ' table tbody td span.text-muted').count();
  }

  // ---------- submit ----------

  async submitReport() {
    await this.waitForToastsToClear();
    await this.page.locator(FORM + ' button.btn-primary').click();
    await this.settle(1600);
  }

  async errorText() {
    const el = this.page.locator('.alert-danger').first();
    return (await el.count()) && (await el.isVisible()) ? (await el.innerText()).replace(/×/g, '').trim() : null;
  }

  async errorVisible() {
    return this.page.locator('.alert-danger').first().isVisible().catch(() => false);
  }

  async dismissError() {
    await this.page.locator('.alert-danger button.close').click();
    await this.settle(500);
  }

  async errorModel() {
    return this.readScope(sc => sc.errorMessage);
  }

  async storedReports() {
    return this.readScope(sc => sc.reports.map(r => ({
      id: r.id, title: r.title, status: r.status, submittedAt: r.submittedAt,
      submittedBy: r.submittedBy, totalAmount: r.totalAmount,
      travelRequestId: r.travelRequestId, tripDestination: r.tripDestination,
      notes: r.notes, submittedFormatted: r.submittedFormatted, expenseCount: r.expenseCount
    })));
  }

  async storedReport(title) {
    const all = await this.storedReports();
    return all.find(r => r.title === title) || null;
  }

  // ---------- detail modal ----------

  async openReport(title) {
    await this.waitForToastsToClear();
    await this.reportRow(title).locator('button[title="View"]').click();
    await this.page.waitForSelector(MODAL + '.in', { timeout: 10000 }).catch(() => {});
    await this.settle(1000);
  }

  async modalVisible() {
    return this.page.locator(MODAL).isVisible().catch(() => false);
  }

  async modalHeaderText() {
    return (await this.page.locator(MODAL + ' .modal-header').innerText()).replace(/×/g, '').replace(/\s+/g, ' ').trim();
  }

  async modalBodyText() {
    return (await this.page.locator(MODAL + ' .modal-body').innerText()).replace(/\s+/g, ' ').trim();
  }

  async modalMetaValue(label) {
    return this.page.evaluate((lbl) => {
      const body = document.querySelector('#expenseDetailModal .modal-body');
      if (!body) return null;
      const strong = Array.from(body.querySelectorAll('strong')).find(s => s.textContent.replace(/\s+/g, ' ').trim().replace(/:$/, '') === lbl);
      if (!strong) return null;
      let text = '';
      let n = strong.nextSibling;
      while (n && !(n.nodeType === 1 && n.tagName === 'STRONG')) {
        text += n.textContent;
        n = n.nextSibling;
      }
      return text.replace(/\s+/g, ' ').trim();
    }, label);
  }

  async modalLineRows() {
    return this.page.locator(MODAL + ' table tbody tr').evaluateAll(rs =>
      rs.map(r => Array.from(r.querySelectorAll('td')).map(c => c.textContent.replace(/\s+/g, ' ').trim())));
  }

  async modalCategoryTotals() {
    return this.readScope(sc => sc.selectedReport ? sc.selectedReport.categoryTotals : null);
  }

  async modalCategoryPanelTexts() {
    return this.page.locator(MODAL + ' .modal-body .row .col-md-4').allInnerTexts();
  }

  async selectedReportFields() {
    return this.readScope(sc => sc.selectedReport ? {
      submittedFormatted: sc.selectedReport.submittedFormatted,
      expenseCount: sc.selectedReport.expenseCount,
      totalFormatted: sc.selectedReport.totalFormatted,
      status: sc.selectedReport.status
    } : null);
  }

  async closeModal() {
    await this.page.locator(MODAL + ' .modal-footer button').first().click();
    await this.settle(900);
  }

  // ---------- delete ----------

  /** Returns the dialogue records in the shape the shared "I am asked" step expects. */
  async deleteReport(title, { accept = true } = {}) {
    await this.waitForToastsToClear();
    const dialogs = [];
    this.page.once('dialog', async d => {
      dialogs.push({ type: d.type(), message: d.message() });
      if (accept) await d.accept(); else await d.dismiss();
    });
    await this.reportRow(title).locator('button[title="Delete"]').click();
    await this.settle(1400);
    return dialogs;
  }

  async deleteButtonCount(title) {
    return this.reportRow(title).locator('button[title="Delete"]').count();
  }

  // ---------- notifications ----------

  async lastNotification() {
    const n = this.page.locator('.notification-area .alert');
    return (await n.count()) ? (await n.last().innerText()).trim() : null;
  }

  async notificationCount() {
    return this.page.locator('.notification-area .alert').count();
  }
}

module.exports = { ExpensePage };
