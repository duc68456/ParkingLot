const cardCategoriesRouter = require('express').Router();
const CardCategory = require('../models/cardCategory');
const CardPrice = require('../models/cardPrice');
const mongoose = require('mongoose');

/**
 * GET /api/card-categories
 * Get all card categories with filtering and pagination
 * 
 * Query parameters:
 * - isActive: boolean - Filter by active status
 * - search: string - Search by name
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
cardCategoriesRouter.get('/', async (request, response) => {
  try {
    const {
      isActive,
      search,
      page = 1,
      limit = 20
    } = request.query;

    // Build filter object
    const filter = {};

    if (isActive !== undefined) {
      filter.IsActive = isActive === 'true';
    }

    if (search) {
      filter.Name = new RegExp(search, 'i');
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const cardCategories = await CardCategory.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await CardCategory.countDocuments(filter);

    response.json({
      success: true,
      data: {
        cardCategories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get card categories error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get card categories',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/card-categories/:id
 * Get single card category by ID
 */
cardCategoriesRouter.get('/:id', async (request, response) => {
  try {
    const cardCategory = await CardCategory.findById(request.params.id);

    if (!cardCategory) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Card category not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      });
    }

    response.json({
      success: true,
      data: cardCategory
    });
  } catch (error) {
    console.error('Get card category by ID error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to get card category',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/card-categories
 * Create new card category
 */
cardCategoriesRouter.post('/', async (request, response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const {
      Name,
      IsActive,
      Price,
      price
    } = request.body;

    const initialPrice = Price ?? price;

    // Validation
    if (!Name) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          details: 'Name is required'
        }
      });
    }

    // Check if card category name already exists
    const existingCardCategory = await CardCategory.findOne({
      Name: { $regex: new RegExp(`^${Name}$`, 'i') }
    });

    if (existingCardCategory) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Card category name already exists',
          code: 'DUPLICATE_CARD_CATEGORY_NAME'
        }
      });
    }

    // Create card category
    const cardCategory = new CardCategory({
      Name,
      IsActive: IsActive !== undefined ? IsActive : true
    });

    const savedCardCategory = await cardCategory.save({ session });

    // Create initial card price (optional if no price provided)
    // NOTE: CardPrice.ChangedBy is required; we use the authenticated user id from the token.
    let createdCardPrice = null
    if (initialPrice !== undefined && initialPrice !== null) {
      const numericPrice = Number(initialPrice);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return response.status(400).json({
          success: false,
          error: {
            message: 'Invalid price',
            code: 'INVALID_PRICE',
            details: 'Price must be a non-negative number'
          }
        });
      }

      const created = await CardPrice.create([
        {
          CardCategoryID: savedCardCategory.ID,
          Price: numericPrice,
          ChangedBy: request.user?.employeeId
        }
      ], { session });

      createdCardPrice = Array.isArray(created) ? created[0] : created
    }

    await session.commitTransaction();
    session.endSession();

    response.status(201).json({
      success: true,
      data: {
        cardCategory: savedCardCategory,
        cardPrice: createdCardPrice
      },
      message: 'Card category created successfully'
    });
  } catch (error) {
    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) {
      // ignore session cleanup errors
    }
    console.error('Create card category error:', error);

    // Handle duplicate card category code
    if (error.code === 11000) {
      return response.status(409).json({
        success: false,
        error: {
          message: 'Card category already exists',
          code: 'DUPLICATE_CARD_CATEGORY',
          details: error.message
        }
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.message
        }
      });
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to create card category',
        details: error.message
      }
    });
  }
});

/**
 * PUT /api/card-categories/:id
 * Update card category
 */
cardCategoriesRouter.put('/:id', async (request, response) => {
  try {
    const {
      Name,
      IsActive
    } = request.body;

    // Find card category
    const cardCategory = await CardCategory.findById(request.params.id);

    if (!cardCategory) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Card category not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      });
    }

    // Check if new name already exists (excluding current card category)
    if (Name && Name !== cardCategory.Name) {
      const existingCardCategory = await CardCategory.findOne({
        _id: { $ne: cardCategory._id },
        Name: { $regex: new RegExp(`^${Name}$`, 'i') }
      });

      if (existingCardCategory) {
        return response.status(409).json({
          success: false,
          error: {
            message: 'Card category name already exists',
            code: 'DUPLICATE_CARD_CATEGORY_NAME'
          }
        });
      }
    }

    // Update fields
    if (Name !== undefined) cardCategory.Name = Name;
    if (IsActive !== undefined) cardCategory.IsActive = IsActive;

    const updatedCardCategory = await cardCategory.save();

    response.json({
      success: true,
      data: updatedCardCategory,
      message: 'Card category updated successfully'
    });
  } catch (error) {
    console.error('Update card category error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.message
        }
      });
    }

    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to update card category',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/card-categories/:id
 * Delete card category
 * Note: Can only delete inactive card categories
 */
cardCategoriesRouter.delete('/:id', async (request, response) => {
  try {
    const cardCategory = await CardCategory.findById(request.params.id);

    if (!cardCategory) {
      return response.status(404).json({
        success: false,
        error: {
          message: 'Card category not found',
          code: 'CARD_CATEGORY_NOT_FOUND'
        }
      });
    }

    // Only allow deletion of inactive card categories
    if (cardCategory.IsActive !== false) {
      return response.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete active card category',
          code: 'CARD_CATEGORY_IS_ACTIVE',
          details: 'Card category must be deactivated before deletion'
        }
      });
    }

    // Hard delete - remove from database
    await CardCategory.findByIdAndDelete(request.params.id);

    response.json({
      success: true,
      message: 'Card category deleted successfully',
      data: {
        id: cardCategory._id,
        ID: cardCategory.ID,
        Name: cardCategory.Name
      }
    });
  } catch (error) {
    console.error('Delete card category error:', error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete card category',
        details: error.message
      }
    });
  }
});

module.exports = cardCategoriesRouter;
