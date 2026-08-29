import { isIgnorableRequestError } from '@/lib/adminHealth'

export function register() {}

export async function onRequestError(error, request, context) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (isIgnorableRequestError(error, context)) return

  const { recordSystemEvent } = await import('@/lib/server/monitoring')
  await recordSystemEvent({
    source: 'backend',
    eventType: `${context?.routeType || 'request'}_error`,
    message: error instanceof Error ? error.message : String(error),
    context: {
      method: request?.method,
      path: request?.path,
      routePath: context?.routePath,
      digest: error && typeof error === 'object' && 'digest' in error ? String(error.digest) : undefined,
    },
  })
}
