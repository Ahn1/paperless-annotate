import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, Download, LogOut, Moon, Paintbrush, Plus, Server, Sun, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NativeSelect } from '@/components/ui/Input'
import { SwitchRow } from '@/components/ui/Switch'
import { useT, useI18nStore, type Lang } from '@/lib/i18n'
import { useThemeStore, type Accent, type ThemeMode } from '@/lib/theme'
import { useSettings, type DocumentViewMode } from '@/stores/settings'
import { useSession } from '@/stores/session'
import { usePwaInstall } from '@/lib/pwaInstall'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mode, accent, setMode, setAccent } = useThemeStore()
  const { lang, setLang } = useI18nStore()
  const settings = useSettings()
  const session = useSession()
  const [cacheCleared, setCacheCleared] = useState(false)

  const themeModes: { value: ThemeMode; label: string; icon?: typeof Sun }[] = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'light', label: t('settings.theme.light'), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
    { value: 'amoled', label: t('settings.theme.amoled') },
  ]
  const accents: { value: Accent; label: string; color: string }[] = [
    { value: 'blue', label: t('settings.accent.blue'), color: 'oklch(0.55 0.19 255)' },
    { value: 'violet', label: t('settings.accent.violet'), color: 'oklch(0.55 0.22 295)' },
    { value: 'green', label: t('settings.accent.green'), color: 'oklch(0.56 0.14 160)' },
    { value: 'amber', label: t('settings.accent.amber'), color: 'oklch(0.66 0.15 60)' },
  ]

  async function clearCache() {
    queryClient.clear()
    if ('caches' in window) {
      for (const key of await caches.keys()) await caches.delete(key)
    }
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('settings.title')}</h1>

      {/* Darstellung */}
      <Section title={t('settings.appearance')} icon={<Paintbrush className="size-4" />}>
        <p className="ui-chrome mb-2 text-sm font-medium text-ink">{t('settings.theme')}</p>
        <div className="ui-chrome grid grid-cols-2 gap-2 sm:grid-cols-4">
          {themeModes.map((tm) => (
            <button
              key={tm.value}
              onClick={() => setMode(tm.value)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                mode === tm.value ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface-1 text-ink-muted hover:bg-surface-2',
              )}
            >
              {tm.label}
            </button>
          ))}
        </div>
        <p className="ui-chrome mb-2 mt-4 text-sm font-medium text-ink">{t('settings.accent')}</p>
        <div className="ui-chrome flex gap-3">
          {accents.map((a) => (
            <button
              key={a.value}
              onClick={() => setAccent(a.value)}
              className="flex size-10 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: a.color, borderColor: accent === a.value ? 'var(--ink)' : 'transparent' }}
              aria-label={a.label}
            >
              {accent === a.value && <Check className="size-5 text-white" />}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="ui-chrome text-sm font-medium text-ink">{t('settings.language')}</span>
            <NativeSelect value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </NativeSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="ui-chrome text-sm font-medium text-ink">{t('settings.defaultView')}</span>
            <NativeSelect value={settings.viewMode} onChange={(e) => settings.setViewMode(e.target.value as DocumentViewMode)}>
              <option value="cards">{t('documents.view.cards')}</option>
              <option value="list">{t('documents.view.list')}</option>
              <option value="table">{t('documents.view.table')}</option>
            </NativeSelect>
          </label>
        </div>
      </Section>

      {/* Lesen */}
      <Section title={t('settings.reading')} icon={<BookOpen className="size-4" />}>
        <SwitchRow
          label={t('settings.rememberPosition')}
          hint={t('settings.rememberPositionHint')}
          checked={settings.rememberPdfPosition}
          onCheckedChange={(v) => settings.set({ rememberPdfPosition: v })}
        />
      </Section>

      {/* Stift */}
      <Section title={t('settings.pen')} icon={<Paintbrush className="size-4" />}>
        <SwitchRow
          label={t('settings.pen.fingerDraws')}
          checked={settings.penFingerDraws}
          onCheckedChange={(v) => settings.set({ penFingerDraws: v })}
        />
        <SwitchRow
          label={t('settings.pen.pressure')}
          checked={settings.penPressure}
          onCheckedChange={(v) => settings.set({ penPressure: v })}
        />
      </Section>

      {/* Server-Profile */}
      <Section title={t('settings.profiles')} icon={<Server className="size-4" />}>
        <DetectedVersion />
        <ul className="space-y-2">
          {session.profiles.map((profile) => {
            const isActive = session.activeProfile?.id === profile.id
            return (
              <li
                key={profile.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  isActive ? 'border-accent bg-accent-soft' : 'border-line bg-surface-1',
                )}
              >
                <button
                  className="ui-chrome min-w-0 flex-1 text-left"
                  onClick={() => void session.switchProfile(profile.id)}
                >
                  <p className="truncate text-sm font-semibold text-ink">
                    {profile.name}
                    {isActive && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-px text-[10px] font-bold text-accent-fg">
                        {t('settings.activeProfile')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{profile.baseUrl}</p>
                  {profile.serverVersion && <p className="text-xs text-ink-faint">Paperless {profile.serverVersion}</p>}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={t('settings.logout')}
                  onClick={() => {
                    if (window.confirm(`${t('settings.logout')}\n${t('settings.logoutHint')}`)) {
                      void session.removeProfile(profile.id)
                    }
                  }}
                >
                  <LogOut className="size-4 text-danger" />
                </Button>
              </li>
            )
          })}
        </ul>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/onboarding')}>
          <Plus className="size-4" />
          {t('settings.addProfile')}
        </Button>

        {/* PIN-Schutz für das aktive Profil (Kap. 8) */}
        {session.activeProfile && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="ui-chrome mb-2 text-xs text-ink-muted">{t('pin.hint')}</p>
            {session.activeProfile.encrypted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm(t('pin.disable') + '?')) void session.disablePin()
                }}
              >
                {t('pin.disable')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const pin = window.prompt(t('pin.set'))
                  if (pin) void session.enablePin(pin)
                }}
              >
                {t('pin.enable')}
              </Button>
            )}
          </div>
        )}
      </Section>

      {/* CORS-Hinweis */}
      <Section title={t('settings.cors.title')} icon={<Server className="size-4" />}>
        <p className="ui-chrome text-sm text-ink-muted">{t('settings.cors.text')}</p>
        <pre className="mt-2 select-all overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-ink">
          PAPERLESS_CORS_ALLOWED_HOSTS={window.location.origin}
        </pre>
      </Section>

      {/* App-Installation (PWA) */}
      <Section title={t('settings.app.title')} icon={<Download className="size-4" />}>
        <InstallApp />
      </Section>

      {/* Cache */}
      <Section title="Cache" icon={<Trash2 className="size-4" />}>
        <Button variant="outline" size="sm" onClick={() => void clearCache()}>
          {cacheCleared ? t('settings.cacheCleared') : t('settings.clearCache')}
        </Button>
      </Section>
    </div>
  )
}

