import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useSession } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorBox } from '@/components/ui/misc'

/** Sperrbildschirm für PIN-geschützte Profile (Kap. 8). */
export function UnlockScreen() {
  const t = useT()
  const unlock = useSession((s) => s.unlock)
  const profile = useSession((s) => s.activeProfile)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(false)
    const success = await unlock(pin)
    setBusy(false)
    if (!success) {
      setError(true)
      setPin('')
      navigator.vibrate?.([30, 40, 30])
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-4">
      <form
        className="ui-chrome w-full max-w-xs space-y-4 text-center"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <LockKeyhole className="mx-auto size-10 text-accent" />
        <div>
          <h1 className="text-lg font-bold text-ink">{t('pin.title')}</h1>
          {profile && <p className="text-sm text-ink-muted">{profile.name}</p>}
        </div>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder={t('pin.enter')}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="text-center text-lg tracking-[0.5em]"
        />
        {error && <ErrorBox>{t('pin.wrong')}</ErrorBox>}
        <Button type="submit" className="w-full" loading={busy} disabled={pin.length === 0}>
          {t('pin.unlock')}
        </Button>
      </form>
    </div>
  )
}
