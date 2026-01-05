/*
  One-time migration script:
  - removes legacy unique index InvoiceID_1_CardID_1 from `cardpurchasedetails`
    (left over from the old schema where CardPurchaseDetail had CardID)

  Run:
    node scripts/migrateCardPurchaseDetailsIndexes.js
*/

const mongoose = require('mongoose')
const { MONGODB_URI } = require('../utils/config')

const LEGACY_INDEX = 'InvoiceID_1_CardID_1'

async function main() {
  await mongoose.connect(MONGODB_URI)

  const col = mongoose.connection.db.collection('cardpurchasedetails')
  const indexes = await col.indexes()
  const hasLegacy = indexes.some((i) => i.name === LEGACY_INDEX)

  if (!hasLegacy) {
    console.log(`[ok] Legacy index not found: ${LEGACY_INDEX}`)
    await mongoose.disconnect()
    return
  }

  await col.dropIndex(LEGACY_INDEX)
  console.log(`[ok] Dropped legacy index: ${LEGACY_INDEX}`)

  const after = await col.indexes()
  console.log('[ok] Remaining indexes:', after.map((i) => i.name))

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[error] Migration failed:', err)
  process.exit(1)
})
