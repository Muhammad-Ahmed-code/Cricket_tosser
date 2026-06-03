import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import {
  loginToPurchases,
  logoutFromPurchases,
  checkSubscriptionStatus,
  purchaseYearlyPlan as purchaseFn,
  restorePurchases as restoreFn,
} from './purchases'
import { usageStore } from './usageStore'
import { useSupabaseClient } from './supabaseClient'

export function usePurchases() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const supabase = useSupabaseClient()
  const [isSubscribed, setIsSubscribed] = useState(usageStore.getIsSubscribed())
  const [isLoading, setIsLoading] = useState(false)
  const prevUserIdRef = useRef<string | null | undefined>(undefined)

  // Mirror usageStore changes into local state
  useEffect(() => {
    return usageStore.subscribe(() => setIsSubscribed(usageStore.getIsSubscribed()))
  }, [])

  // When Clerk userId changes → sync RevenueCat identity + re-check entitlements
  useEffect(() => {
    if (!isLoaded) return
    if (prevUserIdRef.current === userId) return
    prevUserIdRef.current = userId

    ;(async () => {
      setIsLoading(true)
      try {
        if (userId) {
          await loginToPurchases(userId)
          const subscribed = await checkSubscriptionStatus()
          await usageStore.setIsSubscribed(subscribed)
          // Best-effort server-side record
          try {
            await supabase
              .from('subscriptions')
              .upsert({ user_id: userId, is_subscribed: subscribed, updated_at: new Date().toISOString() })
          } catch {}
        } else {
          // User signed out — reset to anonymous RevenueCat identity
          await logoutFromPurchases()
          await usageStore.setIsSubscribed(false)
        }
      } catch {
        // Never block the app for a subscription check failure
      } finally {
        setIsLoading(false)
      }
    })()
  }, [userId, isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncAfterPurchase = async (subscribed: boolean) => {
    await usageStore.setIsSubscribed(subscribed)
    if (isSignedIn && userId) {
      try {
        await supabase
          .from('subscriptions')
          .upsert({ user_id: userId, is_subscribed: subscribed, updated_at: new Date().toISOString() })
      } catch {}
    }
  }

  const purchaseYearlyPlan = async (): Promise<boolean> => {
    const success = await purchaseFn()
    if (success) await syncAfterPurchase(true)
    return success
  }

  const restorePurchases = async (): Promise<boolean> => {
    const success = await restoreFn()
    if (success) await syncAfterPurchase(true)
    return success
  }

  return { isSubscribed, isLoading, purchaseYearlyPlan, restorePurchases }
}
