from datetime import timedelta

from app.models import EventStatus, Notification, NotificationOutbox, NotificationStatus, SavedEvent, UserRole
from app.notification_jobs import deliver_due, expire_obsolete, generate_reminders, process_outbox
from app.notifications import create_notification, enqueue_domain_event, safe_action_url, utc_now


def add_notice(db, user_id, key='notice:one', **changes):
    data = dict(recipient_user_id=user_id, notification_type='EVENT_FEATURED', category='discovery', title='Featured event', message='A useful event was featured.', action_url='/student/events/1', deduplication_key=key)
    data.update(changes)
    item = create_notification(db, **data); db.commit(); return item


def test_notification_ownership_read_all_archive_and_pagination(client, db_session, account_factory):
    first, _, first_headers = account_factory(UserRole.STUDENT)
    second, _, second_headers = account_factory(UserRole.STUDENT)
    item = add_notice(db_session, first.id)
    add_notice(db_session, first.id, 'notice:two')
    add_notice(db_session, second.id, 'notice:other')
    response = client.get('/notifications?limit=1', headers=first_headers).json()
    assert response['total'] == 2 and len(response['items']) == 1
    assert client.get('/notifications/unread-count', headers=first_headers).json()['count'] == 2
    assert client.patch(f'/notifications/{item.id}/read', headers=second_headers).status_code == 404
    assert client.patch(f'/notifications/{item.id}/read', headers=first_headers).json()['status'] == 'read'
    assert client.get('/notifications/unread-count', headers=first_headers).json()['count'] == 1
    assert client.patch('/notifications/read-all', headers=first_headers).json()['count'] == 0
    assert client.get('/notifications/unread-count', headers=first_headers).json()['count'] == 0
    assert client.patch(f'/notifications/{item.id}/unread', headers=first_headers).json()['status'] == 'delivered'
    assert client.get('/notifications/unread-count', headers=first_headers).json()['count'] == 1
    assert client.delete(f'/notifications/{item.id}', headers=first_headers).status_code == 204


def test_preferences_dedup_and_safe_links(client, db_session, account_factory):
    user, _, headers = account_factory(UserRole.STUDENT)
    updated = client.patch('/notifications/preferences', headers=headers, json={'digest_frequency':'daily','timezone':'Asia/Kolkata','email_enabled':True,'category_settings':{'discovery':False}})
    assert updated.status_code == 200 and updated.json()['email_enabled'] is False
    assert add_notice(db_session, user.id, 'blocked') is None
    client.patch('/notifications/preferences', headers=headers, json={'category_settings':{'discovery':True}})
    first = add_notice(db_session, user.id, 'dedup'); second = add_notice(db_session, user.id, 'dedup')
    assert first.id == second.id
    try:
        add_notice(db_session, user.id, 'unsafe', action_url='https://malicious.example')
        assert False, 'external links must be rejected'
    except ValueError:
        db_session.rollback()
    try:
        safe_action_url('/studentevil/phishing')
        assert False, 'lookalike portal paths must be rejected'
    except ValueError:
        pass


def test_digest_generation_and_outbox_retry(client, db_session, account_factory):
    user, _, headers = account_factory(UserRole.STUDENT)
    client.patch('/notifications/preferences', headers=headers, json={'digest_frequency': 'daily'})
    add_notice(db_session, user.id, 'digest-source')
    assert generate_reminders(db_session, utc_now()) == 1
    assert db_session.query(Notification).filter_by(recipient_user_id=user.id, type='NOTIFICATION_DIGEST').count() == 1
    assert generate_reminders(db_session, utc_now()) == 0

    enqueue_domain_event(db_session, 'TEST_EVENT', 'test', user.id, {}, 'outbox:test')
    db_session.commit()
    assert process_outbox(db_session, handler=lambda _item: (_ for _ in ()).throw(RuntimeError('temporary failure'))) == 0
    outbox = db_session.query(NotificationOutbox).filter_by(deduplication_key='outbox:test').one()
    assert outbox.status == 'retry' and outbox.attempts == 1 and outbox.last_error == 'temporary failure'
    outbox.available_at = utc_now() - timedelta(seconds=1); db_session.commit()
    assert process_outbox(db_session) == 1
    assert outbox.status == 'processed' and outbox.attempts == 2


