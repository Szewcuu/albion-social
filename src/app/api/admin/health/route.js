import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const startTime = Date.now()
  let supabaseStatus = 'OK'
  let supabaseLatency = 0

  try {
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' })
    supabaseLatency = Date.now() - startTime
    if (error) supabaseStatus = 'ERROR: ' + error.message
  } catch (err) {
    supabaseStatus = 'FAILED: ' + err.message
  }

  // Check Albion Online Data Project API ping
  let albionDataApiStatus = 'OK'
  let albionDataLatency = 0
  try {
    const apiStart = Date.now()
    const res = await fetch('https://europe.albion-online-data.com/api/v2/stats/prices/T8_BAG.json', { next: { revalidate: 60 } })
    albionDataLatency = Date.now() - apiStart
    if (!res.ok) albionDataApiStatus = `HTTP ${res.status}`
  } catch {
    albionDataApiStatus = 'TIMEOUT / DOWN'
  }

  return NextResponse.json({
    status: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
    services: {
      supabase: { status: supabaseStatus, latencyMs: supabaseLatency },
      albionDataProject: { status: albionDataApiStatus, latencyMs: albionDataLatency },
      gameinfoApi: { status: 'ONLINE', mode: 'PROXY_CACHE' }
    }
  })
}
