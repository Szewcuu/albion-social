const DEFAULT_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTimeoutError(error) {
  return error?.name === 'TimeoutError' || error?.name === 'AbortError'
}

export class ExternalApiError extends Error {
  constructor(message, { code, upstreamStatus = null, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ExternalApiError'
    this.code = code || 'UPSTREAM_UNAVAILABLE'
    this.upstreamStatus = upstreamStatus
  }
}

export async function fetchExternalJson(url, {
  fetchImpl = globalThis.fetch,
  retries = 1,
  retryDelayMs = 180,
  retryableStatuses = DEFAULT_RETRYABLE_STATUSES,
  timeoutMs = 8_000,
  requestInit = {},
  sleepImpl = wait,
} = {}) {
  const attempts = Math.max(1, Number(retries) + 1)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        ...requestInit,
        signal: requestInit.signal || AbortSignal.timeout(timeoutMs),
      })

      if (response.ok) {
        try {
          return await response.json()
        } catch (error) {
          throw new ExternalApiError('Zewnętrzne API zwróciło nieprawidłowy JSON.', {
            code: 'UPSTREAM_INVALID_RESPONSE',
            upstreamStatus: response.status,
            cause: error,
          })
        }
      }

      if (attempt < attempts && retryableStatuses.has(response.status)) {
        await sleepImpl(retryDelayMs)
        continue
      }

      throw new ExternalApiError(`Zewnętrzne API zwróciło HTTP ${response.status}.`, {
        code: 'UPSTREAM_HTTP',
        upstreamStatus: response.status,
      })
    } catch (error) {
      if (error instanceof ExternalApiError) throw error

      if (attempt < attempts) {
        await sleepImpl(retryDelayMs)
        continue
      }

      throw new ExternalApiError(
        isTimeoutError(error)
          ? 'Zewnętrzne API przekroczyło limit czasu odpowiedzi.'
          : 'Nie udało się połączyć z zewnętrznym API.',
        {
          code: isTimeoutError(error) ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
          cause: error,
        },
      )
    }
  }
}

export async function probeExternalEndpoints(endpoints, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 8_000,
  slowThresholdMs = 3_000,
  now = () => performance.now(),
} = {}) {
  return Promise.all(endpoints.map(async ({ region, url }) => {
    const startedAt = now(region, 'start')

    try {
      await fetchExternalJson(url, {
        fetchImpl,
        retries: 0,
        timeoutMs,
        requestInit: {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          redirect: 'error',
        },
      })

      const latencyMs = Math.max(0, Math.round(now(region, 'end') - startedAt))
      return {
        region,
        status: latencyMs > slowThresholdMs ? 'degraded' : 'operational',
        latencyMs,
        httpStatus: 200,
      }
    } catch (error) {
      return {
        region,
        status: 'down',
        latencyMs: Math.max(0, Math.round(now(region, 'end') - startedAt)),
        httpStatus: error?.upstreamStatus || null,
        errorCode: error?.code || 'UPSTREAM_UNAVAILABLE',
      }
    }
  }))
}