def test_scheduling_expiration_and_obsolete_event(db_session, account_factory, event_factory):
    student, _, _ = account_factory(UserRole.STUDENT)
    owner, club, _ = account_factory(UserRole.CLUB_ADMIN)
    event = event_factory(club, owner)
    now = utc_now()
    due = add_notice(db_session, student.id, 'due', scheduled_for=now - timedelta(minutes=1), event_id=event.id)
    assert due.status == NotificationStatus.DELIVERED  # past schedules deliver immediately
    future = add_notice(db_session, student.id, 'future', scheduled_for=now + timedelta(hours=1), event_id=event.id)
    event.status = EventStatus.CANCELLED; db_session.commit()
    assert deliver_due(db_session, now + timedelta(hours=2)) == 0 and future.status == NotificationStatus.CANCELLED
    expiring = add_notice(db_session, student.id, 'expiring', expires_at=now - timedelta(seconds=1))
    assert expire_obsolete(db_session, now) == 1 and expiring.status == NotificationStatus.EXPIRED


def test_saved_reminder_eligibility_and_registration_trigger(client, db_session, account_factory, event_factory):
    owner, club, _ = account_factory(UserRole.CLUB_ADMIN)
    student, _, headers = account_factory(UserRole.STUDENT)
    event = event_factory(club, owner)
    event.registration_deadline = utc_now() + timedelta(hours=72, minutes=30)
    db_session.add(SavedEvent(student_id=student.id, event_id=event.id)); db_session.commit()
    assert generate_reminders(db_session, utc_now()) >= 1
    assert db_session.query(Notification).filter_by(recipient_user_id=student.id, type='SAVED_EVENT_REGISTRATION_REMINDER').count() == 1
    assert client.post(f'/registrations/events/{event.id}', headers=headers).status_code == 201
    assert db_session.query(Notification).filter_by(recipient_user_id=student.id, type='REGISTRATION_CONFIRMED').count() == 1


def test_waitlist_promotion_and_payment_placeholder_notifications(client, db_session, account_factory, event_factory):
    owner, club, _ = account_factory(UserRole.CLUB_ADMIN); event = event_factory(club, owner, capacity=1)
    first, _, first_headers = account_factory(UserRole.STUDENT); second, _, second_headers = account_factory(UserRole.STUDENT)
    client.post(f'/registrations/events/{event.id}', headers=first_headers)
    assert client.post(f'/registrations/events/{event.id}', headers=second_headers).json()['status'] == 'waitlisted'
    client.delete(f'/registrations/events/{event.id}', headers=first_headers)
    assert db_session.query(Notification).filter_by(recipient_user_id=second.id, type='WAITLIST_PROMOTED').count() == 1
    paid = event_factory(club, owner, is_paid=True); third, _, third_headers = account_factory(UserRole.STUDENT)
    client.post(f'/registrations/events/{paid.id}', headers=third_headers)
    pending = db_session.query(Notification).filter_by(recipient_user_id=third.id, type='PAYMENT_PENDING').one()
    assert 'No payment has been collected' in pending.message
    assert db_session.query(Notification).filter(Notification.type == 'PAYMENT_DEADLINE_APPROACHING').count() == 0


def test_notification_mark_unread_toggles_read_state(client, db_session, account_factory):
    """Test that marking a notification unread clears read_at and resets status to DELIVERED."""
    user, _, headers = account_factory(UserRole.STUDENT)
    item = add_notice(db_session, user.id)
    # Initially unread (no read_at)
    assert item.read_at is None
    # Mark as read
    read_response = client.patch(f'/notifications/{item.id}/read', headers=headers)
    assert read_response.json()['status'] == 'read'
    assert read_response.json()['read_at'] is not None
    # Verify unread count decreased
    unread_response = client.get('/notifications/unread-count', headers=headers)
    assert unread_response.json()['count'] == 0
    # Mark as unread
    unread_response = client.patch(f'/notifications/{item.id}/unread', headers=headers)
    assert unread_response.json()['status'] == 'delivered'
    assert unread_response.json()['read_at'] is None
    # Verify unread count increased back to 1
    unread_response = client.get('/notifications/unread-count', headers=headers)
    assert unread_response.json()['count'] == 1