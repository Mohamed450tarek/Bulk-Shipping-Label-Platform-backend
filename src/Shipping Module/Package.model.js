const mongoose = require('mongoose');

const savedPackageSchema = new mongoose.Schema({
  // Label for quick identification
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Is this the default package?
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Package dimensions and weight
  weight: {
    type: Number,
    required: true,
    min: 0.1
  },
  weightUnit: {
    type: String,
    enum: ['oz', 'lb'],
    default: 'oz'
  },
  
  length: {
    type: Number,
    min: 0
  },
  width: {
    type: Number,
    min: 0
  },
  height: {
    type: Number,
    min: 0
  },
  dimensionUnit: {
    type: String,
    enum: ['in', 'cm'],
    default: 'in'
  },
  
  // Package type
  packageType: {
    type: String,
    enum: ['custom', 'flat_rate_envelope', 'flat_rate_box_small', 'flat_rate_box_medium', 'flat_rate_box_large'],
    default: 'custom'
  },
  
  // User reference
  userId: String
}, {
  timestamps: true
});

// Ensure only one default per user
savedPackageSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('SavedPackage', savedPackageSchema);