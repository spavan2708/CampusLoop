export function CampusLoopMark({ label = 'CampusLoop' }) {
  return <span className="campusloop-mark" aria-label={label}><span aria-hidden="true">CL</span></span>
}

export function PortalStatus({ children }) {
  return <p className="portal-status" role="status">{children}</p>
}
