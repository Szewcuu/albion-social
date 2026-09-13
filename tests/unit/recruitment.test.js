import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RECRUITMENT_PLATFORMS,
  RECRUITMENT_STATUSES,
  isFacebookUrl,
  validateRecruitmentPayload,
  buildRecruitmentDiscordEmbed,
} from '../../src/lib/recruitment.js'

test('isFacebookUrl poprawnie weryfikuje linki do profili Facebook', () => {
  assert.equal(isFacebookUrl('https://facebook.com/jan.kowalski'), true)
  assert.equal(isFacebookUrl('https://www.facebook.com/profile.php?id=100012345'), true)
  assert.equal(isFacebookUrl('https://fb.com/jankowalski'), true)
  assert.equal(isFacebookUrl('facebook.com/jan.kowalski'), true)
  assert.equal(isFacebookUrl('https://twitter.com/jan'), false)
  assert.equal(isFacebookUrl(''), false)
  assert.equal(isFacebookUrl(null), false)
})

test('validateRecruitmentPayload odrzuca brakujące lub niepoprawne dane', () => {
  const result = validateRecruitmentPayload({})
  assert.equal(result.valid, false)
  assert.ok(result.errors.length >= 4)
})

test('validateRecruitmentPayload akceptuje poprawne zgłoszenie na Discorda bez linku FB', () => {
  const payload = {
    platform: 'discord',
    applicantName: 'Mikołaj',
    age: 24,
    discordTag: 'mikolaj#1234',
    albionNick: 'SirMikolaj',
    server: 'Europa',
    experience: 'Prowadziłem serwer gildyjny przez 2 lata, znam uprawnienia i boty.',
    availability: 'Codziennie 18:00 - 23:00, w weekendy więcej.',
    motivation: 'Chcę pomóc w rozwoju społeczności i pilnować porządku na czatach.',
  }

  const result = validateRecruitmentPayload(payload)
  assert.equal(result.valid, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.sanitized.platform, 'discord')
  assert.equal(result.sanitized.applicantName, 'Mikołaj')
  assert.equal(result.sanitized.age, 24)
  assert.equal(result.sanitized.facebookUrl, '')
})

test('validateRecruitmentPayload wymaga profilu FB dla roli facebook i both', () => {
  const payloadFbWithoutUrl = {
    platform: 'facebook',
    applicantName: 'Mikołaj',
    age: 24,
    discordTag: 'mikolaj',
    experience: 'Moderowałem grupy tematyczne na FB powyżej 10k członków.',
    availability: '3-4 godziny dziennie.',
    motivation: 'Chcę wyczyścić grupę ze spamu i ofert RMT.',
  }

  const resultWithoutFb = validateRecruitmentPayload(payloadFbWithoutUrl)
  assert.equal(resultWithoutFb.valid, false)
  assert.ok(resultWithoutFb.errors.some((e) => e.includes('Facebook')))

  const payloadBothWithInvalidFb = {
    ...payloadFbWithoutUrl,
    platform: 'both',
    facebookUrl: 'https://instagram.com/mikolaj',
  }
  const resultInvalidFb = validateRecruitmentPayload(payloadBothWithInvalidFb)
  assert.equal(resultInvalidFb.valid, false)
  assert.ok(resultInvalidFb.errors.some((e) => e.includes('link do profilu na Facebooku')))

  const payloadBothValid = {
    ...payloadFbWithoutUrl,
    platform: 'both',
    facebookUrl: 'https://facebook.com/mikolaj.albion',
  }
  const resultValid = validateRecruitmentPayload(payloadBothValid)
  assert.equal(resultValid.valid, true)
  assert.equal(resultValid.sanitized.facebookUrl, 'https://facebook.com/mikolaj.albion')
})

test('buildRecruitmentDiscordEmbed tworzy prawidłowy embed z kolorami dla platform', () => {
  const appDiscord = {
    platform: 'discord',
    applicantName: 'Gracz1',
    age: 20,
    discordTag: 'gracz1',
    albionNick: 'GraczPL',
    server: 'Europa',
    availability: 'Wieczory',
    experience: 'Brak wcześniejszego expa, ale szybko się uczę.',
    motivation: 'Gram w Albiona od 2019 roku.',
  }

  const embedDiscord = buildRecruitmentDiscordEmbed(appDiscord)
  assert.equal(embedDiscord.color, RECRUITMENT_PLATFORMS.discord.color)
  assert.ok(embedDiscord.title.includes('Discord'))
  assert.ok(embedDiscord.fields.some((f) => f.name.includes('Kandydat') && f.value === 'Gracz1'))
  assert.ok(embedDiscord.fields.some((f) => f.name.includes('Postać') && f.value.includes('GraczPL')))

  const appBoth = {
    ...appDiscord,
    platform: 'both',
    facebookUrl: 'https://facebook.com/gracz1',
  }
  const embedBoth = buildRecruitmentDiscordEmbed(appBoth)
  assert.equal(embedBoth.color, RECRUITMENT_PLATFORMS.both.color)
  assert.ok(embedBoth.fields.some((f) => f.name.includes('Facebook') && f.value.includes('facebook.com/gracz1')))
})
