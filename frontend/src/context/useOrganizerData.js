import { useContext } from 'react'
import OrganizerDataContext from './organizer-data-context.js'

export default function useOrganizerData() {
  const value = useContext(OrganizerDataContext)
  if (!value) throw new Error('useOrganizerData must be used inside OrganizerDataProvider')
  return value
}
