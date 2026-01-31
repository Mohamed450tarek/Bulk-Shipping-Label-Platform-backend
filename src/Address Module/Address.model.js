const mongoose = require('mongoose');

const savedAddressSchema = new mongoose.Schema({
  // Address type
  type: {
    type: String,
    enum: ['ship_from', 'ship_to'],
    default: 'ship_from'
  },
  
  // Label for quick identification
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Is this the default address?
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // Address fields
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  street1: { type: String, required: true, trim: true },
  street2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
  zip: { type: String, required: true, trim: true },
  country: { type: String, default: 'US', uppercase: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  
  // Validation status
  validated: {
    type: Boolean,
    default: false
  },
  validatedAddress: {
    street1: String,
    street2: String,
    city: String,
    state: String,
    zip: String
  },
  
  // User reference (for future auth)
  userId: String
}, {
  timestamps: true
});

// Ensure only one default per type per user
savedAddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { 
        type: this.type, 
        userId: this.userId, 
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    );
  }
  next();
});

// Indexes
savedAddressSchema.index({ type: 1, userId: 1 });
savedAddressSchema.index({ label: 'text', name: 'text' });

module.exports = mongoose.model('SavedAddress', savedAddressSchema);