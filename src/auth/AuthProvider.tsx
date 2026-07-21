import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { clearOfflineCache, flushOfflineQueue, resumeIfAuthed } from '@/lib/offline'
import { PLANS, type PlanInfo } from '@/lib/constants'
import type { Profile, Subscription, Tenant } from '@/types/db'

interface AuthState {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  tenant: Tenant | null
  subscription: Subscription | null
  plan: PlanInfo
  needsOnboarding: boolean
  isPlatformAdmin: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const mounted = useRef(true)
  // Contador de generación: descarta resultados de cargas obsoletas (p.ej. si el
  // usuario cambia mientras una carga anterior sigue en vuelo).
  const loadSeq = useRef(0)

  const loadContext = useCallback(async (uid: string | undefined) => {
    const seq = ++loadSeq.current
    const isStale = () => !mounted.current || seq !== loadSeq.current

    if (!uid) {
      setProfile(null)
      setTenant(null)
      setSubscription(null)
      setIsPlatformAdmin(false)
      return
    }
    const [{ data: prof }, { data: isAdmin }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.rpc('auth_is_platform_admin'),
    ])

    if (isStale()) return
    setProfile(prof as Profile | null)
    setIsPlatformAdmin(Boolean(isAdmin))

    if (prof?.tenant_id) {
      const [{ data: t }, { data: sub }] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', prof.tenant_id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('tenant_id', prof.tenant_id).maybeSingle(),
      ])
      if (isStale()) return
      setTenant(t as Tenant | null)
      setSubscription(sub as Subscription | null)
    } else {
      setTenant(null)
      setSubscription(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadContext(data.session?.user?.id)
  }, [loadContext])

  useEffect(() => {
    mounted.current = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      await loadContext(data.session?.user?.id)
      if (mounted.current) setLoading(false)
      // Con sesión ya presente, intenta subir pagos que quedaron en cola.
      if (data.session) void resumeIfAuthed(queryClient)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadContext(newSession?.user?.id)
      // Tras (re)iniciar sesión, sube la cola offline del mismo usuario.
      if (newSession) void resumeIfAuthed(queryClient)
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadContext])

  const signOut = useCallback(async () => {
    // 1) Sube la cola offline mientras el token AÚN es válido (si hay red).
    await flushOfflineQueue(queryClient)
    // 2) Revoca la sesión.
    await supabase.auth.signOut()
    setProfile(null)
    setTenant(null)
    setSubscription(null)
    setIsPlatformAdmin(false)
    // 3) Limpia SOLO las lecturas (higiene). clearOfflineCache CONSERVA la cola de
    //    pagos sin subir para no perder dinero: se reintenta en el próximo login.
    await clearOfflineCache(queryClient)
  }, [])

  const value = useMemo<AuthState>(() => {
    const planCode = subscription?.plan ?? 'basic'
    return {
      loading,
      session,
      user: session?.user ?? null,
      profile,
      tenant,
      subscription,
      plan: PLANS[planCode],
      // El super-admin de plataforma no pertenece a un tenant: no debe caer en onboarding.
      needsOnboarding: Boolean(session?.user) && !profile?.tenant_id && !isPlatformAdmin,
      isPlatformAdmin,
      refresh,
      signOut,
    }
  }, [loading, session, profile, tenant, subscription, isPlatformAdmin, refresh, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
