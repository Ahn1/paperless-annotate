import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FileText,
  Home,
  Inbox,
  Menu,
  Search,
  Settings,
  Trash2,
  WifiOff,
  Bookmark,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useOnline } from '@/hooks/useOnline'
import { useSavedViews } from '@/hooks/data'
import { useSession } from '@/stores/session'

interface NavItem {
  to: string
  key: TranslationKey
  icon: LucideIcon
}

const primaryNav: NavItem[] = [
  { to: '/', key: 'nav.dashboard', icon: Home },
  { to: '/documents', key: 'nav.documents', icon: FileText },
  { to: '/inbox', key: 'nav.inbox', icon: Inbox },
]

const secondaryNav: NavItem[] = [
  { to: '/manage', key: 'nav.manage', icon: Tags },
  { to: '/trash', key: 'nav.trash', icon: Trash2 },
  { to: '/settings', key: 'nav.settings', icon: Settings },
]

export function AppShell() {
  const t = useT()
  const online = useOnline()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const savedViews = useSavedViews()
  const profile = useSession((s) => s.activeProfile)

  // Tastaturkürzel: "/" fokussiert die Suche
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (event.key === '/' && !target.closest('input, textarea, [contenteditable]')) {
        event.preventDefault()
        navigate('/documents?focus=search')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const sidebarViews = (savedViews.data ?? []).filter((v) => v.show_in_sidebar)

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      {/* Sidebar – Tablet/Desktop */}
      <aside
        className={cn(
          'ui-chrome hidden shrink-0 flex-col border-r border-line bg-surface-1 transition-all sm:flex',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        <div className="flex h-14 items-center gap-2 px-3 pt-safe">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </button>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{t('app.name')}</p>
              {profile && <p className="truncate text-xs text-ink-faint">{profile.name}</p>}
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {primaryNav.map((item) => (
            <SidebarLink key={item.to} item={item} label={t(item.key)} collapsed={!sidebarOpen} />
          ))}
          {sidebarViews.length > 0 && sidebarOpen && (
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {t('nav.savedViews')}
            </p>
          )}
          {sidebarViews.map((view) => (
            <NavLink
              key={view.id}
              to={`/documents?view=${view.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted hover:bg-surface-2"
            >
              <Bookmark className="size-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{view.name}</span>}
            </NavLink>
          ))}
          <div className="pt-4">
            {secondaryNav.map((item) => (
              <SidebarLink key={item.to} item={item} label={t(item.key)} collapsed={!sidebarOpen} />
            ))}
          </div>
        </nav>
      </aside>

      {/* Hauptbereich */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!online && (
          <div className="ui-chrome flex items-center justify-center gap-2 bg-warning/20 px-3 py-1.5 text-xs font-medium text-ink pt-safe">
            <WifiOff className="size-3.5" />
            {t('common.offline')}
          </div>
        )}
        <main id="app-scroll" className="min-h-0 flex-1 overflow-y-auto pb-20 sm:pb-0">
          <Outlet />
        </main>

        {/* Bottom-Tab-Bar – Phone */}
        <nav className="ui-chrome fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface-1/95 backdrop-blur pb-safe sm:hidden">
          {[
            primaryNav[0],
            primaryNav[1],
            { to: '/search', key: 'nav.search' as TranslationKey, icon: Search },
            { to: '/settings', key: 'nav.more' as TranslationKey, icon: Settings },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  isActive ? 'text-accent' : 'text-ink-muted',
                )
              }
              onClick={(e) => {
                if (item.to === '/search') {
                  e.preventDefault()
                  navigate('/documents?focus=search')
                }
              }}
            >
              <item.icon className="size-5" />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function SidebarLink({ item, label, collapsed }: { item: NavItem; label: string; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      viewTransition
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2',
          collapsed && 'justify-center px-2',
        )
      }
      title={label}
    >
      <item.icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}
