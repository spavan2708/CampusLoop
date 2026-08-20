import { useContext, useEffect } from 'react'
import NavigationGuardContext from './navigation-guard-context.js'

export default function useUnsavedChanges(dirty, message = 'You have unsaved changes. Leaving now will discard them.') {
  const context = useContext(NavigationGuardContext)
  useEffect(() => context?.register(dirty, message), [context, dirty, message])
  return context
}
