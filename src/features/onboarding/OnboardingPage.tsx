import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ServerCog, KeyRound, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { ErrorBox, InfoBox } from '@/components/ui/misc'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { isLocalUrl, normalizeBaseUrl, obtainToken, probeServer, PaperlessClient, API_VERSION } from '@/api/client'
import { useSession } from '@/stores/session'
import type { ServerProfile } from '@/lib/db'

type Step = 0 | 1 | 2

interface ProbeOk {
  baseUrl: string
  apiVersion: number | null
  serverVersion: string | null
}

export function OnboardingPage() {
  const t = useT()
  const navigate = useNavigate()
  const addProfile = useSession((s) => s.addProfile)

  const [step, setStep] = useState<Step>(0)
  const [probeResult, setProbeResult] = useState<ProbeOk | null>(null)
  const [profileName, setProfileName] = useState('')

  const steps = [t('onboarding.serverStep'), t('onboarding.authStep'), t('onboarding.doneStep')]

  async function finish(token: string) {
    if (!probeResult) return
    const profile: ServerProfile = {
      id: crypto.randomUUID(),
      name: profileName || new URL(probeResult.baseUrl).hostname,
      baseUrl: probeResult.baseUrl,
      token,
      apiVersion: probeResult.apiVersion ?? undefined,
      serverVersion: probeResult.serverVersion ?? undefined,
      createdAt: new Date().toISOString(),
    }
    await addProfile(profile)
    setStep(2)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-4 pt-safe pb-safe">
      <div className="w-full max-w-md">
        <h1 className="ui-chrome mb-1 text-center text-2xl font-bold text-ink">{t('app.name')}</h1>
        <p className="ui-chrome mb-6 text-center text-sm text-ink-muted">{t('onboarding.title')}</p>

        {/* Schritt-Anzeige */}
        <ol className="ui-chrome mb-6 flex items-center justify-center gap-2">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                  i < step ? 'bg-accent text-accent-fg' : i === step ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-faint',
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn('text-sm', i === step ? 'font-medium text-ink' : 'text-ink-faint')}>{label}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" />}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-line bg-surface-1 p-5 shadow-sm">
          {step === 0 && (
            <ServerStep
              onDone={(result, name) => {
                setProbeResult(result)
                setProfileName(name)
                setStep(1)
              }}
            />
          )}
          {step === 1 && probeResult && <AuthStep baseUrl={probeResult.baseUrl} onDone={finish} onBack={() => setStep(0)} />}
          {step === 2 && (
            <div className="ui-chrome flex flex-col items-center gap-4 py-6 text-center">
              <PartyPopper className="size-12 text-accent" />
              <p className="text-ink">{t('onboarding.doneText')}</p>
              <Button size="lg" onClick={() => navigate('/', { replace: true })}>
                {t('onboarding.start')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ServerStep({ onDone }: { onDone: (result: ProbeOk, profileName: string) => void }) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corsHelp, setCorsHelp] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  async function test() {
    setError(null)
    setCorsHelp(false)
    setWarning(null)
    const baseUrl = normalizeBaseUrl(url)
    let parsed: URL
    try {
      parsed = new URL(baseUrl)
    } catch {
      setError(t('onboarding.unreachable'))
      return
    }
    if (parsed.protocol !== 'https:' && !isLocalUrl(baseUrl)) {
      setError(t('onboarding.httpsOnly'))
      return
    }
    if (parsed.protocol === 'http:') setWarning(t('onboarding.localHttpWarning'))

    setBusy(true)
    try {
      const result = await probeServer(baseUrl)
      if (!result.ok) {
        if (result.reason === 'cors') {
          setError(t('onboarding.corsError'))
          setCorsHelp(true)
        } else {
          setError(t('onboarding.unreachable'))
        }
        return
      }
      if (result.apiVersion !== null && result.apiVersion < API_VERSION) setWarning(t('onboarding.oldServer'))
      onDone({ baseUrl, apiVersion: result.apiVersion, serverVersion: result.serverVersion }, name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void test()
      }}
    >
      <Field label={t('onboarding.serverUrl')} hint={t('onboarding.serverUrlHint')}>
        <Input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="https://paperless.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </Field>
      <Field label={t('onboarding.profileName')} hint="Optional">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zuhause" />
      </Field>
      {warning && <InfoBox>{warning}</InfoBox>}
      {error && (
        <ErrorBox>
          {error}
          {corsHelp && (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/20 p-2 text-xs">
              PAPERLESS_CORS_ALLOWED_HOSTS={window.location.origin}
            </pre>
          )}
        </ErrorBox>
      )}
      <Button type="submit" className="w-full" loading={busy}>
        <ServerCog className="size-4" />
        {t('onboarding.testConnection')}
      </Button>
    </form>
  )
}

function AuthStep({ baseUrl, onDone, onBack }: { baseUrl: string; onDone: (token: string) => Promise<void>; onBack: () => void }) {
  const t = useT()
  const [method, setMethod] = useState<'credentials' | 'token'>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      const finalToken = method === 'credentials' ? await obtainToken(baseUrl, username, password) : token.trim()
      // Token validieren, bevor das Profil gespeichert wird
      const client = new PaperlessClient(baseUrl, finalToken)
      await client.get('/api/documents/', { page_size: 1 })
      await onDone(finalToken)
    } catch {
      setError(t('onboarding.loginFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="ui-chrome grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(['credentials', 'token'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={cn(
              'rounded-lg px-2 py-2 text-sm font-medium transition-colors',
              method === m ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-muted',
            )}
          >
            {m === 'credentials' ? t('onboarding.withCredentials') : t('onboarding.withToken')}
          </button>
        ))}
      </div>

      {method === 'credentials' ? (
        <>
          <Field label={t('onboarding.username')}>
            <Input autoComplete="username" autoCapitalize="off" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label={t('onboarding.password')} hint={t('onboarding.passwordHint')}>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
        </>
      ) : (
        <Field label={t('onboarding.token')} hint={t('onboarding.tokenHint')}>
          <Input autoCapitalize="off" autoCorrect="off" value={token} onChange={(e) => setToken(e.target.value)} required />
        </Field>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('common.back')}
        </Button>
        <Button type="submit" className="flex-1" loading={busy}>
          <KeyRound className="size-4" />
          {t('onboarding.login')}
        </Button>
      </div>
    </form>
  )
}
