import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ExternalApiError,
  fetchExternalJson,
  probeExternalEndpoints,
} from '../../src/lib/externalApiClient.js'

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

test('adapter Gameinfo ponawia 429 i zwraca poprawną odpowiedź', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    return calls.length === 1
      ? jsonResponse({ error: 'rate limit' }, 429)
      : jsonResponse({ players: [{ Id: 'player-1', Name: 'XNetoX' }] })
  }

  const result = await fetchExternalJson('https://gameinfo.albiononline.com/api/gameinfo/search?q=XNetoX', {
    fetchImpl,
    retries: 1,
    sleepImpl: async () => {},
  })

  assert.equal(calls.length, 2)
  assert.equal(result.players[0].Name, 'XNetoX')
})

test('adapter Gameinfo nie ponawia odpowiedzi 404', async () => {
  let calls = 0

  await assert.rejects(
    fetchExternalJson('https://gameinfo-ams.albiononline.com/api/gameinfo/players/missing', {
      fetchImpl: async () => {
        calls += 1
        return jsonResponse({}, 404)
      },
      retries: 1,
      sleepImpl: async () => {},
    }),
    (error) => error instanceof ExternalApiError
      && error.code === 'UPSTREAM_HTTP'
      && error.upstreamStatus === 404,
  )

  assert.equal(calls, 1)
})

test('adapter Albion Data normalizuje timeout po kontrolowanym ponowieniu', async () => {
  let calls = 0
  const timeout = new Error('timeout')
  timeout.name = 'TimeoutError'

  await assert.rejects(
    fetchExternalJson('https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG.json', {
      fetchImpl: async () => {
        calls += 1
        throw timeout
      },
      retries: 1,
      sleepImpl: async () => {},
    }),
    (error) => error instanceof ExternalApiError && error.code === 'UPSTREAM_TIMEOUT',
  )

  assert.equal(calls, 2)
})

test('monitoring zapisuje osobny status, HTTP i czas odpowiedzi każdego regionu', async () => {
  const timestamps = {
    'Europa:start': 0,
    'Europa:end': 42,
    'Ameryka:start': 10,
    'Ameryka:end': 105,
  }
  const endpoints = [
    { region: 'Europa', url: 'https://europe.albion-online-data.com/prices' },
    { region: 'Ameryka', url: 'https://west.albion-online-data.com/prices' },
  ]

  const results = await probeExternalEndpoints(endpoints, {
    now: (region, phase) => timestamps[`${region}:${phase}`],
    fetchImpl: async (url) => url.includes('europe')
      ? jsonResponse([])
      : jsonResponse({ error: 'unavailable' }, 503),
  })

  assert.deepEqual(results, [
    { region: 'Europa', status: 'operational', latencyMs: 42, httpStatus: 200 },
    { region: 'Ameryka', status: 'down', latencyMs: 95, httpStatus: 503, errorCode: 'UPSTREAM_HTTP' },
  ])
})

test('adapter odrzuca odpowiedź bez poprawnego JSON', async () => {
  await assert.rejects(
    fetchExternalJson('https://gameinfo.albiononline.com/api/gameinfo/search?q=test', {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => { throw new SyntaxError('invalid json') },
      }),
      retries: 0,
    }),
    (error) => error instanceof ExternalApiError && error.code === 'UPSTREAM_INVALID_RESPONSE',
  )
})

test('monitoring oznacza wolną odpowiedź jako obniżoną jakość', async () => {
  const result = await probeExternalEndpoints(
    [{ region: 'Azja', url: 'https://east.albion-online-data.com/prices' }],
    {
      fetchImpl: async () => jsonResponse([]),
      slowThresholdMs: 3_000,
      now: (_region, phase) => phase === 'start' ? 100 : 3_601,
    },
  )

  assert.deepEqual(result, [{
    region: 'Azja',
    status: 'degraded',
    latencyMs: 3_501,
    httpStatus: 200,
  }])
})
