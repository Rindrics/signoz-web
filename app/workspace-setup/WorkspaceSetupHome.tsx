'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import WorkspaceReady from './WorkspaceReady'
import WorkspaceSetup from './WorkspaceSetup'

const WORKSPACE_SETUP_URL = 'https://api.signoz.cloud/v2'

function WorkspaceSetupHome() {
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false)
  const [isWorkspaceSetupDelayed, setIsWorkspaceSetupDelayed] = useState(false)
  const [isPollingEnabled, setIsPollingEnabled] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [retryCount, setRetryCount] = useState(1)
  const [workspaceData, setWorkspaceData] = useState(null)
  const searchParams = useSearchParams()

  const code = searchParams.get('code')
  const email = searchParams.get('email')

  const verifyEmail = async () => {
    const res = await fetch(`${WORKSPACE_SETUP_URL}/users/verify`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PUT',
      body: JSON.stringify({
        code,
        email: email,
      }),
    })

    const data = await res.json()

    if (data.status === 'error' && data.type !== 'already-exists') {
      setIsEmailVerified(false)
    } else if (data.status === 'success') {
      setIsEmailVerified(true)
      setIsPollingEnabled(true)
    } else if (data.status === 'error' && data.type === 'already-exists') {
      setIsEmailVerified(true)
      setIsPollingEnabled(true)
    }
  }

  const verifyWorkspaceSetup = async () => {
    const encodedEmail = email ? encodeURIComponent(email) : ''

    if (!code || !encodedEmail) {
      return
    }

    const verifyWorkSpaceSetupURL = `${WORKSPACE_SETUP_URL}/deployments/cesearch?code=${code}&email=${encodedEmail}`

    const res = await fetch(verifyWorkSpaceSetupURL)
    const data = await res.json()

    if (data.status === 'success') {
      setIsWorkspaceReady(true)
      setWorkspaceData(data?.data)
    } else if (data.status === 'error') {
      setRetryCount((currentRetryCount) => currentRetryCount + 1)
    }
  }

  useEffect(() => {
    if (retryCount < 5) {
      setTimeout(verifyWorkspaceSetup, 1000 * 60)
    } else {
      setIsWorkspaceSetupDelayed(true)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  useEffect(() => {
    verifyEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isEmailVerified && isPollingEnabled) {
      verifyWorkspaceSetup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmailVerified])

  return (
    <Suspense>
      {isWorkspaceReady ? (
        <WorkspaceReady workspaceData={workspaceData} userEmail={email} />
      ) : (
        <WorkspaceSetup isWorkspaceSetupDelayed={isWorkspaceSetupDelayed} />
      )}
    </Suspense>
  )
}

export default WorkspaceSetupHome