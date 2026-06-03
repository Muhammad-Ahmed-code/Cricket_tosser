import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-expo'
import { useRef, useMemo } from 'react'

// Add to your .env:
//   EXPO_PUBLIC_SUPABASE_URL=https://algpyxoyblkhzilruvll.supabase.co
//   EXPO_PUBLIC_ANON_KEY=<your-anon-key>
//
// Clerk dashboard setup:
//   1. JWT Templates → New template named exactly "supabase"
//      Algorithm: RS256
//      Claims: { "sub": "{{user.id}}", "aud": "authenticated", "role": "authenticated" }
//   2. Copy the JWKS endpoint URL from Clerk (API Keys → Advanced → JWKS URL)
//
// Supabase dashboard setup:
//   Settings → API → JWT Settings → paste the Clerk JWKS URL as "JWKS URL"
//   (Supabase will verify Clerk JWTs using the public keys from that endpoint)

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_ANON_KEY!

export function useSupabaseClient() {
  const { getToken } = useAuth()

  // Ref keeps the latest getToken without re-creating the client on every render
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(() =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
          const token = await getTokenRef.current({ template: 'supabase' }).catch(() => null)
          const headers = new Headers((options?.headers as HeadersInit) || {})
          headers.set('Authorization', `Bearer ${token ?? SUPABASE_ANON_KEY}`)
          headers.set('apikey', SUPABASE_ANON_KEY)
          return fetch(url, { ...options, headers })
        },
      },
    }),
  []) // eslint-disable-line react-hooks/exhaustive-deps
}
