/**
 * Formalize Script — Microsoft Outlook Clone
 * ===========================================
 * Reads all raw capture sessions from research/raw/ and normalizes
 * them into structured JSON artifacts in research/normalized/:
 *
 *   routes.json              — discovered URL routes + page titles
 *   components.json          — UI component patterns per page
 *   workflows.json           — inferred user workflows from interactive elements
 *   locator-hints.json       — stable selectors for Playwright tests
 *   network-hints.json       — inferred API endpoints from page structure
 *   entity-hypotheses.json   — data model entities inferred from DOM
 *   page-state-map.json      — which pages share state / navigation links
 *
 * Usage:
 *   node scripts/formalize/normalize-session.mjs
 */

import fs from 'fs';
import path from 'path';

const RAW_DIR        = path.resolve('research/raw');
const NORMALIZED_DIR = path.resolve('research/normalized');
const MANIFEST_PATH  = path.join(RAW_DIR, 'outlook-capture-manifest.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return ''; }
}

function writeJson(filename, data) {
  const filePath = path.join(NORMALIZED_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✓ ${filename}`);
}

// Extract text content from HTML (naive but fast — no DOM parser needed)
function extractTextBlocks(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

// Extract all href links from HTML
function extractLinks(html) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.startsWith('/') || href.includes('outlook.office.com')) {
      links.add(href.split('?')[0]);
    }
  }
  return [...links];
}

// Extract aria-label values from HTML
function extractAriaLabels(html) {
  const labels = new Set();
  const re = /aria-label=["']([^"']{3,80})["']/g;
  let m;
  while ((m = re.exec(html)) !== null) labels.add(m[1]);
  return [...labels];
}

// Extract data-testid / data-automationid values
function extractTestIds(html) {
  const ids = new Set();
  const re = /data-(?:testid|automationid|app-section)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return [...ids];
}

// Infer component type from interactive elements
function inferComponents(elements, label) {
  const components = [];
  const hasSearchInput = elements.some(e => e.placeholder?.toLowerCase().includes('search') || e.ariaLabel?.toLowerCase().includes('search'));
  const hasCompose = elements.some(e => e.ariaLabel?.toLowerCase().includes('new mail') || e.ariaLabel?.toLowerCase().includes('new message') || e.text?.toLowerCase().includes('new mail'));
  const hasFolderTree = elements.some(e => e.ariaLabel?.toLowerCase().includes('folder') || e.role === 'tree');
  const hasMessageList = elements.some(e => e.ariaLabel?.toLowerCase().includes('message list') || e.ariaLabel?.toLowerCase().includes('conversation'));
  const hasCalendarGrid = elements.some(e => e.ariaLabel?.toLowerCase().includes('calendar') || e.role === 'grid');
  const hasContactList = elements.some(e => e.ariaLabel?.toLowerCase().includes('contact') || e.ariaLabel?.toLowerCase().includes('people'));
  const hasTaskList = elements.some(e => e.ariaLabel?.toLowerCase().includes('task'));
  const hasRichEditor = elements.some(e => e.role === 'textbox' && (e.ariaLabel?.toLowerCase().includes('body') || e.ariaLabel?.toLowerCase().includes('message body')));
  const hasAttendees = elements.some(e => e.ariaLabel?.toLowerCase().includes('attendee') || e.ariaLabel?.toLowerCase().includes('required attendees'));
  const hasRecurrence = elements.some(e => e.ariaLabel?.toLowerCase().includes('recurrence') || e.text?.toLowerCase().includes('recurrence'));
  const hasToField = elements.some(e => e.ariaLabel?.toLowerCase().includes('to') && e.role === 'combobox');
  const hasSubject = elements.some(e => e.ariaLabel?.toLowerCase().includes('subject'));

  if (hasSearchInput) components.push('SearchBar');
  if (hasCompose) components.push('ComposeButton');
  if (hasFolderTree) components.push('FolderTree');
  if (hasMessageList) components.push('MessageList');
  if (hasCalendarGrid) components.push('CalendarGrid');
  if (hasContactList) components.push('ContactList');
  if (hasTaskList) components.push('TaskList');
  if (hasRichEditor) components.push('RichTextEditor');
  if (hasAttendees) components.push('AttendeePicker');
  if (hasRecurrence) components.push('RecurrenceEditor');
  if (hasToField) components.push('RecipientField');
  if (hasSubject) components.push('SubjectField');
  if (label.includes('settings')) components.push('SettingsPanel');
  if (label.includes('calendar')) components.push('CalendarView');
  if (label.includes('contacts')) components.push('ContactsView');
  if (label.includes('tasks')) components.push('TasksView');

  return [...new Set(components)];
}

// Build locator hints from elements
function buildLocators(elements, label) {
  const locators = [];

  for (const el of elements) {
    if (!el.ariaLabel && !el.placeholder && !el.text) continue;

    const hint = { page: label, tag: el.tag };
    if (el.ariaLabel) hint.selector = `[aria-label="${el.ariaLabel}"]`;
    else if (el.placeholder) hint.selector = `[placeholder="${el.placeholder}"]`;
    else if (el.role) hint.selector = `[role="${el.role}"]`;

    if (el.role) hint.role = el.role;
    if (el.text) hint.text = el.text.slice(0, 60);
    if (hint.selector) locators.push(hint);
  }

  // Return top 30 most meaningful per page (prioritize aria-label)
  return locators
    .filter(l => l.selector?.includes('aria-label'))
    .slice(0, 30);
}

// Infer API endpoints from page label
function inferApiEndpoints(label) {
  const map = {
    'mail-inbox':          [{ method: 'GET', path: '/api/v1/messages?folder_id=inbox' }, { method: 'GET', path: '/api/v1/folders' }],
    'mail-reading-pane':   [{ method: 'GET', path: '/api/v1/messages/{id}' }, { method: 'GET', path: '/api/v1/messages/{id}/attachments' }],
    'mail-compose':        [{ method: 'POST', path: '/api/v1/messages' }, { method: 'GET', path: '/api/v1/contacts/autocomplete?q={q}' }, { method: 'GET', path: '/api/v1/signatures' }],
    'mail-sent':           [{ method: 'GET', path: '/api/v1/messages?folder_id=sent' }],
    'mail-drafts':         [{ method: 'GET', path: '/api/v1/messages?folder_id=drafts&is_draft=true' }],
    'mail-search':         [{ method: 'GET', path: '/api/v1/messages/search?q={q}' }],
    'mail-folders-sidebar':[{ method: 'GET', path: '/api/v1/folders?tree=true' }],
    'calendar-month':      [{ method: 'GET', path: '/api/v1/events?start_after={date}&start_before={date}' }, { method: 'GET', path: '/api/v1/calendars' }],
    'calendar-week':       [{ method: 'GET', path: '/api/v1/events?start_after={date}&start_before={date}' }],
    'calendar-day':        [{ method: 'GET', path: '/api/v1/events?start_after={date}&start_before={date}' }],
    'calendar-workweek':   [{ method: 'GET', path: '/api/v1/events?start_after={date}&start_before={date}' }],
    'calendar-new-event':  [{ method: 'POST', path: '/api/v1/events' }, { method: 'GET', path: '/api/v1/events/availability' }, { method: 'GET', path: '/api/v1/contacts/autocomplete?q={q}' }],
    'contacts-list':       [{ method: 'GET', path: '/api/v1/contacts' }, { method: 'GET', path: '/api/v1/contacts?search={q}' }],
    'contacts-detail':     [{ method: 'GET', path: '/api/v1/contacts/{id}' }, { method: 'PATCH', path: '/api/v1/contacts/{id}' }],
    'tasks-list':          [{ method: 'GET', path: '/api/v1/tasks' }, { method: 'GET', path: '/api/v1/task-lists' }],
    'settings-general':    [{ method: 'GET', path: '/api/v1/settings' }, { method: 'PATCH', path: '/api/v1/settings' }],
    'settings-mail':       [{ method: 'GET', path: '/api/v1/settings' }, { method: 'PATCH', path: '/api/v1/settings' }],
    'settings-signatures': [{ method: 'GET', path: '/api/v1/signatures' }, { method: 'POST', path: '/api/v1/signatures' }, { method: 'PATCH', path: '/api/v1/signatures/{id}' }, { method: 'DELETE', path: '/api/v1/signatures/{id}' }],
    'settings-rules':      [{ method: 'GET', path: '/api/v1/rules' }, { method: 'POST', path: '/api/v1/rules' }, { method: 'PATCH', path: '/api/v1/rules/{id}' }, { method: 'DELETE', path: '/api/v1/rules/{id}' }],
    'settings-oof':        [{ method: 'GET', path: '/api/v1/settings/oof' }, { method: 'PATCH', path: '/api/v1/settings/oof' }],
    'settings-categories': [{ method: 'GET', path: '/api/v1/categories' }, { method: 'POST', path: '/api/v1/categories' }, { method: 'PATCH', path: '/api/v1/categories/{id}' }],
  };
  return map[label] || [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=======================================================');
  console.log('  Outlook Clone — Formalize Phase');
  console.log('=======================================================\n');

  fs.mkdirSync(NORMALIZED_DIR, { recursive: true });

  // Load manifest
  const manifest = readJson(MANIFEST_PATH);
  if (!manifest) {
    console.error('❌ Manifest not found. Run capture first.');
    process.exit(1);
  }

  console.log(`📂 Processing ${manifest.totalSessions} sessions...\n`);

  // Collect all session data
  const sessions = [];
  for (const entry of manifest.sessions) {
    const dir = path.join(RAW_DIR, entry.sessionId);
    const metadata = readJson(path.join(dir, 'metadata.json'));
    const elements = readJson(path.join(dir, 'interactive-elements.json')) || [];
    const domHtml  = readText(path.join(dir, 'dom.html'));
    const aria     = readText(path.join(dir, 'aria-snapshot.yaml'));

    sessions.push({
      ...entry,
      metadata,
      elements,
      domHtml,
      aria,
      links: extractLinks(domHtml),
      ariaLabels: extractAriaLabels(domHtml),
      testIds: extractTestIds(domHtml),
      textContent: extractTextBlocks(domHtml),
    });
  }

  console.log('📝 Writing normalized artifacts...\n');

  // ------------------------------------------------------------------
  // 1. routes.json
  // ------------------------------------------------------------------
  const routes = sessions.map(s => ({
    label: s.label,
    url: s.url,
    title: s.metadata?.title || '',
    discoveredLinks: s.links.filter(l => l.includes('/mail/') || l.includes('/calendar/') || l.includes('/people') || l.includes('/tasks') || l.includes('/options/')).slice(0, 20),
  }));
  writeJson('routes.json', routes);

  // ------------------------------------------------------------------
  // 2. components.json
  // ------------------------------------------------------------------
  const components = sessions.map(s => ({
    page: s.label,
    url: s.url,
    inferredComponents: inferComponents(s.elements, s.label),
    ariaLandmarks: s.ariaLabels.filter(l => l.length > 3 && l.length < 60).slice(0, 20),
    automationIds: s.testIds.slice(0, 20),
    interactiveCount: s.elements.length,
  }));
  writeJson('components.json', components);

  // ------------------------------------------------------------------
  // 3. workflows.json
  // ------------------------------------------------------------------
  const workflows = [
    {
      id: 'compose-send',
      label: 'Compose and Send Email',
      pages: ['mail-inbox', 'mail-compose'],
      keyElements: sessions
        .filter(s => s.label === 'mail-compose')
        .flatMap(s => s.elements.filter(e => e.ariaLabel).map(e => e.ariaLabel).slice(0, 10)),
    },
    {
      id: 'mail-triage',
      label: 'Inbox Triage',
      pages: ['mail-inbox', 'mail-reading-pane'],
      keyElements: sessions
        .filter(s => s.label === 'mail-inbox')
        .flatMap(s => s.elements.filter(e => e.ariaLabel).map(e => e.ariaLabel).slice(0, 10)),
    },
    {
      id: 'calendar-event',
      label: 'Create Calendar Event',
      pages: ['calendar-month', 'calendar-new-event'],
      keyElements: sessions
        .filter(s => s.label === 'calendar-new-event')
        .flatMap(s => s.elements.filter(e => e.ariaLabel).map(e => e.ariaLabel).slice(0, 10)),
    },
    {
      id: 'contact-manage',
      label: 'Contact Management',
      pages: ['contacts-list', 'contacts-detail'],
      keyElements: sessions
        .filter(s => s.label === 'contacts-list')
        .flatMap(s => s.elements.filter(e => e.ariaLabel).map(e => e.ariaLabel).slice(0, 10)),
    },
    {
      id: 'settings-configure',
      label: 'Configure Settings',
      pages: ['settings-general', 'settings-mail', 'settings-signatures', 'settings-rules', 'settings-oof'],
      keyElements: sessions
        .filter(s => s.label.startsWith('settings-'))
        .flatMap(s => s.elements.filter(e => e.ariaLabel).map(e => e.ariaLabel).slice(0, 5)),
    },
  ];
  writeJson('workflows.json', workflows);

  // ------------------------------------------------------------------
  // 4. locator-hints.json
  // ------------------------------------------------------------------
  const allLocators = sessions.flatMap(s => buildLocators(s.elements, s.label));

  // Add critical known locators from ARIA labels observed
  const criticalLocators = sessions.flatMap(s =>
    s.ariaLabels
      .filter(label => label.length > 2 && label.length < 70)
      .map(label => ({
        page: s.label,
        selector: `[aria-label="${label}"]`,
        ariaLabel: label,
        source: 'html-extraction',
      }))
      .slice(0, 15)
  );

  writeJson('locator-hints.json', {
    generatedAt: new Date().toISOString(),
    totalLocators: allLocators.length + criticalLocators.length,
    byPage: sessions.map(s => ({
      page: s.label,
      locators: buildLocators(s.elements, s.label),
      ariaLandmarks: s.ariaLabels.slice(0, 20),
    })),
  });

  // ------------------------------------------------------------------
  // 5. network-hints.json
  // ------------------------------------------------------------------
  const networkHints = sessions.map(s => ({
    page: s.label,
    inferredEndpoints: inferApiEndpoints(s.label),
  }));
  writeJson('network-hints.json', networkHints);

  // ------------------------------------------------------------------
  // 6. entity-hypotheses.json
  // ------------------------------------------------------------------
  const entityHypotheses = {
    generatedAt: new Date().toISOString(),
    source: 'dom-analysis',
    entities: [
      {
        name: 'Message',
        confidence: 'high',
        evidence: ['Message list observed in inbox', 'Reading pane with from/to/subject/body', 'Compose form with recipient fields'],
        fields: ['from', 'to', 'cc', 'bcc', 'subject', 'body', 'attachments', 'is_read', 'is_flagged', 'importance', 'received_at'],
      },
      {
        name: 'Folder',
        confidence: 'high',
        evidence: ['Folder tree in sidebar', 'System folders (Inbox, Sent, Drafts, Archive, Junk, Deleted)', 'User-created folders visible'],
        fields: ['name', 'parent_id', 'is_system', 'unread_count'],
      },
      {
        name: 'Event',
        confidence: 'high',
        evidence: ['Calendar grid with event blocks', 'New event form with title/time/attendees', 'Recurrence options visible'],
        fields: ['title', 'start_time', 'end_time', 'location', 'attendees', 'recurrence_rule', 'reminder_minutes', 'all_day'],
      },
      {
        name: 'Contact',
        confidence: 'high',
        evidence: ['People directory with search', 'Contact detail card', 'Autocomplete in compose'],
        fields: ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title'],
      },
      {
        name: 'Task',
        confidence: 'medium',
        evidence: ['Tasks section visible', 'Flagged email creates task'],
        fields: ['title', 'due_date', 'is_completed', 'importance', 'source_message_id'],
      },
      {
        name: 'Rule',
        confidence: 'high',
        evidence: ['Rules settings page captured', 'Condition + action builder observed'],
        fields: ['name', 'conditions', 'actions', 'priority', 'is_enabled'],
      },
      {
        name: 'Signature',
        confidence: 'high',
        evidence: ['Signatures settings page captured', 'Rich text editor for body', 'Default for new/reply toggle'],
        fields: ['name', 'body_html', 'is_default_new', 'is_default_reply'],
      },
      {
        name: 'Category',
        confidence: 'high',
        evidence: ['Categories settings page captured', 'Color + name configuration'],
        fields: ['name', 'color'],
      },
    ],
  };
  writeJson('entity-hypotheses.json', entityHypotheses);

  // ------------------------------------------------------------------
  // 7. page-state-map.json
  // ------------------------------------------------------------------
  const pageStateMap = {
    generatedAt: new Date().toISOString(),
    navigationGroups: [
      { group: 'Mail', pages: ['mail-inbox', 'mail-reading-pane', 'mail-compose', 'mail-sent', 'mail-drafts', 'mail-search', 'mail-folders-sidebar'] },
      { group: 'Calendar', pages: ['calendar-month', 'calendar-week', 'calendar-day', 'calendar-workweek', 'calendar-new-event'] },
      { group: 'Contacts', pages: ['contacts-list', 'contacts-detail'] },
      { group: 'Tasks', pages: ['tasks-list'] },
      { group: 'Settings', pages: ['settings-general', 'settings-mail', 'settings-signatures', 'settings-rules', 'settings-oof', 'settings-categories'] },
    ],
    sharedState: [
      { state: 'active_user', usedBy: 'all' },
      { state: 'folder_list', usedBy: ['mail-inbox', 'mail-reading-pane', 'mail-compose', 'mail-sent', 'mail-drafts', 'mail-search', 'mail-folders-sidebar'] },
      { state: 'contacts', usedBy: ['mail-compose', 'contacts-list', 'contacts-detail', 'calendar-new-event'] },
      { state: 'categories', usedBy: ['mail-inbox', 'mail-reading-pane', 'calendar-month', 'settings-categories'] },
      { state: 'signatures', usedBy: ['mail-compose', 'settings-signatures'] },
    ],
    interactionLinks: [
      { from: 'mail-inbox', to: 'mail-reading-pane', trigger: 'click message' },
      { from: 'mail-inbox', to: 'mail-compose', trigger: 'click new mail' },
      { from: 'mail-reading-pane', to: 'mail-compose', trigger: 'click reply/forward' },
      { from: 'calendar-month', to: 'calendar-new-event', trigger: 'click new event / click time slot' },
      { from: 'contacts-list', to: 'contacts-detail', trigger: 'click contact' },
      { from: 'contacts-detail', to: 'mail-compose', trigger: 'click send email' },
    ],
  };
  writeJson('page-state-map.json', pageStateMap);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\n=======================================================');
  console.log('  ✅ Formalize complete!');
  console.log('  Output: research/normalized/');
  console.log('  Files written: 7');
  console.log('=======================================================\n');
}

main().catch(err => {
  console.error('❌ Formalize failed:', err);
  process.exit(1);
});
