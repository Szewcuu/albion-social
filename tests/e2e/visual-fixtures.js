import { createClient } from '@supabase/supabase-js'

export const VISUAL_BUILD_ID = 'f1200000-0000-4000-8000-000000000001'
export const VISUAL_GUILD_ID = '912000001'
export const VISUAL_PROFILE_ID = 'f1200000-0000-4000-8000-000000000002'

const FIXED_AT = '2026-08-29T12:00:00.000Z'

const profile = {
  id: VISUAL_PROFILE_ID,
  username: 'Strażnik Avalonu',
  avatar_url: null,
  created_at: '2026-01-15T12:00:00.000Z',
  ingame_nick: 'CodexKnight',
  main_server: 'Ameryka',
  guild_name: 'Strażnicy Avalonu',
  main_role: 'Support',
  avg_ip: 1575,
  bio: 'Dowódca wypraw i autor doktryn dla społeczności Albion Online.',
  favorite_builds_public: false,
  is_verified: true,
  verified_player_id: 'visual-player',
  verified_server: 'Ameryka',
  verified_region: 'america',
  pvp_fame: 12_450_000,
  pve_fame: 48_900_000,
  verified_at: FIXED_AT,
  role: 'member',
  is_admin: false,
}

const profileBuild = {
  id: VISUAL_BUILD_ID,
  user_id: VISUAL_PROFILE_ID,
  title: 'Strażnik Mglistych Bram',
  description: 'Stabilna doktryna testowa do kontroli układu.',
  activity_type: 'PVP',
  weapon: 'T6_2H_CLAYMORE@1',
  offhand: '',
  helmet: 'T6_HEAD_LEATHER_SET2@1',
  head: 'T6_HEAD_LEATHER_SET2@1',
  armor: 'T6_ARMOR_LEATHER_SET2@1',
  shoes: 'T6_SHOES_LEATHER_SET2@1',
  cape: 'T6_CAPE@1',
  bag: 'T6_BAG@1',
  potion: 'T6_POTION_HEAL@1',
  food: 'T7_MEAL_STEW@1',
  build_data: {},
  votes_count: 14,
  build_votes: [],
  created_at: FIXED_AT,
  status: 'visible',
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  })
}

export async function seedVisualBuild() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1_000 })
  if (usersError) throw new Error(`Nie udało się odczytać konta E2E: ${usersError.message}`)
  const e2eEmail = process.env.E2E_USER_EMAIL?.trim().toLowerCase()
  const e2eUser = usersPage.users.find((user) => user.email?.toLowerCase() === e2eEmail)
  if (!e2eUser) throw new Error('Nie znaleziono konta E2E do przygotowania buildu wizualnego.')

  await admin.from('builds').delete().eq('id', VISUAL_BUILD_ID)
  const { error } = await admin.from('builds').insert({
    id: VISUAL_BUILD_ID,
    user_id: e2eUser.id,
    title: profileBuild.title,
    activity_type: profileBuild.activity_type,
    description: profileBuild.description,
    weapon: profileBuild.weapon,
    offhand: profileBuild.offhand,
    head: profileBuild.head,
    armor: profileBuild.armor,
    shoes: profileBuild.shoes,
    cape: profileBuild.cape,
    bag: profileBuild.bag,
    potion: profileBuild.potion,
    food: profileBuild.food,
    status: 'visible',
    created_at: FIXED_AT,
    build_data: {
      authorName: 'Strażnik Avalonu',
      budget: 'medium',
      tags: {
        locations: ['Mists'], zones: ['Strefa Czarna'], sizes: ['Solo'], roles: ['DPS'], activities: ['PvP'],
      },
      strengths: ['Duża mobilność', 'Czytelna rotacja umiejętności'],
      weaknesses: ['Wymaga dobrego zarządzania energią'],
      slots: {
        main_hand: { main: 'T6_2H_CLAYMORE@1', alternatives: [], amount: 1 },
        off_hand: { main: '', alternatives: [], amount: 1 },
        head: { main: 'T6_HEAD_LEATHER_SET2@1', alternatives: [], amount: 1 },
        armor: { main: 'T6_ARMOR_LEATHER_SET2@1', alternatives: [], amount: 1 },
        shoes: { main: 'T6_SHOES_LEATHER_SET2@1', alternatives: [], amount: 1 },
        cape: { main: 'T6_CAPE@1', alternatives: [], amount: 1 },
        bag: { main: 'T6_BAG@1', alternatives: [], amount: 1 },
        mount: { main: 'T5_MOUNT_HORSE', alternatives: [], amount: 1 },
        potion: { main: 'T6_POTION_HEAL@1', alternatives: [], amount: 10 },
        food: { main: 'T7_MEAL_STEW@1', alternatives: [], amount: 10 },
      },
      inventory: [],
      skillCombos: [{ name: 'Otwarcie', description: 'Doskok, kontrola i bezpieczne wycofanie.' }],
      youtubeVideos: [],
    },
  })
  if (error) throw new Error(`Nie udało się przygotować buildu wizualnego: ${error.message}`)

  return async () => {
    const { error: cleanupError } = await admin.from('builds').delete().eq('id', VISUAL_BUILD_ID)
    if (cleanupError) throw new Error(`Nie udało się usunąć buildu wizualnego: ${cleanupError.message}`)
  }
}

