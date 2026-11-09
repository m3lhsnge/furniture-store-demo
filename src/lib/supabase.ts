import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

let rememberSession: boolean | null = null
const browserStorage = typeof window === 'undefined' ? undefined : {
  getItem(storageKey: string) {
    return window.sessionStorage.getItem(storageKey) ?? window.localStorage.getItem(storageKey)
  },
  setItem(storageKey: string, value: string) {
    const persistent = rememberSession ?? (window.sessionStorage.getItem(storageKey) === null && window.localStorage.getItem(storageKey) !== null)
    const target = persistent ? window.localStorage : window.sessionStorage
    const other = persistent ? window.sessionStorage : window.localStorage
    target.setItem(storageKey, value)
    other.removeItem(storageKey)
  },
  removeItem(storageKey: string) {
    window.sessionStorage.removeItem(storageKey)
    window.localStorage.removeItem(storageKey)
    rememberSession = null
  },
}

export function setRememberSession(remember: boolean) {
  rememberSession = remember
}

// No configuration means local demo mode. Never use secret/service-role keys here.
export const supabase = url && key ? createClient(url, key, { auth: { storage: browserStorage } }) : null
