import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CloudUpload, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Field, Input, NativeSelect } from '@/components/ui/Input'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useApi } from '@/stores/session'
import { useCorrespondents, useDocumentTypes } from '@/hooks/data'
import { TagPicker } from '@/features/documents/TagPicker'

/** Upload-Zone (Drag & Drop + Dateiauswahl) mit optionalen Vorab-Metadaten und Task-Verfolgung. */
export function UploadZone() {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [metaOpen, setMetaOpen] = useState(false)
  const [watchedTasks, setWatchedTasks] = useState<string[]>([])

  const upload = useMutation({
    mutationFn: (args: { file: File; title?: string; tags?: number[]; correspondent?: number; documentType?: number }) =>
      api.uploadDocument(args),
    onSuccess: (taskId) => {
      setWatchedTasks((prev) => [...prev, taskId])
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'tasks'] })
    },
  })

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = [...files]
      if (list.length === 0) return
      setPendingFiles(list)
      setMetaOpen(true)
    },
    [],
  )

  async function uploadAll(meta: { title?: string; tags?: number[]; correspondent?: number; documentType?: number }) {
    for (const file of pendingFiles) {
      await upload.mutateAsync({ file, ...meta, title: pendingFiles.length === 1 ? meta.title : undefined })
    }
    setPendingFiles([])
    setMetaOpen(false)
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'ui-chrome flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-accent bg-accent-soft' : 'border-line bg-surface-1 hover:border-accent/60',
        )}
      >
        <CloudUpload className={cn('size-8', dragOver ? 'text-accent' : 'text-ink-faint')} />
        <p className="text-sm font-medium text-ink-muted">{t('upload.drop')}</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <UploadMetaDialog
        open={metaOpen}
        fileCount={pendingFiles.length}
        fileName={pendingFiles[0]?.name}
        busy={upload.isPending}
        onCancel={() => {
          setMetaOpen(false)
          setPendingFiles([])
        }}
        onSubmit={uploadAll}
      />

      <TaskList watchedTasks={watchedTasks} />
    </div>
  )
}

function UploadMetaDialog({
  open,
  fileCount,
  fileName,
  busy,
  onCancel,
  onSubmit,
}: {
  open: boolean
  fileCount: number
  fileName?: string
  busy: boolean
  onCancel: () => void
  onSubmit: (meta: { title?: string; tags?: number[]; correspondent?: number; documentType?: number }) => Promise<void>
}) {
  const t = useT()
  const { data: correspondents = [] } = useCorrespondents()
  const { data: documentTypes = [] } = useDocumentTypes()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<number[]>([])
  const [correspondent, setCorrespondent] = useState('')
  const [documentType, setDocumentType] = useState('')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent title={t('upload.withMeta')} description={fileCount === 1 ? fileName : `${fileCount} Dateien`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit({
              title: title || undefined,
              tags: tags.length ? tags : undefined,
              correspondent: correspondent ? Number(correspondent) : undefined,
              documentType: documentType ? Number(documentType) : undefined,
            }).then(() => {
              setTitle('')
              setTags([])
              setCorrespondent('')
              setDocumentType('')
            })
          }}
        >
          {fileCount === 1 && (
            <Field label={t('detail.title')}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fileName?.replace(/\.[^.]+$/, '')} />
            </Field>
          )}
          <Field label={t('documents.filter.tags')}>
            <TagPicker selected={tags} onChange={setTags} />
          </Field>
          <Field label={t('documents.filter.correspondent')}>
            <NativeSelect value={correspondent} onChange={(e) => setCorrespondent(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {correspondents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('documents.filter.documentType')}>
            <NativeSelect value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {documentTypes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit" className="w-full" loading={busy}>
            {t('common.upload')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Zeigt den Verarbeitungsstatus der zuletzt hochgeladenen Dateien (Polling auf /api/tasks/). */
function TaskList({ watchedTasks }: { watchedTasks: string[] }) {
  const t = useT()
  const api = useApi()

  const { data: tasks } = useQuery({
    queryKey: [api.client.baseUrl, 'tasks'],
    queryFn: () => api.listTasks(),
    enabled: watchedTasks.length > 0,
    refetchInterval: (query) => {
      const relevant = (query.state.data ?? []).filter((task) => watchedTasks.includes(task.task_id))
      const active = relevant.some((task) => task.status === 'PENDING' || task.status === 'STARTED' || task.status === 'RETRY')
      return active || relevant.length < watchedTasks.length ? 3000 : false
    },
  })

  const relevant = (tasks ?? []).filter((task) => watchedTasks.includes(task.task_id))
  if (relevant.length === 0) return null

  const statusIcon = {
    PENDING: <Loader2 className="size-4 animate-spin text-ink-faint" />,
    STARTED: <Loader2 className="size-4 animate-spin text-accent" />,
    RETRY: <Loader2 className="size-4 animate-spin text-warning" />,
    SUCCESS: <CheckCircle2 className="size-4 text-success" />,
    FAILURE: <XCircle className="size-4 text-danger" />,
    REVOKED: <XCircle className="size-4 text-danger" />,
  }

  return (
    <div className="ui-chrome rounded-2xl border border-line bg-surface-1 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('upload.processing')}</p>
      <ul className="space-y-1.5">
        {relevant.map((task) => (
          <li key={task.task_id} className="flex items-center gap-2 text-sm">
            {statusIcon[task.status]}
            <span className="min-w-0 flex-1 truncate text-ink">{task.task_file_name ?? task.task_id}</span>
            <span className="text-xs text-ink-muted">
              {task.status === 'SUCCESS'
                ? t('upload.task.success')
                : task.status === 'FAILURE'
                  ? t('upload.task.failure')
                  : task.status === 'PENDING'
                    ? t('upload.task.pending')
                    : t('upload.task.started')}
            </span>
          </li>
        ))}
      </ul>
      {relevant.some((task) => task.status === 'FAILURE' && task.result) && (
        <p className="mt-2 text-xs text-danger">{relevant.find((task) => task.status === 'FAILURE')?.result}</p>
      )}
    </div>
  )
}
