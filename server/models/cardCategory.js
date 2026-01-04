const mongoose = require('mongoose');

const cardCategorySchema = new mongoose.Schema({
  ID: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^CCG\d{4}$/, 'Card category ID must follow format CCG0001']
    // Auto-generated in pre-save hook
  },

  Name: {
    type: String,
    required: [true, 'Card category name is required'],
    unique: true,
    trim: true,
    maxlength: [30, 'Card category name cannot exceed 30 characters']
  },

  IsActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// Indexes for faster queries
cardCategorySchema.index({ ID: 1 });
cardCategorySchema.index({ Name: 1 });
cardCategorySchema.index({ IsActive: 1 });

/**
 * Pre-save hook: Auto-generate ID
 * Format: CCG[SEQUENCE]
 * Example: CCG0001
 */
cardCategorySchema.pre('save', async function (next) {
  if (this.isNew && !this.ID) {
    try {
      const CardCategory = mongoose.model('CardCategory');

      // Find the last card category ID
      const lastCardCategory = await CardCategory
        .findOne({}, { ID: 1 })
        .sort({ ID: -1 })
        .lean();

      let sequenceNumber = 1;

      if (lastCardCategory && lastCardCategory.ID) {
        // Extract the sequence number from the last card category ID
        const match = lastCardCategory.ID.match(/\d{4}$/);
        if (match) {
          sequenceNumber = parseInt(match[0], 10) + 1;
        }
      }

      // Generate new card category ID with 4-digit padding
      this.ID = `CCG${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

cardCategorySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('CardCategory', cardCategorySchema);
