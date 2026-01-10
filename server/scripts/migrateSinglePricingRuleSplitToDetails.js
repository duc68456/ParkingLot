/*
Migration: Split legacy SinglePricingRule (which previously contained prices) into:
- SinglePricingRule (master): unique by (CardCategoryID, VehicleTypeID)
- SinglePricingRuleDetail (versions): price history chain

Assumptions:
- Legacy collection name is still `singlepricingrules`.
- Legacy documents may still have fields: DayPrice, HourPrice, NextHourPrice, StartDateApply, ChangedBy, ChangedAt, Reason, SinglePricingRulePrev.
- After schema changes, those fields are not in the master model anymore, but they may still exist in Mongo documents.

What this script does:
1) Reads all legacy docs from the `SinglePricingRule` collection.
2) Groups them by (CardCategoryID, VehicleTypeID).
3) For each group:
   - Creates/ensures a master SinglePricingRule for that pair (CardCategoryID/VehicleTypeID).
   - Sorts legacy docs oldest->newest by StartDateApply/createdAt.
   - Inserts a SinglePricingRuleDetail version per legacy doc, linking chain via SinglePricingRuleDetailPrev.

IMPORTANT:
- This script does NOT delete legacy docs. It only creates masters (if needed) and details.
- Run once, verify data, then you can optionally clean legacy fields/collections.

Usage (PowerShell):
  $env:MONGODB_URI='mongodb://...'
  node server/scripts/migrateSinglePricingRuleSplitToDetails.js

Usage (cmd.exe):
  set MONGODB_URI=mongodb://...
  node server/scripts/migrateSinglePricingRuleSplitToDetails.js
*/

const mongoose = require('mongoose')
const SinglePricingRule = require('../models/singlePricingRule')
const SinglePricingRuleDetail = require('../models/singlePricingRuleDetail')

const MONGODB_URI = process.env.MONGODB_URI

const toTime = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0
}

const main = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI env var')
  }

  await mongoose.connect(MONGODB_URI)

  // Pull raw legacy docs - include legacy fields even if not defined in schema.
  const legacy = await SinglePricingRule.collection
    .find({})
    .project({
      ID: 1,
      CardCategoryID: 1,
      VehicleTypeID: 1,
      DayPrice: 1,
      HourPrice: 1,
      NextHourPrice: 1,
      StartDateApply: 1,
      ChangedBy: 1,
      ChangedAt: 1,
      Reason: 1,
      SinglePricingRulePrev: 1,
      createdAt: 1
    })
    .toArray()

  const byPair = new Map()
  for (const doc of legacy) {
    const key = `${doc.CardCategoryID}::${doc.VehicleTypeID}`
    const arr = byPair.get(key) || []
    arr.push(doc)
    byPair.set(key, arr)
  }

  let mastersCreated = 0
  let detailsCreated = 0

  for (const [key, docs] of byPair.entries()) {
    const [CardCategoryID, VehicleTypeID] = key.split('::')

    let master = await SinglePricingRule.findOne({ CardCategoryID, VehicleTypeID })
    if (!master) {
      master = new SinglePricingRule({ CardCategoryID, VehicleTypeID })
      await master.save()
      mastersCreated++
    }

    // Sort oldest -> newest
    docs.sort((a, b) => {
      const ta = toTime(a.StartDateApply || a.createdAt)
      const tb = toTime(b.StartDateApply || b.createdAt)
      if (ta !== tb) return ta - tb
      return String(a.ID || '').localeCompare(String(b.ID || ''))
    })

    // Build chain
    let prevDetailId = null
    for (const d of docs) {
      // Skip if detail already exists for this legacy doc ID (idempotent-ish)
      const exists = d.ID ? await SinglePricingRuleDetail.findOne({ Reason: `LEGACY:${d.ID}` }) : null
      if (exists) {
        prevDetailId = exists.ID
        continue
      }

      const detail = new SinglePricingRuleDetail({
        SinglePricingRuleDetailPrev: prevDetailId,
        SinglePricingRuleID: master.ID,
        DayPrice: d.DayPrice ?? 0,
        HourPrice: d.HourPrice ?? 0,
        NextHourPrice: d.NextHourPrice ?? 0,
        StartDateApply: d.StartDateApply ? new Date(d.StartDateApply) : new Date(),
        ChangedBy: d.ChangedBy ? String(d.ChangedBy) : 'UNKNOWN',
        ChangedAt: d.ChangedAt ? new Date(d.ChangedAt) : undefined,
        // Keep original reason, but ensure we can identify migrated records
        Reason: d.Reason || `LEGACY:${d.ID || 'UNKNOWN'}`
      })

      await detail.save()
      detailsCreated++
      prevDetailId = detail.ID
    }
  }

  console.log(`[done] masters created: ${mastersCreated}; details created: ${detailsCreated}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error('[fail]', e)
  process.exit(1)
})