/** Manueller PWA-Install-Trigger über das aufgeschobene beforeinstallprompt-Event. */
function InstallApp() {
  const t = useT()
  const { canInstall, installed, promptInstall } = usePwaInstall()

  if (installed) {
    return (
      <p className="ui-chrome flex items-center gap-2 text-sm text-ink-muted">
        <Check className="size-4 text-accent" />
        {t('settings.app.installed')}
      </p>
    )
  }
  if (!canInstall) {
    return <p className="ui-chrome text-sm text-ink-muted">{t('settings.app.installUnavailable')}</p>
  }
  return (
    <div>
      <p className="ui-chrome mb-2 text-sm text-ink-muted">{t('settings.app.installHint')}</p>
      <Button variant="outline" size="sm" onClick={() => void promptInstall()}>
        <Download className="size-4" />
        {t('settings.app.install')}
      </Button>
    </div>
  )
}

/** Zeigt die erkannte Paperless-Version des aktiven Servers (aus Headern oder API-Verhalten). */
function DetectedVersion() {
  const t = useT()
  const api = useSession((s) => s.api)

  // Günstiger Ping, damit serverInfo/versionDowngraded am Client sicher gesetzt sind
  const { isSuccess } = useQuery({
    queryKey: [api?.client.baseUrl, 'version-probe'],
    queryFn: () => api!.listDocuments({ page: 1, pageSize: 1 }),
    enabled: !!api,
    staleTime: 60 * 1000,
  })

  if (!api) return null
  const { serverVersion, apiVersion } = api.client.serverInfo
  const downgraded = api.client.versionDowngraded

  let label: string
  if (serverVersion) label = `Paperless ${serverVersion}${apiVersion ? ` · API v${apiVersion}` : ''}`
  else if (downgraded) label = t('settings.versionV2')
  else if (isSuccess) label = t('settings.versionV3')
  else label = t('settings.versionUnknown')

  return (
    <div className="mb-3 rounded-xl border border-line bg-surface p-3">
      <p className="ui-chrome text-xs font-medium text-ink-muted">{t('settings.detectedVersion')}</p>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {!serverVersion && <p className="ui-chrome mt-1 text-xs text-ink-faint">{t('settings.versionHint')}</p>}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-4">
      <h2 className="ui-chrome mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}
