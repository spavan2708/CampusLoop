from app.models import ApprovalStatus, EventStatus, UserRole

def test_free_registration_duplicate_cancel_and_saved(client, account_factory, event_factory):
    owner,club,_ = account_factory(UserRole.CLUB_ADMIN); _,_,student = account_factory(UserRole.STUDENT); event = event_factory(club, owner)
    response = client.post(f'/registrations/events/{event.id}', headers=student)
    assert response.status_code == 201 and response.json()['status'] == 'confirmed' and response.json()['payment_status'] == 'not_required'
    assert client.post(f'/registrations/events/{event.id}', headers=student).status_code == 409
    assert client.post(f'/registrations/events/{event.id}/save', headers=student).status_code == 201
    assert len(client.get('/registrations/saved', headers=student).json()) == 1
    assert client.delete(f'/registrations/events/{event.id}', headers=student).status_code == 200
    assert client.delete(f'/registrations/events/{event.id}', headers=student).status_code == 404

def test_waitlist_and_paid_placeholder(client, account_factory, event_factory):
    owner,club,_ = account_factory(UserRole.CLUB_ADMIN); event = event_factory(club, owner, capacity=1)
    _,_,first = account_factory(UserRole.STUDENT); _,_,second = account_factory(UserRole.STUDENT)
    assert client.post(f'/registrations/events/{event.id}', headers=first).json()['status'] == 'confirmed'
    waitlisted = client.post(f'/registrations/events/{event.id}', headers=second).json()
    assert waitlisted['status'] == 'waitlisted' and waitlisted['event']['registered_count'] == 1 and waitlisted['event']['waitlist_count'] == 1
    paid = event_factory(club, owner, is_paid=True); _,_,third = account_factory(UserRole.STUDENT)
    result = client.post(f'/registrations/events/{paid.id}', headers=third).json()
    assert result['status'] == 'pending_payment' and result['payment_status'] == 'pending' and result['amount_paise'] == 15000

def test_role_attendee_ownership_and_closed_events(client, account_factory, event_factory):
    owner,club,owner_headers = account_factory(UserRole.CLUB_ADMIN); _,_,other = account_factory(UserRole.CLUB_ADMIN); _,_,student = account_factory(UserRole.STUDENT)
    event = event_factory(club, owner); client.post(f'/registrations/events/{event.id}', headers=student)
    assert client.post(f'/registrations/events/{event.id}', headers=owner_headers).status_code == 403
    assert client.get(f'/registrations/events/{event.id}/attendees', headers=other).status_code == 403
    assert client.get(f'/registrations/events/{event.id}/attendees', headers=owner_headers).json()['total'] == 1
    draft = event_factory(club, owner, status=EventStatus.DRAFT); assert client.post(f'/registrations/events/{draft.id}', headers=student).status_code == 409
    expired = event_factory(club, owner, deadline_days=-1); assert client.post(f'/registrations/events/{expired.id}', headers=student).status_code == 409


def test_registration_requires_approved_active_club(client, db_session, account_factory, event_factory):
    owner, club, _ = account_factory(UserRole.CLUB_ADMIN)
    _, _, student = account_factory(UserRole.STUDENT)
    event = event_factory(club, owner, status=EventStatus.PUBLISHED)

    club.is_active = False
    db_session.commit()
    assert client.post(f'/registrations/events/{event.id}', headers=student).status_code == 404

    club.is_active = True
    club.approval_status = ApprovalStatus.PENDING
    db_session.commit()
    assert client.post(f'/registrations/events/{event.id}', headers=student).status_code == 404
