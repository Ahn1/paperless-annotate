import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CrudPage } from './CrudPage'
import { CustomFieldsPage } from './CustomFieldsPage'

const tabs = [
  { path: 'tags', key: 'manage.tags' },
  { path: 'correspondents', key: 'manage.correspondents' },
  { path: 'document-types', key: 'manage.documentTypes' },
  { path: 'storage-paths', key: 'manage.storagePaths' },
  { path: 'custom-fields', key: 'manage.customFields' },
] as const

export function ManagePage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('nav.manage')}</h1>
      <nav className="ui-chrome flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
              )
            }
          >
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="tags" replace />} />
        <Route path="tags" element={<CrudPage kind="tags" />} />
        <Route path="correspondents" element={<CrudPage kind="correspondents" />} />
        <Route path="document-types" element={<CrudPage kind="documentTypes" />} />
        <Route path="storage-paths" element={<CrudPage kind="storagePaths" />} />
        <Route path="custom-fields" element={<CustomFieldsPage />} />
      </Routes>
    </div>
  )
}
