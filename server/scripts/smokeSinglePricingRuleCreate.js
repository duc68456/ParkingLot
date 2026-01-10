/*
  Smoke test: create a SinglePricingRule using BUSINESS IDs (e.g. CCG0007) and ensure
  the server resolves them to Mongo ObjectIds so populate() doesn't throw CastError.

  Usage (Windows cmd):
    set BASE_URL=http://localhost:3001
    node scripts\smokeSinglePricingRuleCreate.js

  Env vars:
    BASE_URL   default http://localhost:3001
    CCG_ID     CardCategory business ID, e.g. CCG0007
    VT_ID      VehicleType business ID, e.g. VT0001 (or whatever your DB uses)
    EMP_ID     Employee business ID, e.g. EMP0001
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

const CCG_ID = process.env.CCG_ID
const VT_ID = process.env.VT_ID
const EMP_ID = process.env.EMP_ID

const required = (name, value) => {
  if (!value) {
    throw new Error(`Missing env var ${name}.`) 
  }
}

async function main () {
  required('CCG_ID', CCG_ID)
  required('VT_ID', VT_ID)
  required('EMP_ID', EMP_ID)

  const payload = {
    CardCategoryID: CCG_ID,
    VehicleTypeID: VT_ID,
    DayPrice: 10000,
    HourPrice: 2000,
    NextHourPrice: 1000,
    ChangedBy: EMP_ID,
    Reason: 'smoke test'
  }

  const res = await fetch(`${BASE_URL}/api/single-pricing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    console.error('Request failed:', res.status, body)
    process.exit(1)
  }

  console.log('Created SinglePricingRule OK')
  console.log({
    id: body?.data?.id,
    ID: body?.data?.ID,
    CardCategoryID: body?.data?.CardCategoryID,
    VehicleTypeID: body?.data?.VehicleTypeID,
    ChangedBy: body?.data?.ChangedBy
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
