import { useContext } from 'react'
import StudentDataContext from './student-data-context.js'

export default function useStudentData() {
  const value = useContext(StudentDataContext)
  if (!value) throw new Error('useStudentData must be used inside StudentDataProvider')
  return value
}
