"""Post-seed script: creates threaded conversations + contacts for all users."""
import requests, time, sys

API = 'http://localhost:8000/api/v1'

def login(email):
    r = requests.post(f'{API}/auth/login', json={'email': email, 'password': 'password123'})
    return r.json()['access_token']

def send(token, to_email, to_name, subject, body):
    r = requests.post(f'{API}/messages', headers={'Authorization': f'Bearer {token}'}, json={
        'to_addresses': [{'email': to_email, 'name': to_name}],
        'subject': subject, 'body_html': f'<p>{body}</p>'})
    return r.json()['id']

def inbox_id(token):
    return next(f['id'] for f in requests.get(f'{API}/folders', headers={'Authorization': f'Bearer {token}'}).json() if f['slug'] == 'inbox')

def latest(token, iid):
    return requests.get(f'{API}/messages?folder_id={iid}&limit=1', headers={'Authorization': f'Bearer {token}'}).json()['items'][0]['id']

def reply(token, mid, body):
    requests.post(f'{API}/messages/{mid}/reply', headers={'Authorization': f'Bearer {token}'}, json={'body_html': f'<p>{body}</p>'})

def create_contact(token, data):
    r = requests.post(f'{API}/contacts', headers={'Authorization': f'Bearer {token}'}, json=data)
    return r.status_code == 201

