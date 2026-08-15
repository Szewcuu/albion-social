'use client'

import { createContext, useContext } from 'react'

const PortalSessionContext = createContext(null)

export function PortalSessionProvider({ value, children }) {
  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>
}

export function usePortalSession() {
  const session = useContext(PortalSessionContext)

  if (!session) {
    throw new Error('usePortalSession must be used inside PortalSessionProvider')
  }

  return session
}
