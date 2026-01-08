/*
  One-off migration script:
  - Converts SubscriptionPricingRule refs (CardCategoryID, VehicleTypeID, SubscriptionTypeID)
    from Mongo ObjectId to business ID strings.

  Usage (Windows cmd):
    node server/scripts/migrateSubscriptionPricingRuleRefsToBusinessIds.js

  Safety:
  - Idempotent: if fields are already strings, it skips them.
  - Prints a summary at the end.
*/

const mongoose = require('mongoose')
const SubscriptionPricingRule = require('../models/subscriptionPricingRule')
const CardCategory = require('../models/cardCategory')
const VehicleType = require('../models/vehicleType')
const SubscriptionType = require('../models/subscriptionType')
const { MONGODB_URI } = require('../utils/config')

const looksLikeObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v)

const resolveBusinessId = async ({ model, objectId, selectField }) => {
  if (!objectId) return null
  const doc = await model.findById(objectId).select(selectField)
  return doc ? doc[selectField] : null
}

const main = async () => {
  await mongoose.connect(MONGODB_URI)

  const rules = await SubscriptionPricingRule.find({})

  let scanned = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const rule of rules) {
    scanned++

    const patch = {}

    // CardCategoryID
    if (rule.CardCategoryID && typeof rule.CardCategoryID !== 'string') {
      const businessId = await resolveBusinessId({
        model: CardCategory,
        objectId: rule.CardCategoryID,
        selectField: 'ID'
      })
      if (businessId) patch.CardCategoryID = businessId
    } else if (looksLikeObjectId(rule.CardCategoryID)) {
      const businessId = await resolveBusinessId({
        model: CardCategory,
        objectId: rule.CardCategoryID,
        selectField: 'ID'
      })
      if (businessId) patch.CardCategoryID = businessId
    }

    // VehicleTypeID
    if (rule.VehicleTypeID && typeof rule.VehicleTypeID !== 'string') {
      const businessId = await resolveBusinessId({
        model: VehicleType,
        objectId: rule.VehicleTypeID,
        selectField: 'VehicleTypeID'
      })
      if (businessId) patch.VehicleTypeID = businessId
    } else if (looksLikeObjectId(rule.VehicleTypeID)) {
      const businessId = await resolveBusinessId({
        model: VehicleType,
        objectId: rule.VehicleTypeID,
        selectField: 'VehicleTypeID'
      })
      if (businessId) patch.VehicleTypeID = businessId
    }

    // SubscriptionTypeID
    if (rule.SubscriptionTypeID && typeof rule.SubscriptionTypeID !== 'string') {
      const businessId = await resolveBusinessId({
        model: SubscriptionType,
        objectId: rule.SubscriptionTypeID,
        selectField: 'ID'
      })
      if (businessId) patch.SubscriptionTypeID = businessId
    } else if (looksLikeObjectId(rule.SubscriptionTypeID)) {
      const businessId = await resolveBusinessId({
        model: SubscriptionType,
        objectId: rule.SubscriptionTypeID,
        selectField: 'ID'
      })
      if (businessId) patch.SubscriptionTypeID = businessId
    }

    if (Object.keys(patch).length === 0) {
      skipped++
      continue
    }

    // Only update if we resolved all IDs we attempted to patch.
    const needsAll = [
      patch.CardCategoryID || rule.CardCategoryID,
      patch.VehicleTypeID || rule.VehicleTypeID,
      patch.SubscriptionTypeID || rule.SubscriptionTypeID
    ].every((v) => typeof v === 'string' && !looksLikeObjectId(v))

    if (!needsAll) {
      failed++
      // eslint-disable-next-line no-console
      console.error(`Skipping rule ${rule.ID || rule._id}: could not resolve all business IDs`, {
        CardCategoryID: rule.CardCategoryID,
        VehicleTypeID: rule.VehicleTypeID,
        SubscriptionTypeID: rule.SubscriptionTypeID,
        patch
      })
      continue
    }

    await SubscriptionPricingRule.updateOne({ _id: rule._id }, { $set: patch })
    updated++
  }

  // eslint-disable-next-line no-console
  console.log('Migration complete', { scanned, updated, skipped, failed })

  await mongoose.disconnect()
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch (e) {
    // ignore
  }
  process.exit(1)
})
