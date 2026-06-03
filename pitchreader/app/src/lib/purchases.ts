import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: 'test_dQNPbMKWefaZWdETmUFdYBXxDew',
  android: 'test_dQNPbMKWefaZWdETmUFdYBXxDew',
}

const ENTITLEMENT_ID = 'premium'
const YEARLY_PRODUCT_ID = 'pitchreader_yearly_399'

export function configurePurchases(): void {
  Purchases.setLogLevel(LOG_LEVEL.ERROR)
  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android
  Purchases.configure({ apiKey })
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
  } catch {
    return false
  }
}

export async function purchaseYearlyPlan(): Promise<boolean> {
  const offerings = await Purchases.getOfferings()
  const packages = offerings.current?.availablePackages ?? []
  // Match by product ID first, fall back to any annual package, then first available
  const pkg =
    packages.find(p => p.product.identifier === YEARLY_PRODUCT_ID) ??
    packages.find(p => p.packageType === 'ANNUAL') ??
    packages[0]
  if (!pkg) throw new Error('No products available. Check RevenueCat dashboard setup.')
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
}

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases()
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
}

export async function loginToPurchases(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId)
  } catch {
    // non-fatal — RevenueCat login failure should never block the app
  }
}

export async function logoutFromPurchases(): Promise<void> {
  try {
    await Purchases.logOut()
  } catch {
    // non-fatal — logOut on an already-anonymous session may error; safe to swallow
  }
}
