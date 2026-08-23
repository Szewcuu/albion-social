export function getExpeditionExpiry(startsAt) {
  return new Date(new Date(startsAt).getTime() + 12 * 60 * 60 * 1000)
}
