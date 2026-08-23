const labels = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  club_admin: 'Club admin',
  central_admin: 'Central admin',
}

export default function StatusBadge({ value }) {
  if (!value) return null
  return <span className={`status-badge status-${value}`}>{labels[value] || value.replaceAll('_', ' ')}</span>
}
