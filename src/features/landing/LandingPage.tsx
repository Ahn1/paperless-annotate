import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  Cpu,
  Eraser,
  EyeOff,
  FileCheck2,
  FileStack,
  FolderSearch,
  GitCompare,
  HardDrive,
  Inbox,
  Lock,
  MonitorSmartphone,
  PenLine,
  PlugZap,
  Save,
  Search,
  ServerOff,
  Tags,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useT, type TranslationKey } from '@/lib/i18n'
import { useSession } from '@/stores/session'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { EditorMockup } from './EditorMockup'

const trust: { icon: LucideIcon; key: TranslationKey }[] = [
  { icon: ServerOff, key: 'landing.trust1' },
  { icon: EyeOff, key: 'landing.trust2' },
  { icon: HardDrive, key: 'landing.trust3' },
  { icon: FileCheck2, key: 'landing.trust4' },
]

const oldSteps: TranslationKey[] = [
  'landing.cmpOld1',
  'landing.cmpOld2',
  'landing.cmpOld3',
  'landing.cmpOld4',
  'landing.cmpOld5',
]
const newSteps: TranslationKey[] = ['landing.cmpNew1', 'landing.cmpNew2', 'landing.cmpNew3']

type Feature = {
  icon: LucideIcon
  title: TranslationKey
  text: TranslationKey
  span: string
  decor?: 'ink' | 'versions' | 'client'
}

const features: Feature[] = [
  { icon: PenLine, title: 'landing.f1.title', text: 'landing.f1.text', span: 'lg:col-span-4', decor: 'ink' },
  { icon: FileStack, title: 'landing.f2.title', text: 'landing.f2.text', span: 'lg:col-span-2', decor: 'versions' },
  { icon: Eraser, title: 'landing.f3.title', text: 'landing.f3.text', span: 'lg:col-span-2' },
  { icon: FolderSearch, title: 'landing.f4.title', text: 'landing.f4.text', span: 'lg:col-span-4', decor: 'client' },
  { icon: BookOpen, title: 'landing.f5.title', text: 'landing.f5.text', span: 'lg:col-span-3' },
  { icon: Lock, title: 'landing.f6.title', text: 'landing.f6.text', span: 'lg:col-span-3' },
]

const proof: { icon: LucideIcon; title: TranslationKey; text: TranslationKey }[] = [
  { icon: Cpu, title: 'landing.p1.title', text: 'landing.p1.text' },
  { icon: BadgeCheck, title: 'landing.p2.title', text: 'landing.p2.text' },
  { icon: Save, title: 'landing.p3.title', text: 'landing.p3.text' },
  { icon: GitCompare, title: 'landing.p4.title', text: 'landing.p4.text' },
  { icon: MonitorSmartphone, title: 'landing.p5.title', text: 'landing.p5.text' },
  { icon: PlugZap, title: 'landing.p6.title', text: 'landing.p6.text' },
]

const steps: { title: TranslationKey; text: TranslationKey }[] = [
  { title: 'landing.s1.title', text: 'landing.s1.text' },
  { title: 'landing.s2.title', text: 'landing.s2.text' },
  { title: 'landing.s3.title', text: 'landing.s3.text' },
]

const faq: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'landing.q1', a: 'landing.a1' },
  { q: 'landing.q2', a: 'landing.a2' },
  { q: 'landing.q3', a: 'landing.a3' },
  { q: 'landing.q4', a: 'landing.a4' },
  { q: 'landing.q5', a: 'landing.a5' },
  { q: 'landing.q6', a: 'landing.a6' },
]

const clientIcons: LucideIcon[] = [Search, Tags, Inbox, Upload, Trash2]

function SectionHeader({ kicker, title }: { kicker: TranslationKey; title: TranslationKey }) {
  const t = useT()
  return (
    <div className="mb-10 text-center">
      <p className="ui-chrome text-xs font-semibold uppercase tracking-widest text-accent">{t(kicker)}</p>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t(title)}</h2>
    </div>
  )
}

