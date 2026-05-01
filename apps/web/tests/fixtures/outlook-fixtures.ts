import { test as base } from '@playwright/test';
import { MailInboxPage } from './pages/MailInboxPage';
import { CalendarMonthPage } from './pages/CalendarMonthPage';
import { ContactsListPage } from './pages/ContactsListPage';
import { TasksListPage } from './pages/TasksListPage';

/**
 * Extended Playwright fixtures for Outlook clone tests.
 */
type OutlookFixtures = {
  mailInbox: MailInboxPage;
  calendar: CalendarMonthPage;
  contacts: ContactsListPage;
  tasks: TasksListPage;
  loggedIn: void;
};

export const test = base.extend<OutlookFixtures>({
  loggedIn: async ({ page }, use) => {
    // Authenticate against our clone app
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[type="submit"]');
    await page.waitForURL('**/mail/inbox');
    await use();
  },

  mailInbox: async ({ page, loggedIn }, use) => {
    await use(new MailInboxPage(page));
  },

  calendar: async ({ page, loggedIn }, use) => {
    await use(new CalendarMonthPage(page));
  },

  contacts: async ({ page, loggedIn }, use) => {
    await use(new ContactsListPage(page));
  },

  tasks: async ({ page, loggedIn }, use) => {
    await use(new TasksListPage(page));
  },
});

export { expect } from '@playwright/test';
