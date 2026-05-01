/**
 * Generate Seeds
 * ==============
 * Writes the canonical seed JSON files used to boot the Outlook clone
 * with realistic data for AI agent training episodes.
 *
 * Output:
 *   apps/api/seeds/seed-default.json     — standard worker episode
 *   apps/api/seeds/seed-manager.json     — manager with delegate access
 *   apps/api/seeds/seed-minimal.json     — minimal seed for easy tasks
 *   apps/api/seeds/seed-heavy.json       — high-volume (500 messages)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SEEDS_DIR = path.resolve('apps/api/seeds');
fs.mkdirSync(SEEDS_DIR, { recursive: true });

function uuid() { return crypto.randomUUID(); }

// ---------------------------------------------------------------------------
// World people (shared identity pool)
// ---------------------------------------------------------------------------
const WORLD_PEOPLE = [
  { id: 'person-001', first_name: 'Alice',   last_name: 'Johnson',  email: 'alice.johnson@acmecorp.com',   phone: '+1-555-0101', company: 'Acme Corp',   job_title: 'Product Manager',      department: 'Product' },
  { id: 'person-002', first_name: 'Bob',     last_name: 'Smith',    email: 'bob.smith@acmecorp.com',       phone: '+1-555-0102', company: 'Acme Corp',   job_title: 'Engineering Manager',  department: 'Engineering' },
  { id: 'person-003', first_name: 'Carol',   last_name: 'Williams', email: 'carol.williams@vendor.com',    phone: '+1-555-0103', company: 'Vendor Inc',  job_title: 'Account Executive',    department: 'Sales' },
  { id: 'person-004', first_name: 'David',   last_name: 'Brown',    email: 'david.brown@acmecorp.com',     phone: '+1-555-0104', company: 'Acme Corp',   job_title: 'Designer',             department: 'Design' },
  { id: 'person-005', first_name: 'Emma',    last_name: 'Davis',    email: 'newsletter@techdigest.com',    phone: null,          company: 'Tech Digest', job_title: 'Editor',               department: null },
  { id: 'person-006', first_name: 'Frank',   last_name: 'Miller',   email: 'frank.miller@acmecorp.com',    phone: '+1-555-0106', company: 'Acme Corp',   job_title: 'Software Engineer',    department: 'Engineering' },
  { id: 'person-007', first_name: 'Grace',   last_name: 'Wilson',   email: 'grace.wilson@acmecorp.com',    phone: '+1-555-0107', company: 'Acme Corp',   job_title: 'QA Engineer',          department: 'Engineering' },
  { id: 'person-008', first_name: 'Henry',   last_name: 'Moore',    email: 'henry.moore@partner.com',      phone: '+1-555-0108', company: 'Partner LLC', job_title: 'Director',             department: 'Business' },
  { id: 'person-009', first_name: 'Isabella',last_name: 'Taylor',   email: 'isabella.taylor@acmecorp.com', phone: '+1-555-0109', company: 'Acme Corp',   job_title: 'HR Manager',           department: 'HR' },
  { id: 'person-010', first_name: 'James',   last_name: 'Anderson', email: 'james.anderson@acmecorp.com',  phone: '+1-555-0110', company: 'Acme Corp',   job_title: 'CFO',                  department: 'Finance' },
];

const WORLD_COMPANIES = [
  { id: 'company-001', name: 'Acme Corp',   domain: 'acmecorp.com',   industry: 'Technology' },
  { id: 'company-002', name: 'Vendor Inc',  domain: 'vendor.com',     industry: 'Services' },
  { id: 'company-003', name: 'Partner LLC', domain: 'partner.com',    industry: 'Consulting' },
  { id: 'company-004', name: 'Tech Digest', domain: 'techdigest.com', industry: 'Media' },
];

const WORLD = { people: WORLD_PEOPLE, companies: WORLD_COMPANIES };

// ---------------------------------------------------------------------------
// Helper: generate messages
// ---------------------------------------------------------------------------
function makeMessages(activeUserEmail, count, folderSlug, options = {}) {
  const msgs = [];
  const senders = WORLD_PEOPLE.filter(p => p.email !== activeUserEmail);
  const subjects = [
    'Project Alpha update',
    'Meeting tomorrow at 3pm',
    'Quick question about the proposal',
    'Invoice #1042 attached',
    'Welcome to Tech Digest — your weekly newsletter',
    'Action required: review Q3 report',
    'Re: design feedback',
    'Team lunch Friday?',
    'Follow up from our call',
    'New feature request from customer',
    'Quarterly review prep',
    'Onboarding checklist',
    'Budget approval needed',
    'Security alert: new sign-in',
    'Your order has shipped',
    'Reminder: standup in 15 minutes',
    'FWD: Partnership opportunity',
    'Out of office this week',
    'Please review attached document',
    'Happy to help with that',
  ];

  for (let i = 0; i < count; i++) {
    const sender = senders[i % senders.length];
    const subject = subjects[i % subjects.length];
    const isRead = options.allRead || (i % 3 !== 0);
    const hasAttachment = i % 7 === 0;
    const importance = i % 12 === 0 ? 'high' : 'normal';
    const isFlagged = i % 9 === 0;
    const dayOffset = -(i * 2);

    msgs.push({
      id: uuid(),
      from_address: sender.email,
      from_name: `${sender.first_name} ${sender.last_name}`,
      to_addresses: [{ email: activeUserEmail, name: 'Me' }],
      cc_addresses: i % 5 === 0 ? [{ email: WORLD_PEOPLE[2].email, name: 'Carol Williams' }] : [],
      subject,
      body_html: `<p>Hi,</p><p>${subject}. Please let me know your thoughts.</p><p>Best regards,<br>${sender.first_name}</p>`,
      body_text: `Hi,\n\n${subject}. Please let me know your thoughts.\n\nBest regards,\n${sender.first_name}`,
      folder_slug: folderSlug,
      is_read: folderSlug === 'sent' || folderSlug === 'drafts' ? true : isRead,
      is_flagged: folderSlug === 'inbox' ? isFlagged : false,
      is_draft: folderSlug === 'drafts',
      importance,
      has_attachments: hasAttachment,
      received_at: new Date(Date.now() + dayOffset * 86400000).toISOString(),
    });
  }
  return msgs;
}

// ---------------------------------------------------------------------------
// Helper: generate events
// ---------------------------------------------------------------------------
function makeEvents(calendarId, userEmail) {
  const now = new Date();
  const day = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

  return [
    {
      id: uuid(), calendar_id: calendarId,
      title: 'Weekly Team Standup',
      start_time: new Date(day(1).setHours(9, 0)).toISOString(),
      end_time:   new Date(day(1).setHours(9, 30)).toISOString(),
      is_recurring: true, recurrence_rule: { frequency: 'WEEKLY', days_of_week: ['MO','TU','WE','TH','FR'] },
      attendees: [
        { email: WORLD_PEOPLE[1].email, display_name: 'Bob Smith', response_status: 'accepted', is_required: true },
        { email: WORLD_PEOPLE[5].email, display_name: 'Frank Miller', response_status: 'accepted', is_required: true },
      ],
      location: 'Teams Meeting', reminder_minutes: 5,
    },
    {
      id: uuid(), calendar_id: calendarId,
      title: 'Product Review with Alice',
      start_time: new Date(day(2).setHours(14, 0)).toISOString(),
      end_time:   new Date(day(2).setHours(15, 0)).toISOString(),
      is_recurring: false,
      attendees: [
        { email: WORLD_PEOPLE[0].email, display_name: 'Alice Johnson', response_status: 'accepted', is_required: true },
      ],
      location: 'Conference Room B', reminder_minutes: 15,
    },
    {
      id: uuid(), calendar_id: calendarId,
      title: 'Vendor Call — Carol Williams',
      start_time: new Date(day(3).setHours(11, 0)).toISOString(),
      end_time:   new Date(day(3).setHours(11, 30)).toISOString(),
      is_recurring: false,
      attendees: [
        { email: WORLD_PEOPLE[2].email, display_name: 'Carol Williams', response_status: 'none', is_required: true },
      ],
      location: 'Zoom', reminder_minutes: 10,
    },
    {
      id: uuid(), calendar_id: calendarId,
      title: 'Q3 Planning',
      start_time: new Date(day(5).setHours(10, 0)).toISOString(),
      end_time:   new Date(day(5).setHours(12, 0)).toISOString(),
      is_recurring: false,
      attendees: WORLD_PEOPLE.slice(0, 5).map(p => ({
        email: p.email, display_name: `${p.first_name} ${p.last_name}`, response_status: 'accepted', is_required: true,
      })),
      location: 'Main Conference Room', reminder_minutes: 30,
    },
    {
      id: uuid(), calendar_id: calendarId,
      title: 'Design Review',
      start_time: new Date(day(-1).setHours(15, 0)).toISOString(),
      end_time:   new Date(day(-1).setHours(16, 0)).toISOString(),
      is_recurring: false,
      attendees: [
        { email: WORLD_PEOPLE[3].email, display_name: 'David Brown', response_status: 'accepted', is_required: true },
      ],
      location: 'Design Studio', reminder_minutes: 15,
    },
    {
      id: uuid(), calendar_id: calendarId,
      title: 'All-hands',
      start_time: new Date(day(7).setHours(9, 0)).toISOString(),
      end_time:   new Date(day(7).setHours(10, 0)).toISOString(),
      all_day: false, is_recurring: false,
      attendees: [],
      location: 'Auditorium', reminder_minutes: 30,
    },
  ];
}

// ---------------------------------------------------------------------------
// Build seed payloads
// ---------------------------------------------------------------------------

function buildDefaultSeed() {
  const activeUser = WORLD_PEOPLE[5]; // Frank Miller as the worker
  const calendarId = uuid();

  return {
    $schema: 'rl-env/v1',
    rng_seed: 42,
    feature_flags: {
      focused_inbox: true, schedule_send: true, snooze: true,
      scheduling_assistant: true, quick_steps: true, sweep: true,
      encryption_labels: false, groups: false, add_ins: false,
    },
    permission_profile: { role: 'worker' },
    world: WORLD,
    app_data: {
      active_user: {
        world_id: activeUser.id,
        email: activeUser.email,
        display_name: `${activeUser.first_name} ${activeUser.last_name}`,
        role: 'worker',
        timezone: 'America/New_York',
        locale: 'en-US',
      },
      custom_folders: [
        { name: 'Projects' },
        { name: 'Project Alpha', parent: 'Projects' },
        { name: 'Newsletters' },
        { name: 'Receipts' },
      ],
      messages: [
        ...makeMessages(activeUser.email, 30, 'inbox'),
        ...makeMessages(activeUser.email, 20, 'sent', { allRead: true }),
        ...makeMessages(activeUser.email, 3,  'drafts'),
        ...makeMessages(activeUser.email, 15, 'archive', { allRead: true }),
        ...makeMessages(activeUser.email, 5,  'junk'),
      ],
      calendars: [
        { id: calendarId, name: 'Calendar', is_default: true, color: '#0078D4' },
        { id: uuid(),     name: 'Personal', is_default: false, color: '#107C10' },
      ],
      events: makeEvents(calendarId, activeUser.email),
      contacts: WORLD_PEOPLE
        .filter(p => p.id !== activeUser.id)
        .map(p => ({
          world_id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone: p.phone,
          company: p.company,
          job_title: p.job_title,
          is_favorite: ['person-001', 'person-002'].includes(p.id),
        })),
      task_lists: [
        { name: 'Tasks', is_default: true },
        { name: 'Work Projects', is_default: false },
      ],
      tasks: [
        { title: 'Review Q3 report',        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], importance: 'high',   is_completed: false },
        { title: 'Respond to Carol re: proposal', due_date: new Date(Date.now() + 2*86400000).toISOString().split('T')[0], importance: 'normal', is_completed: false },
        { title: 'Update project timeline', due_date: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], importance: 'normal', is_completed: false },
        { title: 'Book travel for conference', due_date: null, importance: 'low', is_completed: false },
        { title: 'Send meeting notes', importance: 'normal', is_completed: true },
      ],
      rules: [
        {
          name: 'Move newsletters',
          conditions: [{ field: 'from', operator: 'contains', value: 'newsletter' }],
          actions: [{ type: 'move_to_folder', params: { folder_slug: 'newsletters' } }],
          is_enabled: true, priority: 0,
        },
        {
          name: 'Flag emails from Bob (manager)',
          conditions: [{ field: 'from', operator: 'equals', value: WORLD_PEOPLE[1].email }],
          actions: [{ type: 'flag' }, { type: 'set_importance', params: { level: 'high' } }],
          is_enabled: true, priority: 1,
        },
      ],
      categories: [
        { name: 'Blue Category',   color: '#0078D4' },
        { name: 'Green Category',  color: '#107C10' },
        { name: 'Orange Category', color: '#FF8C00' },
        { name: 'Red Category',    color: '#D13438' },
        { name: 'Yellow Category', color: '#FFB900' },
      ],
      signatures: [
        {
          name: 'Work',
          body_html: `<p>Best regards,<br><strong>${activeUser.first_name} ${activeUser.last_name}</strong><br>${activeUser.job_title} | ${activeUser.company}<br>${activeUser.email}</p>`,
          is_default_new: true,
          is_default_reply: false,
        },
        {
          name: 'Brief',
          body_html: `<p>— ${activeUser.first_name}</p>`,
          is_default_new: false,
          is_default_reply: true,
        },
      ],
      out_of_office: {
        enabled: false, start: null, end: null,
        internal_message: '', external_message: '',
      },
    },
  };
}

function buildManagerSeed() {
  const seed = buildDefaultSeed();
  const manager = WORLD_PEOPLE[1]; // Bob Smith as manager
  seed.rng_seed = 43;
  seed.permission_profile = { role: 'manager', delegates: ['person-001'] };
  seed.app_data.active_user = {
    world_id: manager.id,
    email: manager.email,
    display_name: `${manager.first_name} ${manager.last_name}`,
    role: 'manager',
    timezone: 'America/New_York',
    locale: 'en-US',
  };
  return seed;
}

function buildMinimalSeed() {
  const activeUser = WORLD_PEOPLE[0]; // Alice Johnson
  const calendarId = uuid();
  return {
    $schema: 'rl-env/v1',
    rng_seed: 1,
    feature_flags: { focused_inbox: false, schedule_send: true, snooze: false, scheduling_assistant: false, quick_steps: false, sweep: false },
    permission_profile: { role: 'worker' },
    world: { people: WORLD_PEOPLE.slice(0, 3), companies: WORLD_COMPANIES.slice(0, 1) },
    app_data: {
      active_user: {
        world_id: activeUser.id, email: activeUser.email,
        display_name: `${activeUser.first_name} ${activeUser.last_name}`,
        role: 'worker', timezone: 'America/New_York', locale: 'en-US',
      },
      custom_folders: [],
      messages: makeMessages(activeUser.email, 5, 'inbox'),
      calendars: [{ id: calendarId, name: 'Calendar', is_default: true, color: '#0078D4' }],
      events: [makeEvents(calendarId, activeUser.email)[0]],
      contacts: WORLD_PEOPLE.slice(1, 3).map(p => ({
        world_id: p.id, first_name: p.first_name, last_name: p.last_name,
        email: p.email, company: p.company, job_title: p.job_title,
      })),
      task_lists: [{ name: 'Tasks', is_default: true }],
      tasks: [{ title: 'Test task', importance: 'normal', is_completed: false }],
      rules: [], categories: [],
      signatures: [{ name: 'Default', body_html: `<p>— ${activeUser.first_name}</p>`, is_default_new: true, is_default_reply: true }],
      out_of_office: { enabled: false, start: null, end: null, internal_message: '', external_message: '' },
    },
  };
}

function buildHeavySeed() {
  const seed = buildDefaultSeed();
  seed.rng_seed = 100;
  // Expand to 500 messages
  const activeUser = WORLD_PEOPLE[5];
  seed.app_data.messages = [
    ...makeMessages(activeUser.email, 150, 'inbox'),
    ...makeMessages(activeUser.email, 150, 'sent', { allRead: true }),
    ...makeMessages(activeUser.email, 10,  'drafts'),
    ...makeMessages(activeUser.email, 150, 'archive', { allRead: true }),
    ...makeMessages(activeUser.email, 30,  'junk'),
    ...makeMessages(activeUser.email, 10,  'deleted'),
  ];
  return seed;
}

// ---------------------------------------------------------------------------
// Write seed files
// ---------------------------------------------------------------------------
const seeds = [
  { filename: 'seed-default.json', data: buildDefaultSeed(),  desc: 'Default worker seed (~73 messages, 6 events, 9 contacts)' },
  { filename: 'seed-manager.json', data: buildManagerSeed(),  desc: 'Manager seed with delegate access' },
  { filename: 'seed-minimal.json', data: buildMinimalSeed(),  desc: 'Minimal seed for easy agent tasks' },
  { filename: 'seed-heavy.json',   data: buildHeavySeed(),    desc: 'Heavy seed for scale testing (~500 messages)' },
];

console.log('\n=======================================================');
console.log('  Outlook Clone — Generate: Seeds');
console.log('=======================================================\n');

for (const seed of seeds) {
  const filePath = path.join(SEEDS_DIR, seed.filename);
  fs.writeFileSync(filePath, JSON.stringify(seed.data, null, 2), 'utf8');
  const msgCount = seed.data.app_data.messages.length;
  console.log(`   ✓ ${seed.filename} — ${msgCount} messages — ${seed.desc}`);
}

console.log('\n=======================================================');
console.log('  ✅ Seeds generated!');
console.log(`  Output: apps/api/seeds/ (${seeds.length} files)`);
console.log('=======================================================\n');
