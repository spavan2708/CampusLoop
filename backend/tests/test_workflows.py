from app.models import UserRole

def test_separate_role_logins_and_public_signup(client, account_factory):
    signup = client.post('/auth/signup', json={'name':'Student','email':'student@campus.example.com','password':'strong-password','role':'central_admin'})
    assert signup.status_code == 201 and signup.json()['role'] == 'student'
    assert client.post('/auth/admin/login', data={'username':'student@campus.example.com','password':'strong-password'}).status_code == 401
    admin,_,_ = account_factory(UserRole.CENTRAL_ADMIN)
    assert client.post('/auth/admin/login', data={'username':admin.email,'password':'strong-password'}).status_code == 200

def test_central_admin_creates_active_club_login(client, account_factory):
    payload = {'club_name':'Innovation Society','description':'A student society for campus innovation.','category':'Technology','contact_email':'innovation@example.com','faculty_coordinator':'Dr Faculty','student_coordinator':'Student Lead','admin_name':'Club Admin','admin_email':'clubadmin@example.com','password':'strong-password'}
    assert client.post('/admin/clubs', json=payload).status_code == 401
    _,_,admin = account_factory(UserRole.CENTRAL_ADMIN)
    created = client.post('/admin/clubs', headers=admin, json=payload)
    assert created.status_code == 201
    assert created.json()['approval_status'] == 'approved'
    assert created.json()['is_active'] is True
    assert client.post('/auth/club/login', data={'username':'clubadmin@example.com','password':'strong-password'}).status_code == 200

def test_club_admin_can_change_password(client, account_factory):
    club_admin,_,headers = account_factory(UserRole.CLUB_ADMIN)
    changed = client.post('/auth/change-password', headers=headers, json={'current_password':'strong-password','new_password':'new-strong-password'})
    assert changed.status_code == 204
    assert client.post('/auth/club/login', data={'username':club_admin.email,'password':'strong-password'}).status_code == 401
    assert client.post('/auth/club/login', data={'username':club_admin.email,'password':'new-strong-password'}).status_code == 200


def test_club_admin_updates_public_profile(client, account_factory):
    _, club, headers = account_factory(UserRole.CLUB_ADMIN)
    response = client.patch('/clubs/me/profile', headers=headers, json={
        'description': 'A refreshed public club description for students.',
        'category': 'Arts and culture',
        'contact_email': 'CLUB@EXAMPLE.COM',
        'faculty_coordinator': 'Dr Updated',
        'student_coordinator': 'New Student Lead',
    })
    assert response.status_code == 200
    assert response.json()['description'].startswith('A refreshed')
    assert response.json()['contact_email'] == 'club@example.com'
    public = client.get(f'/clubs/{club.slug}')
    assert public.status_code == 200
    assert public.json()['category'] == 'Arts and culture'


def test_central_admin_can_deactivate_and_reactivate_club_login(client, account_factory):
    club_admin, club, _ = account_factory(UserRole.CLUB_ADMIN)
    _, _, admin_headers = account_factory(UserRole.CENTRAL_ADMIN)
    disabled = client.patch(f'/admin/clubs/{club.id}/status', headers=admin_headers, json={'is_active': False})
    assert disabled.status_code == 200
    assert disabled.json()['is_active'] is False
    # Inactive accounts deliberately use the same generic response as invalid credentials.
    assert client.post('/auth/club/login', data={'username': club_admin.email, 'password': 'strong-password'}).status_code == 401
    enabled = client.patch(f'/admin/clubs/{club.id}/status', headers=admin_headers, json={'is_active': True})
    assert enabled.status_code == 200
    assert client.post('/auth/club/login', data={'username': club_admin.email, 'password': 'strong-password'}).status_code == 200


def test_admin_detail_and_user_reads_are_admin_only(client, account_factory, event_factory):
    student, _, student_headers = account_factory(UserRole.STUDENT)
    club_admin, club, _ = account_factory(UserRole.CLUB_ADMIN)
    event = event_factory(club, club_admin)
    _, _, admin_headers = account_factory(UserRole.CENTRAL_ADMIN)

    assert client.get('/admin/users', headers=student_headers).status_code == 403
    users = client.get('/admin/users', headers=admin_headers, params={'role': 'student', 'search': student.email})
    assert users.status_code == 200
    assert users.json() == [{
        'id': student.id,
        'name': student.name,
        'email': student.email,
        'role': 'student',
        'is_active': True,
        'created_at': users.json()[0]['created_at'],
    }]
    assert 'password_hash' not in users.json()[0]
    assert client.get(f'/admin/clubs/{club.id}', headers=admin_headers).json()['id'] == club.id
    assert client.get(f'/admin/events/{event.id}', headers=admin_headers).json()['id'] == event.id
    assert client.get('/admin/clubs/99999', headers=admin_headers).status_code == 404
    assert client.get('/admin/events/99999', headers=admin_headers).status_code == 404
