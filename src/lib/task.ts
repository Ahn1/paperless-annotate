/** EmbedPDF-Tasks in Promises umwandeln. */
import type { Task } from '@embedpdf/models'

export function taskToPromise<R, E = unknown>(task: Task<R, E>): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    task.wait(
      (result) => resolve(result),
      (error) => reject(error instanceof Error ? error : new Error(JSON.stringify(error))),
    )
  })
}
