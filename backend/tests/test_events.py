from datetime import datetime, timedelta, timezone
from app.models import EventStatus, UserRole

def payload(**changes):
    starts = datetime.now(timezone.utc) + timedelta(days=10)
    data = {"title":"Robotics Workshop","description":"Build an autonomous campus robot.","category":"Technology","venue":"Engineering Block","event_date":starts.isoformat(),"end_date":(starts+timedelta(hours=2)).isoformat(),"registration_deadline":(starts-timedelta(days=2)).isoformat(),"capacity":50,"tags":"robotics,workshop","eligibility":"All students","instructions":"Bring a laptop","contact_details":"robotics@example.com","is_paid":False,"entry_fee_paise":0}
    data.update(changes); return data

def test_student_and_pending_club_cannot_create(client, account_factory):
    _,_,student = account_factory(UserRole.STUDENT)
    assert client.post('/events', headers=student, json=payload()).status_code == 403
    _,_,pending = account_factory(UserRole.CLUB_ADMIN, approved=False)
    assert client.post('/events', headers=pending, json=payload()).status_code == 401

def test_create_event_without_optional_end_date(client, account_factory):
    _, _, club_headers = account_factory(UserRole.CLUB_ADMIN)
    event_data = payload()
    event_data.pop("end_date")
    response = client.post('/events', headers=club_headers, json=event_data)
    assert response.status_code == 201
    assert response.json()['end_date'] is None

def test_club_submission_and_admin_publication(client, account_factory):
    _,club,club_headers = account_factory(UserRole.CLUB_ADMIN); _,_,admin = account_factory(UserRole.CENTRAL_ADMIN)
    created = client.post('/events', headers=club_headers, json=payload())
    assert created.status_code == 201 and created.json()['status'] == 'draft' and created.json()['club_id'] == club.id
    event_id = created.json()['id']; assert client.get('/events').json()['total'] == 0
    assert client.post(f'/events/{event_id}/submit', headers=club_headers).json()['status'] == 'pending_approval'
    assert client.post(f'/admin/events/{event_id}/approve', headers=admin, json={}).json()['status'] == 'approved'
    assert client.get('/events').json()['total'] == 0
    assert client.post(f'/admin/events/{event_id}/publish', headers=admin, json={}).json()['status'] == 'published'
    assert client.get('/events').json()['total'] == 1

def test_club_ownership_validation_and_review_reason(client, account_factory, event_factory):
    owner,club,_ = account_factory(UserRole.CLUB_ADMIN); _,_,other = account_factory(UserRole.CLUB_ADMIN); _,_,admin = account_factory(UserRole.CENTRAL_ADMIN)
    event = event_factory(club, owner, status=EventStatus.DRAFT)
    assert client.patch(f'/events/{event.id}', headers=other, json={'title':'Stolen'}).status_code == 403
    assert client.post('/events', headers=other, json=payload(capacity=0)).status_code == 422
    assert client.post('/events', headers=other, json=payload(is_paid=True, entry_fee_paise=0)).status_code == 422
    assert client.post(f'/events/{event.id}/submit', headers={"Authorization": f"Bearer bad"}).status_code == 401
    event.status = EventStatus.PENDING_APPROVAL
    assert client.post(f'/admin/events/{event.id}/reject', headers=admin, json={}).status_code == 422
    assert client.post(f'/admin/events/{event.id}/reject', headers=admin, json={'reason':'Add safety details'}).json()['status'] == 'rejected'
    assert client.get(f'/events/{event.id}').status_code == 404