# ── All team members ──────────────────────────────────────────
ALL_PEOPLE = [
    {'first_name': 'Frank', 'last_name': 'Miller', 'display_name': 'Frank Miller', 'email': 'frank.miller@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'Engineering Lead'},
    {'first_name': 'Alice', 'last_name': 'Johnson', 'display_name': 'Alice Johnson', 'email': 'alice.johnson@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'Product Manager'},
    {'first_name': 'Bob', 'last_name': 'Smith', 'display_name': 'Bob Smith', 'email': 'bob.smith@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'Designer'},
    {'first_name': 'Carol', 'last_name': 'Williams', 'display_name': 'Carol Williams', 'email': 'carol.williams@vendor.com', 'company': 'Vendor Corp', 'job_title': 'Account Manager'},
    {'first_name': 'David', 'last_name': 'Brown', 'display_name': 'David Brown', 'email': 'david.brown@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'QA Lead'},
    {'first_name': 'Emma', 'last_name': 'Davis', 'display_name': 'Emma Davis', 'email': 'newsletter@techdigest.com', 'company': 'Tech Digest', 'job_title': 'Editor'},
    {'first_name': 'Grace', 'last_name': 'Wilson', 'display_name': 'Grace Wilson', 'email': 'grace.wilson@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'HR Manager'},
    {'first_name': 'Henry', 'last_name': 'Moore', 'display_name': 'Henry Moore', 'email': 'henry.moore@partner.com', 'company': 'Partner Inc', 'job_title': 'Sales Director'},
    {'first_name': 'Isabella', 'last_name': 'Taylor', 'display_name': 'Isabella Taylor', 'email': 'isabella.taylor@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'Finance'},
    {'first_name': 'James', 'last_name': 'Anderson', 'display_name': 'James Anderson', 'email': 'james.anderson@acmecorp.com', 'company': 'Acme Corp', 'job_title': 'DevOps'},
]

USERS = [
    'frank.miller@acmecorp.com',
    'alice.johnson@acmecorp.com',
    'bob.smith@acmecorp.com',
    'david.brown@acmecorp.com',
]

try:
    # ── Seed contacts for all users ──────────────────────────────
    print('Seeding contacts for all users...')
    for user_email in USERS:
        try:
            token = login(user_email)
            # Get existing contacts
            existing = requests.get(f'{API}/contacts', headers={'Authorization': f'Bearer {token}'}).json()
            existing_emails = set()
            items = existing.get('items', existing) if isinstance(existing, dict) else existing
            if isinstance(items, list):
                existing_emails = {c.get('email', '') for c in items}

            created = 0
            for person in ALL_PEOPLE:
                if person['email'] == user_email:  # Skip self
                    continue
                if person['email'] in existing_emails:
                    continue
                if create_contact(token, person):
                    created += 1
            print(f'  {user_email}: {created} contacts created')
        except Exception as e:
            print(f'  {user_email}: contacts failed - {e}')

    # ── Create threaded conversations ────────────────────────────
    print('Creating threaded conversations...')
    tf = login('frank.miller@acmecorp.com')
    ta = login('alice.johnson@acmecorp.com')
    tb = login('bob.smith@acmecorp.com')
    fi = inbox_id(tf)
    ai = inbox_id(ta)
    bi = inbox_id(tb)

    # Thread 1: Q3 Budget (3 messages)
    send(ta, 'frank.miller@acmecorp.com', 'Frank Miller', 'Q3 Budget Review', 'Hi Frank, please review the Q3 budget document. Let me know your thoughts.')
    time.sleep(0.3)
    reply(tf, latest(tf, fi), 'Thanks Alice, looks good overall but we need to adjust the marketing spend. Can we discuss tomorrow?')
    time.sleep(0.3)
    reply(ta, latest(ta, ai), 'Sure, let me set up a meeting for tomorrow 2pm. I will send the calendar invite.')

    # Thread 2: Website Redesign (4 messages)
    send(tb, 'frank.miller@acmecorp.com', 'Frank Miller', 'Website Redesign Proposal', 'Hi Frank, I put together the initial wireframes for the website redesign. Can you take a look?')
    time.sleep(0.3)
    reply(tf, latest(tf, fi), 'Thanks Bob, wireframes look solid. Can we simplify the mega menu navigation?')
    time.sleep(0.3)
    reply(tb, latest(tb, bi), 'Good point. I will revise the navigation and send an updated version by EOD.')
    time.sleep(0.3)
    reply(tf, latest(tf, fi), 'Sounds great. Also loop in Carol from vendor side for branding inputs.')

    # Thread 3: Team Offsite (3 messages)
    send(ta, 'frank.miller@acmecorp.com', 'Frank Miller', 'Team Offsite - June Planning', 'Hi Frank, we need to finalize the venue. I have shortlisted 3 options.')
    time.sleep(0.3)
    reply(tf, latest(tf, fi), 'I prefer Lakeside Retreat. What is the budget looking like?')
    time.sleep(0.3)
    reply(ta, latest(ta, ai), 'Budget is 15K. Lakeside is 12K for 2 days. Booking it now.')

    # Thread 4: Hiring (3 messages)
    send(ta, 'frank.miller@acmecorp.com', 'Frank Miller', 'Senior Developer Candidates', 'Hi Frank, 3 strong candidates for the senior dev role. Resumes attached.')
    time.sleep(0.3)
    reply(tf, latest(tf, fi), 'Reviewed all three. Candidate #2 Sarah Chen stands out. Schedule her this week.')
    time.sleep(0.3)
    reply(ta, latest(ta, ai), 'Scheduled Sarah for Thursday 3 PM. Sending interview template.')

    # Thread 5: Standalone emails with attachments (for attachment testing)
    send(ta, 'frank.miller@acmecorp.com', 'Frank Miller', 'Q2 Sales Report - Please Review',
         'Hi Frank,<br/><br/>Please find the Q2 sales report attached. Key highlights:<br/><ul><li>Revenue up 15% QoQ</li><li>New client acquisitions: 12</li><li>Top performing region: West Coast</li></ul><br/>Let me know your thoughts before the board meeting.<br/><br/>Thanks,<br/>Alice')
    time.sleep(0.3)
    send(ta, 'frank.miller@acmecorp.com', 'Frank Miller', 'Brand Guidelines + Logo Files',
         'Hi Frank,<br/><br/>Here are the updated brand guidelines and logo files for the website redesign project.<br/><br/>Please share with the design team.<br/><br/>Best,<br/>Alice')

    print('4 threaded conversations + 2 standalone emails created successfully')

    # ── Upload test attachments ──────────────────────────────────
    # Use the real fixtures shipped in apps/api/seeds/samples/ so the
    # in-app preview renders correctly (pdf / image / xlsx / pptx /
    # docx / csv). Earlier this wrote tiny dummy bytes and the previews
    # broke — senior asked to swap to real files.
    print('Uploading test attachments...')
    import os
    SAMPLES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api', 'seeds', 'samples')
    tf_token = tf

    def upload(msg_id, sample_filename, attach_filename, ctype):
        sample_path = os.path.join(SAMPLES_DIR, sample_filename)
        if not os.path.isfile(sample_path):
            print(f'  ! sample missing: {sample_path}')
            return
        with open(sample_path, 'rb') as f:
            requests.post(f'{API}/messages/{msg_id}/attachments',
                headers={'Authorization': f'Bearer {tf_token}'},
                files={'file': (attach_filename, f, ctype)})

    # Find the attachment emails in Frank's inbox
    msgs = requests.get(f'{API}/messages?folder_slug=inbox&limit=20&focused=true', headers={'Authorization': f'Bearer {tf_token}'}).json()
    for msg in msgs.get('items', []):
        if msg['subject'] == 'Q2 Sales Report - Please Review' and not msg['has_attachments']:
            # Real xlsx — same workbook content, named for the Q2 thread.
            upload(msg['id'], 'Q4-Sales-Report.xlsx', 'Q2-Sales-Report.xlsx',
                   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            print(f'  Attached Q2-Sales-Report.xlsx to "{msg["subject"][:30]}"')

        if msg['subject'] == 'Brand Guidelines + Logo Files' and not msg['has_attachments']:
            # Real pdf + png; SVG dropped per senior's preview list (pdf /
            # image / pptx / docs / excel) — the previous svg dummy was
            # 35 bytes and didn't render.
            upload(msg['id'], 'Project-Brief.pdf', 'Brand-Guidelines-2026.pdf', 'application/pdf')
            upload(msg['id'], 'Logo.png', 'Logo-Primary.png', 'image/png')
            print(f'  Attached pdf + png to "{msg["subject"][:30]}"')

    print('Post-seed complete!')
except Exception as e:
    print(f'Post-seed failed: {e}', file=sys.stderr)
    sys.exit(1)