export function LandingPage() {
  const t = useT()
  const navigate = useNavigate()
  const hasProfile = useSession((s) => s.profiles.length > 0)

  const primaryCta = () => (hasProfile ? navigate('/') : navigate('/onboarding'))
  const ctaLabel = hasProfile ? t('landing.ctaApp') : t('landing.ctaSetup')

  return (
    <div className="min-h-dvh overflow-x-hidden bg-surface text-ink">
      {/* Kopfzeile */}
      <header className="ui-chrome sticky top-0 z-20 border-b border-line/60 bg-surface/80 backdrop-blur pt-safe">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <PenLine className="size-4.5" />
          </div>
          <span className="font-semibold">{t('app.name')}</span>
          <Button size="sm" className="ml-auto" onClick={primaryCta}>
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="relative">
        {/* Punktraster + Akzent-Schimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
          style={{
            backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 25%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 25%, transparent 75%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-70"
          style={{ background: 'radial-gradient(50% 60% at 50% 0%, var(--accent-soft), transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t('landing.titleA')}{' '}
              <span className="relative inline text-accent">
                {t('landing.titleB')}
                <svg
                  aria-hidden
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-[0.18em] left-0 h-[0.22em] w-full"
                  fill="none"
                >
                  <path
                    d="M4 8 C 60 3, 160 2, 296 6"
                    pathLength={300}
                    className="animate-draw stroke-accent"
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.45}
                  />
                </svg>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
              {t('landing.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={primaryCta}>
                {ctaLabel}
                <ArrowRight className="size-4.5" />
              </Button>
              <a
                href="#how"
                className="ui-chrome inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-1 px-5 text-base font-medium text-ink transition-colors hover:bg-surface-2"
              >
                {t('landing.ctaHow')}
              </a>
            </div>
            <p className="ui-chrome mt-4 text-xs text-ink-faint">{t('landing.heroNote')}</p>
          </div>

          <EditorMockup className="mx-auto mt-14 max-w-4xl" />
        </div>
      </section>

      {/* 2. Vertrauens-Leiste */}
      <section className="mt-16 border-y border-line bg-surface-1">
        <ul className="ui-chrome mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5">
          {trust.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm text-ink-muted">
              <item.icon className="size-4 text-accent" />
              {t(item.key)}
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Problem & Versprechen */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="ui-chrome text-xs font-semibold uppercase tracking-widest text-accent">
              {t('landing.problemKicker')}
            </p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {t('landing.problemTitle')}
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-ink-muted">{t('landing.problemText')}</p>
            <p className="mt-6 border-l-4 border-accent pl-4 font-medium leading-relaxed">
              {t('landing.promiseText')}
            </p>
          </div>

          {/* Vorher/Nachher */}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface-1 shadow-sm">
            <div className="grid sm:grid-cols-2">
              <div className="border-b border-line p-6 sm:border-b-0 sm:border-r">
                <p className="ui-chrome text-xs font-semibold uppercase tracking-widest text-ink-faint">
                  {t('landing.cmpOldTitle')}
                </p>
                <ul className="mt-4 space-y-3">
                  {oldSteps.map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <X className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-accent-soft p-6">
                <p className="ui-chrome text-xs font-semibold uppercase tracking-widest text-accent">
                  {t('landing.cmpNewTitle')}
                </p>
                <ul className="mt-4 space-y-3">
                  {newSteps.map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm font-medium">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm font-medium text-accent">{t('landing.cmpNewNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Lösung (Bento-Grid) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <SectionHeader kicker="landing.featuresKicker" title="landing.featuresTitle" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-line bg-surface-1 p-6 transition-colors hover:border-accent/50',
                feature.span,
              )}
            >
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
                <feature.icon className="size-5.5" />
              </div>
              <h3 className="font-semibold">{t(feature.title)}</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">{t(feature.text)}</p>

              {feature.decor === 'ink' && (
                <svg
                  aria-hidden
                  viewBox="0 0 200 40"
                  className="pointer-events-none absolute -bottom-1 right-4 hidden h-10 w-48 opacity-40 lg:block"
                  fill="none"
                >
                  <path
                    d="M6 28 C 26 4, 40 38, 60 22 S 92 6, 108 26 S 140 40, 158 16 S 182 12, 196 22"
                    className="stroke-accent"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {feature.decor === 'versions' && (
                <div aria-hidden className="ui-chrome mt-4 flex items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-line px-2.5 py-1 text-ink-faint">v1</span>
                  <ArrowRight className="size-3.5 text-ink-faint" />
                  <span className="rounded-full bg-accent px-2.5 py-1 text-accent-fg">v2</span>
                </div>
              )}
              {feature.decor === 'client' && (
                <div aria-hidden className="mt-4 flex items-center gap-2">
                  {clientIcons.map((Icon, i) => (
                    <span
                      key={i}
                      className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink-muted"
                    >
                      <Icon className="size-4" />
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 5. Proof: Technik-Details */}
      <section className="border-y border-line bg-surface-1 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeader kicker="landing.proofKicker" title="landing.proofTitle" />
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {proof.map((item) => (
              <div key={item.title} className="flex gap-3.5">
                <item.icon className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold">{t(item.title)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(item.text)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Drei Schritte */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.stepsTitle')}</h2>
        <ol className="relative grid gap-8 sm:grid-cols-3">
          <div aria-hidden className="absolute left-[18%] right-[18%] top-5 hidden border-t-2 border-dashed border-line sm:block" />
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col items-center text-center">
              <div className="ui-chrome flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg shadow-md">
                {index + 1}
              </div>
              <h3 className="mt-4 font-semibold">{t(step.title)}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">{t(step.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.faqTitle')}</h2>
        <div className="space-y-3">
          {faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-surface-1">
              <summary className="ui-chrome flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {t(item.q)}
                <ChevronDown className="ml-auto size-4.5 shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 7. Finaler CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface-1 px-6 py-14 text-center sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(70% 100% at 50% 0%, var(--accent-soft), transparent 75%)' }}
          />
          <h2 className="relative text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('landing.finalTitle')}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-pretty text-ink-muted">{t('landing.finalText')}</p>
          <div className="relative mt-8 flex justify-center">
            <Button size="lg" onClick={primaryCta}>
              {ctaLabel}
              <ArrowRight className="size-4.5" />
            </Button>
          </div>
          <p className="ui-chrome relative mt-4 text-xs text-ink-faint">{t('landing.heroNote')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="ui-chrome border-t border-line py-8 pb-safe">
        <p className="mx-auto max-w-xl px-4 text-center text-sm text-ink-faint">{t('landing.footer')}</p>
      </footer>
    </div>
  )
}
