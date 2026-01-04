const returnBatchesRouter = require('express').Router()
const ReturnBatch = require('../models/returnBatch')
const CardReturn = require('../models/cardReturn')
const CardPurchaseInvoice = require('../models/cardPurchaseInvoice')
const CardPurchaseDetail = require('../models/cardPurchaseDetail')

// GET all return batches with filtering and pagination
returnBatchesRouter.get('/', async (req, res) => {
  try {
    const {
      invoiceId,
      refundStatus,
      page = 1,
      limit = 20
    } = req.query

    const filter = {}

    if (invoiceId) {
      filter.InvoiceID = invoiceId
    }

    if (refundStatus) {
      filter.RefundStatus = refundStatus.toUpperCase()
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const total = await ReturnBatch.countDocuments(filter)

    const batches = await ReturnBatch
      .find(filter)
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ LastUpdatedAt: -1 })

    res.json({
      success: true,
      data: {
        items: batches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_RETURN_BATCHES_ERROR'
      }
    })
  }
})

// GET single return batch by ID
returnBatchesRouter.get('/:id', async (req, res) => {
  try {
    const batch = await ReturnBatch
      .findById(req.params.id)
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'ReturnBatch not found',
          code: 'RETURN_BATCH_NOT_FOUND'
        }
      })
    }

    // Get all returns for this invoice
    const returns = await CardReturn
      .find({ InvoiceID: batch.InvoiceID })
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    res.json({
      success: true,
      data: {
        ...batch.toJSON(),
        returns
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_RETURN_BATCH_ERROR'
      }
    })
  }
})

// GET return batch by invoice ID
returnBatchesRouter.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const batch = await ReturnBatch
      .findOne({ InvoiceID: req.params.invoiceId })
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'ReturnBatch not found for this invoice',
          code: 'RETURN_BATCH_NOT_FOUND'
        }
      })
    }

    // Get all returns for this invoice
    const returns = await CardReturn
      .find({ InvoiceID: req.params.invoiceId })
      .populate({
        path: 'CardID',
        select: 'CardID UID CardCategoryID',
        populate: {
          path: 'CardCategoryID',
          select: 'ID Name'
        }
      })

    res.json({
      success: true,
      data: {
        ...batch.toJSON(),
        returns
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_RETURN_BATCH_BY_INVOICE_ERROR'
      }
    })
  }
})

// POST - Recalculate return batch for an invoice
returnBatchesRouter.post('/recalculate/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params

    // Check if invoice exists
    const invoice = await CardPurchaseInvoice.findOne({ ID: invoiceId })
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        }
      })
    }

    // Count total cards in invoice
    const totalCardsInInvoice = await CardPurchaseDetail.countDocuments({ InvoiceID: invoiceId })

    // Get all returns for this invoice
    const allReturns = await CardReturn.find({ InvoiceID: invoiceId })

    // Calculate statistics
    const totalCardsRequested = allReturns.length
    const totalCardsApproved = allReturns.filter(r => ['APPROVED', 'PROCESSED'].includes(r.Status)).length
    const totalCardsRejected = allReturns.filter(r => r.Status === 'REJECTED').length

    const totalOriginalAmount = allReturns.reduce((sum, r) => sum + r.OriginalPrice, 0)
    const totalRefundAmount = allReturns
      .filter(r => ['APPROVED', 'PROCESSED'].includes(r.Status))
      .reduce((sum, r) => sum + r.RefundPrice, 0)

    // Determine RefundStatus
    let refundStatus = 'ZERO'
    if (totalCardsApproved === 0) {
      refundStatus = 'ZERO'
    } else if (totalCardsApproved === totalCardsInInvoice) {
      const allProcessed = allReturns.every(r => r.Status === 'PROCESSED')
      refundStatus = allProcessed ? 'FULL_PROCESSED' : 'FULL'
    } else {
      const anyProcessed = allReturns.some(r => r.Status === 'PROCESSED')
      refundStatus = anyProcessed ? 'PARTIAL_PROCESSED' : 'PARTIAL'
    }

    // Update or create ReturnBatch
    let batch = await ReturnBatch.findOne({ InvoiceID: invoiceId })

    if (batch) {
      batch.TotalCardsInInvoice = totalCardsInInvoice
      batch.TotalCardsRequested = totalCardsRequested
      batch.TotalCardsApproved = totalCardsApproved
      batch.TotalCardsRejected = totalCardsRejected
      batch.TotalOriginalAmount = totalOriginalAmount
      batch.TotalRefundAmount = totalRefundAmount
      batch.RefundStatus = refundStatus
      batch.LastUpdatedAt = new Date()
    } else {
      batch = new ReturnBatch({
        InvoiceID: invoiceId,
        TotalCardsInInvoice: totalCardsInInvoice,
        TotalCardsRequested: totalCardsRequested,
        TotalCardsApproved: totalCardsApproved,
        TotalCardsRejected: totalCardsRejected,
        TotalOriginalAmount: totalOriginalAmount,
        TotalRefundAmount: totalRefundAmount,
        RefundStatus: refundStatus
      })
    }

    const savedBatch = await batch.save()

    // Update invoice status based on return batch
    if (refundStatus === 'FULL' || refundStatus === 'FULL_PROCESSED') {
      invoice.Status = 'FULLY_RETURNED'
    } else if (refundStatus === 'PARTIAL' || refundStatus === 'PARTIAL_PROCESSED') {
      invoice.Status = 'PARTIALLY_RETURNED'
    }
    await invoice.save()

    const populatedBatch = await ReturnBatch
      .findById(savedBatch._id)
      .populate({
        path: 'InvoiceID',
        select: 'ID CustomerID InvoiceDate TotalAmount Status',
        populate: {
          path: 'CustomerID',
          populate: {
            path: 'PersonID',
            select: 'ID FullName Phone'
          }
        }
      })

    res.json({
      success: true,
      data: populatedBatch,
      message: 'Return batch recalculated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'RECALCULATE_RETURN_BATCH_ERROR'
      }
    })
  }
})

// DELETE - Delete return batch
returnBatchesRouter.delete('/:id', async (req, res) => {
  try {
    const batch = await ReturnBatch.findById(req.params.id)
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'ReturnBatch not found',
          code: 'RETURN_BATCH_NOT_FOUND'
        }
      })
    }

    await ReturnBatch.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Return batch deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'DELETE_RETURN_BATCH_ERROR'
      }
    })
  }
})

module.exports = returnBatchesRouter
