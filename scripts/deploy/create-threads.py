"""Post-seed script: creates threaded conversations for demo."""
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

try:
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

    print('4 threaded conversations created successfully')
except Exception as e:
    print(f'Thread creation failed: {e}', file=sys.stderr)
    sys.exit(1)