export async function installVisualNetworkFixtures(page) {
  await page.route('**/api/admin/overview', (route) => json(route, {
    role: 'admin',
    stats: { pendingReports: 2, allReports: 7, visibleComments: 24, builds: 56 },
    reports: [],
  }))
  await page.route('**/api/admin/reports**', (route) => json(route, {
    reports: [{
      id: 'f1200000-0000-4000-8000-000000000010',
      reason: 'spam', status: 'pending', buildId: VISUAL_BUILD_ID,
      buildTitle: profileBuild.title, details: 'Powtarzająca się treść w dyskusji.',
      createdAt: FIXED_AT,
    }],
    pagination: { hasMore: false, nextCursor: null },
  }))
  await page.route('**/api/admin/content**', (route) => json(route, { items: [] }))
  await page.route('**/api/admin/audit', (route) => json(route, { entries: [] }))
  await page.route('**/api/admin/roles', (route) => json(route, { currentRole: 'admin', users: [] }))
  await page.route('**/api/admin/health', (route) => json(route, {
    generatedAt: FIXED_AT,
    checks: [{ service: 'supabase', status: 'operational', latency_ms: 96, message: 'Baza danych odpowiada.', checked_at: FIXED_AT }],
    events: [],
  }))

  await page.route('**/api/prices?**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('mode') !== 'current') return route.continue()
    const items = (url.searchParams.get('items') || '').split(',').filter(Boolean)
    const cities = (url.searchParams.get('cities') || 'Fort Sterling').split(',').filter(Boolean)
    return json(route, {
      data: items.flatMap((itemId, itemIndex) => cities.map((city) => ({
        item_id: itemId,
        city,
        quality: 1,
        sell_price_min: 175 + itemIndex * 125,
        sell_price_min_date: FIXED_AT,
        buy_price_max: 0,
        buy_price_max_date: '0001-01-01T00:00:00',
      }))),
      meta: { source: 'E2E visual fixture' },
    })
  })

  await page.route('**/api/builds/*/social', (route) => json(route, { votes: 14, userVote: false, favorite: false }))
  await page.route('**/api/builds/*/comments**', (route) => json(route, {
    comments: [], count: 0, pagination: { hasMore: false, nextCursor: null },
  }))
  await page.route('**/api/builds/weekly', (route) => json(route, {
    week: { weekStart: '2026-08-31', startsAt: '2026-08-31T00:00:00.000Z', endsAt: '2026-09-07T00:00:00.000Z' },
    candidates: [{ ...profileBuild, profiles: { username: profile.username }, weekly_votes_count: 9, likes_count: 14, item_names: {} }],
    leaderId: VISUAL_BUILD_ID,
    totalVotes: 9,
    userVoteBuildId: null,
  }))
  await page.route('**/api/follows**', (route) => json(route, { follows: [], following: false }))

  await page.route('**/rest/v1/profiles?**', (route) => json(route, profile))
  await page.route('**/rest/v1/guilds?**', (route) => json(route, {
    id: Number(VISUAL_GUILD_ID),
    user_id: VISUAL_PROFILE_ID,
    name: 'Strażnicy Avalonu',
    description: 'Gildia skupiona na wyprawach, szkoleniu nowych graczy i wspólnej ekonomii.',
    activity_type: 'PvX',
    main_city: 'Brecilien',
    server: 'Ameryka',
    discord_link: null,
    created_at: '2026-01-15T12:00:00.000Z',
    status: 'visible',
    recruitment_open: true,
    recruitment_headline: 'Rekrutujemy aktywnych graczy do stałych drużyn.',
    profiles: { username: profile.username, avatar_url: null, ingame_nick: profile.ingame_nick },
  }))
  await page.route('**/rest/v1/guild_members?**', (route) => json(route, [{
    id: 'f1200000-0000-4000-8000-000000000020',
    user_id: VISUAL_PROFILE_ID,
    role: 'leader', title: 'Dowódca', status: 'active', joined_at: '2026-01-15T12:00:00.000Z',
    profiles: { username: profile.username, avatar_url: null, ingame_nick: profile.ingame_nick, main_role: 'Support', is_verified: true },
  }]))
  await page.route('**/rest/v1/guild_events?**', (route) => json(route, [{
    id: 'f1200000-0000-4000-8000-000000000021', creator_id: VISUAL_PROFILE_ID,
    title: 'Wieczorna wyprawa Avalon', description: 'Stała drużyna i spokojne tempo.', event_type: 'Avalon',
    starts_at: '2026-09-05T18:00:00.000Z', server: 'Ameryka', status: 'scheduled', location: 'Brecilien',
    audience: 'guild', capacity: 20, signup_open: true, created_at: FIXED_AT,
  }]))
  await page.route('**/rest/v1/guild_activity?**', (route) => json(route, [{
    id: 120001, actor_id: VISUAL_PROFILE_ID, event_type: 'recruitment_updated',
    title: 'Otwarto rekrutację', details: 'Poszukiwani gracze wszystkich ról.', entity_type: 'guild',
    entity_id: VISUAL_GUILD_ID, created_at: FIXED_AT, profiles: { username: profile.username, ingame_nick: profile.ingame_nick },
  }]))

  await page.route('**/rest/v1/builds?**', (route) => json(route, [profileBuild]))
  await page.route('**/rest/v1/market_items?**', (route) => json(route, []))
  await page.route('**/rest/v1/expeditions?**', (route) => json(route, []))
  await page.route('**/rest/v1/build_comments?**', (route) => json(route, []))
  await page.route('**/rest/v1/build_favorites?**', (route) => json(route, []))
}
