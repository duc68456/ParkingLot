/*
Smoke: Validate SinglePricingRule list + history contract.

What it checks:
- GET /api/single-pricing-rules returns only newest rule per (CardCategoryID, VehicleTypeID)
- For a sampled pair from the list, /history/{cc}/{vt} returns >= 1 items in chronological order

Usage:
- Set BASE_URL + ADMIN_TOKEN (bearer token) in env.
  - Windows (PowerShell):
    $env:BASE_URL='http://localhost:3001'
    $env:ADMIN_TOKEN='...'
    node server/scripts/smokeSinglePricingRuleListAndHistory.js
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN

const headers = {
  'Content-Type': 'application/json'
}

if (ADMIN_TOKEN) {
  headers.Authorization = `Bearer ${ADMIN_TOKEN}`
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const parseJson = async (res) => {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const toTime = (v) => {
  const d = v ? new Date(v) : null
  const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0
  return t
}

const main = async () => {
  if (!ADMIN_TOKEN) {
    console.warn('[warn] ADMIN_TOKEN not set; if your API requires auth, this will fail.')
  }

  const listRes = await fetch(`${BASE_URL}/api/single-pricing-rules?page=1&limit=500`, { headers })
  const listBody = await parseJson(listRes)
  assert(listRes.ok, `List failed: ${listRes.status} ${JSON.stringify(listBody)}`)

  const items = listBody?.data?.items
  assert(Array.isArray(items), 'List response missing data.items array')

  // Ensure unique by (CardCategoryID, VehicleTypeID)
  const seen = new Set()
  for (const it of items) {
    const key = `${it?.CardCategoryID || ''}::${it?.VehicleTypeID || ''}`
    assert(!seen.has(key), `Duplicate pair in list: ${key}`)
    seen.add(key)
  }

  console.log(`[ok] list returned ${items.length} newest-per-pair rules`) 

  if (!items.length) return

  // Grab sample pair
  const sample = items[0]
  const cc = sample.CardCategoryID
  const vt = sample.VehicleTypeID
  assert(cc && vt, 'Sample item missing CardCategoryID or VehicleTypeID')

  const histRes = await fetch(`${BASE_URL}/api/single-pricing-rules/history/${encodeURIComponent(cc)}/${encodeURIComponent(vt)}?page=1&limit=200`, { headers })
  const histBody = await parseJson(histRes)
  assert(histRes.ok, `History failed: ${histRes.status} ${JSON.stringify(histBody)}`)

  const hist = histBody?.data?.items
  assert(Array.isArray(hist), 'History response missing data.items array')
  assert(hist.length >= 1, 'History should have at least 1 item')

  // chronological order by StartDateApply
  for (let i = 1; i < hist.length; i++) {
    const prev = hist[i - 1]
    const cur = hist[i]
    assert(
      toTime(prev?.StartDateApply || prev?.createdAt) <= toTime(cur?.StartDateApply || cur?.createdAt),
      'History is not sorted oldest -> newest'
    )
  }

  console.log(`[ok] history for ${cc}/${vt} returned ${hist.length} versions (oldest -> newest)`) 
}

main().catch((e) => {
  console.error('[fail]', e?.message || e)
  process.exit(1)
})
