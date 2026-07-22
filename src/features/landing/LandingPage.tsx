import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  WifiOff,
  ReceiptText,
  UserRound,
  LayoutDashboard,
  BellRing,
  BarChart3,
  CheckCircle2,
  Check,
  PlayCircle,
  PiggyBank,
  Cloud,
  ChevronDown,
  Menu,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// OJO: precio de Premium. La app maneja "plan + límites" (sin pasarela de pago),
// así que este valor es de MARKETING. Confírmalo/ajústalo antes de desplegar.
const PRECIO_PREMIUM = 'RD$300'
const PERIODO_PREMIUM = '/mes'
// ────────────────────────────────────────────────────────────────────────────

/** Desplaza suavemente a una sección por id (sin tocar el hash del router). */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Landing page pública de marketing (ruta `/` para visitantes no autenticados).
 * Diseño generado en Stitch ("MisanRD - Landing Page Marketing") y reconstruido
 * como componente nativo con los tokens de marca (brand/gold) e íconos lucide.
 */
export function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-brand-950">
      <Navbar />
      <Hero />
      <MetricsBar />
      <Features />
      <HowItWorks />
      <PortalBlock />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  )
}

/* ── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  const links = [
    { id: 'funciones', label: 'Funciones' },
    { id: 'proceso', label: 'Cómo funciona' },
    { id: 'precios', label: 'Precios' },
    { id: 'faq', label: 'Preguntas' },
  ]
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <BrandMark />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollToId(l.id)}
              className="text-sm font-semibold text-slate-500 transition-colors hover:text-brand-600"
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-600 sm:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 active:scale-95"
          >
            Empezar gratis
          </Link>
          <button
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => scrollToId('funciones')}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt=""
        className="h-9 w-9 object-contain"
      />
      <span
        className={`text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-brand-950'}`}
      >
        Misan<span className={dark ? 'text-gold-400' : 'text-brand-500'}>RD</span>
      </span>
    </div>
  )
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* patrón de puntos sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(30,99,240,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="text-center lg:text-left">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <ShieldCheck className="h-4 w-4" />
            Fintech dominicana
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-950 sm:text-5xl lg:text-6xl">
            Tu san, digital y <span className="text-brand-500">sin líos</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
            Organiza, cobra y entrega los turnos de tus sanes desde el celular. Adiós al
            cuaderno, adiós a los errores.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Empezar gratis
            </Link>
            <button
              onClick={() => scrollToId('proceso')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-200 px-8 py-4 text-base font-semibold text-brand-600 transition-all hover:bg-brand-50"
            >
              <PlayCircle className="h-5 w-5" />
              Ver cómo funciona
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500 lg:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <WifiOff className="h-4 w-4" /> Sin internet
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <ReceiptText className="h-4 w-4" /> Recibos automáticos
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-4 w-4" /> Portal de participantes
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-6 rounded-[40px] bg-brand-500/10 blur-3xl" />
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}

/** Mockup de un san dentro de un marco de teléfono (puro CSS, sin imágenes). */
function PhoneMockup() {
  const rows = [
    { name: 'Doña Rosa', turn: 'Turno 1', paid: true },
    { name: 'Miguel A.', turn: 'Turno 2', paid: true },
    { name: 'Yorky P.', turn: 'Turno 3', paid: true },
    { name: 'Carmen L.', turn: 'Turno 4', paid: false },
  ]
  return (
    <div className="relative rounded-[2.2rem] border-[6px] border-brand-950 bg-white p-3 shadow-2xl">
      {/* badge flotante */}
      <div className="absolute right-4 top-6 z-10 flex animate-bounce items-center gap-1 rounded-lg bg-gold-400 px-2.5 py-1.5 text-xs font-bold text-brand-950 shadow-lg">
        <CheckCircle2 className="h-4 w-4" /> Al día
      </div>
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-400">San activo</p>
        <h3 className="text-lg font-bold text-brand-950">San Navidad 2026</h3>
        <div className="mt-3 rounded-2xl bg-white p-3 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-500">Recaudado</span>
            <span className="text-sm font-semibold text-brand-950">8 de 12 cuotas</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-brand-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Cuota RD$2,000</span>
            <span className="text-xs font-medium text-brand-600">Pote RD$24,000</span>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-card"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                {r.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-brand-950">{r.name}</p>
                <p className="text-[10px] text-slate-400">{r.turn}</p>
              </div>
              {r.paid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                  <Check className="h-3 w-3" /> Pagó
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  Pendiente
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Métricas ───────────────────────────────────────────────────────────── */

function MetricsBar() {
  const items = [
    { icon: PiggyBank, big: '+1,000', small: 'Sanes gestionados' },
    { icon: WifiOff, big: 'Pagos offline', small: '100% seguros' },
    { icon: Cloud, big: 'En la nube', small: 'Sincronización total' },
  ]
  return (
    <section className="bg-brand-950">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        {items.map((it) => (
          <div key={it.small} className="flex items-center gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <it.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{it.big}</div>
              <div className="text-sm text-white/60">{it.small}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Funciones ──────────────────────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Gestión de sanes',
      desc: 'Crea múltiples sanes, define la cuota y el calendario de turnos se genera solo.',
      tone: 'brand',
    },
    {
      icon: WifiOff,
      title: 'Cobros puerta a puerta',
      desc: 'Registra cobros sin internet en el barrio y se sincronizan cuando tengas datos.',
      tone: 'gold',
    },
    {
      icon: ReceiptText,
      title: 'Recibos automáticos',
      desc: 'Cada pago genera su comprobante digital, listo para compartir por WhatsApp.',
      tone: 'brand',
    },
    {
      icon: UserRound,
      title: 'Portal de participantes',
      desc: 'Tus miembros ven su historial y sus turnos desde un enlace web privado.',
      tone: 'brand',
    },
    {
      icon: BellRing,
      title: 'Recordatorios por WhatsApp',
      desc: 'Avisa turnos y fechas de cobro con un clic para evitar atrasos.',
      tone: 'green',
    },
    {
      icon: BarChart3,
      title: 'Reportes claros',
      desc: 'Visualiza quién debe, quién pagó y cuánto capital hay en movimiento.',
      tone: 'gold',
    },
  ] as const
  const toneMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    gold: 'bg-gold-100 text-gold-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <section id="funciones" className="scroll-mt-24 bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Todo lo que necesitas para tu san"
          subtitle="Digitaliza el proceso tradicional sin perder la confianza de tu comunidad."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${toneMap[f.tone]}`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-brand-950">{f.title}</h3>
              <p className="text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Cómo funciona ──────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: 'Crea tu san',
      desc: 'Configura el nombre, el monto de la cuota y los participantes en menos de 2 minutos.',
    },
    {
      n: 2,
      title: 'Registra pagos',
      desc: 'Cada vez que recibas dinero, márcalo en la app. El sistema genera el recibo por ti.',
    },
    {
      n: 3,
      title: 'Comparte el portal',
      desc: 'Tus participantes entran desde su teléfono y ven la transparencia de su dinero.',
    },
  ]
  return (
    <section id="proceso" className="scroll-mt-24 overflow-hidden bg-white py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="order-2 space-y-8 lg:order-1">
          <SectionHeading
            align="left"
            title="Así de fácil"
            subtitle="De la libreta al celular en tres pasos."
          />
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  s.n === 1 ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600'
                }`}
              >
                {s.n}
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-950">{s.title}</h3>
                <p className="mt-0.5 text-slate-600">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative order-1 lg:order-2">
          <div className="absolute -right-8 -top-8 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="relative rotate-2 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white">
              <PiggyBank className="h-12 w-12 text-gold-300" />
              <p className="mt-4 text-2xl font-extrabold leading-tight">
                Todo tu san, en un solo lugar.
              </p>
              <p className="mt-2 text-white/70">
                Sin cuadernos que se pierden. Sin cuentas que no cuadran.
              </p>
            </div>
            <div className="absolute -bottom-6 -left-6 max-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <p className="text-sm italic text-slate-600">
                "Antes usaba cuadernos que se perdían, ahora todo está en mi celular."
              </p>
              <p className="mt-2 text-xs font-bold text-brand-600">Doña Rosa, sanera</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Portal ─────────────────────────────────────────────────────────────── */

function PortalBlock() {
  const perks = [
    'Su próximo turno de entrega',
    'Cuántas cuotas llevan pagadas',
    'Historial de recibos descargables',
  ]
  return (
    <section id="portal" className="scroll-mt-24 bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[40px] bg-brand-950 p-8 text-white sm:p-12 lg:p-16">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-500/20 to-transparent" />
          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Transparencia que genera confianza
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Elimina las dudas y las llamadas constantes. Tus participantes tienen un
                portal exclusivo donde pueden ver:
              </p>
              <ul className="mt-6 space-y-4">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-gold-400" />
                    <span className="text-white/90">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <PortalMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Mockup del portal del participante (puro CSS). */
function PortalMockup() {
  return (
    <div className="rounded-xl bg-white p-5 text-brand-950 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
          L
        </div>
        <div>
          <p className="text-sm font-bold">Lourdes M.</p>
          <p className="text-xs text-slate-400">San Navidad 2026</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-brand-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Próxima entrega</p>
            <p className="text-lg font-bold text-brand-950">15 de dic.</p>
          </div>
          <div className="rounded-lg bg-gold-400 px-2.5 py-1 text-xs font-bold text-brand-950">
            Turno 6
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Mis pagos
      </p>
      <div className="mt-2 space-y-1.5">
        {['Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
          <div
            key={m}
            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
          >
            <span className="text-sm text-slate-600">{m}</span>
            {i < 2 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                <Check className="h-3.5 w-3.5" /> Pagado
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">Pendiente</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Precios ────────────────────────────────────────────────────────────── */

function Pricing() {
  return (
    <section id="precios" className="scroll-mt-24 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Planes que crecen contigo"
          subtitle="Prueba gratis y escala cuando lo necesites."
        />
        <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Básico */}
          <div className="flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 text-center">
            <h3 className="text-xl font-bold text-brand-950">Básico</h3>
            <p className="mt-4 text-4xl font-black text-brand-950">Gratis</p>
            <ul className="mt-8 flex-1 space-y-4 text-left">
              {[
                'Hasta 2 sanes activos',
                'Hasta 30 participantes',
                'Cobros y recibos básicos',
                'Portal para participantes',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-slate-600">
                  <Check className="h-5 w-5 flex-shrink-0 text-brand-500" /> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/registro"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl border-2 border-brand-500 py-3.5 font-bold text-brand-600 transition-all hover:bg-brand-50"
            >
              Empezar ahora
            </Link>
          </div>

          {/* Premium */}
          <div className="relative flex flex-col rounded-[32px] bg-brand-500 p-8 text-center text-white shadow-2xl shadow-brand-500/30">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-400 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-950 shadow-md">
              Recomendado
            </span>
            <h3 className="text-xl font-bold">Premium</h3>
            <p className="mt-4 text-4xl font-black">
              {PRECIO_PREMIUM}
              <span className="text-base font-medium text-white/60">{PERIODO_PREMIUM}</span>
            </p>
            <ul className="mt-8 flex-1 space-y-4 text-left">
              {[
                'Sanes ilimitados',
                'Varios administradores',
                'Reportes avanzados',
                'Soporte prioritario',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <Check className="h-5 w-5 flex-shrink-0 text-gold-300" /> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/registro"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gold-400 py-3.5 font-bold text-brand-950 shadow-xl transition-all hover:scale-[1.02]"
            >
              Empezar con Premium
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */

function Faq() {
  const items = [
    {
      q: '¿Qué es un san?',
      a: 'Es una forma tradicional de ahorro comunitario muy popular en RD, donde un grupo de personas aporta una cuota fija periódica y cada miembro recibe el fondo total en turnos rotativos.',
    },
    {
      q: '¿Funciona sin internet?',
      a: '¡Sí! La app está pensada para el cobrador que se mueve por el barrio. Puedes registrar pagos sin conexión y se sincronizan automáticamente cuando vuelvas a tener datos o WiFi.',
    },
    {
      q: '¿Mis participantes necesitan cuenta?',
      a: 'No. Ellos acceden a su portal con un enlace único y privado, sin necesidad de descargar la app ni crear una cuenta.',
    },
    {
      q: '¿Es seguro?',
      a: 'Tus datos viajan cifrados y se guardan en la nube con aislamiento por negocio. Solo tú y los administradores que autorices tienen acceso.',
    },
    {
      q: '¿Cuánto cuesta?',
      a: `Puedes empezar gratis con el plan Básico. Cuando necesites más sanes o administradores, el plan Premium cuesta ${PRECIO_PREMIUM}${PERIODO_PREMIUM}.`,
    },
  ]
  return (
    <section id="faq" className="scroll-mt-24 bg-slate-50 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Preguntas frecuentes" />
        <div className="mt-12 space-y-4">
          {items.map((it, i) => (
            <details
              key={it.q}
              open={i === 0}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold text-brand-950">
                {it.q}
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100 p-5 pt-4 text-slate-600">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── CTA final ──────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="bg-slate-50 px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-gradient-to-br from-brand-500 to-brand-800 p-10 text-center text-white shadow-2xl sm:p-16">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Empieza a manejar tus sanes hoy
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Únete a los saneros que ya confían en la tecnología para organizar sus finanzas
            comunitarias.
          </p>
          <Link
            to="/registro"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gold-400 px-10 py-5 text-lg font-bold text-brand-950 shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer() {
  const cols: { title: string; items: { label: string; id?: string }[] }[] = [
    {
      title: 'Producto',
      items: [
        { label: 'Funciones', id: 'funciones' },
        { label: 'Precios', id: 'precios' },
        { label: 'Portal del participante', id: 'portal' },
      ],
    },
    { title: 'Empresa', items: [{ label: 'Sobre nosotros' }, { label: 'Contacto' }] },
    { title: 'Legal', items: [{ label: 'Privacidad' }, { label: 'Términos' }] },
  ]
  return (
    <footer className="bg-brand-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <BrandMark dark />
            <p className="mt-4 text-sm text-white/60">
              Digitalizando la tradición para un futuro financiero más seguro y transparente
              en la República Dominicana.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="mb-4 font-bold text-white">{c.title}</h4>
                <ul className="space-y-2.5 text-sm">
                  {c.items.map((it) =>
                    it.id ? (
                      <li key={it.label}>
                        <button
                          onClick={() => scrollToId(it.id!)}
                          className="text-white/50 transition-colors hover:text-gold-400"
                        >
                          {it.label}
                        </button>
                      </li>
                    ) : (
                      <li key={it.label} className="text-white/40" title="Próximamente">
                        {it.label}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          © 2026 MisanRD · misanrd.com. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function SectionHeading({
  title,
  subtitle,
  align = 'center',
}: {
  title: string
  subtitle?: string
  align?: 'center' | 'left'
}): ReactNode {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <h2 className="text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-lg text-slate-600">{subtitle}</p>}
    </div>
  )
}
