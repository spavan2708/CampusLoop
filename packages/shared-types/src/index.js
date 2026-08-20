export const USER_ROLES = Object.freeze({
  STUDENT: 'student',
  CLUB_ADMIN: 'club_admin',
  CENTRAL_ADMIN: 'central_admin',
})

export const EVENT_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
})

export const REGISTRATION_STATUSES = Object.freeze({
  CONFIRMED: 'confirmed',
  PENDING_PAYMENT: 'pending_payment',
  WAITLISTED: 'waitlisted',
  CANCELLED: 'cancelled',
})
