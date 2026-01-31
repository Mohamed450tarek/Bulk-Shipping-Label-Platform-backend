const mongoose = require('mongoose');

// Schema for individual shipment rows within a batch
const shipmentRowSchema = new mongoose.Schema({
  rowNumber: { type: Number, required: true },
  
  // Recipient address
  recipient: {
    name: { type: String, required: true },
    company: String,
    street1: { type: String, required: true },
    street2: String,
    city: { type: String, required: true },
    state: { type: String, required: true, uppercase: true },
    zip: { type: String, required: true },
    country: { type: String, default: 'US' },
    phone: String,
    email: String
  },
  
  // Package details
  package: {
    weight: { type: Number, required: true },
    weightUnit: { type: String, enum: ['oz', 'lb'], default: 'oz' },
    length: Number,
    width: Number,
    height: Number,
    dimensionUnit: { type: String, enum: ['in', 'cm'], default: 'in' }
  },
  
  // Additional info
  reference: String,
  notes: String,
  
  // Validation status
  validation: {
    status: { 
      type: String, 
      enum: ['pending', 'valid', 'warning', 'invalid'], 
      default: 'pending' 
    },
    messages: [String],
    validatedAt: Date
  },
  
  // Shipping selection
  shipping: {
    serviceType: { type: String, enum: ['ground', 'priority', null], default: null },
    rate: Number,
    estimatedDelivery: String
  },
  
  // Label info (after purchase)
  label: {
    trackingNumber: String,
    labelUrl: String,
    purchasedAt: Date
  }
}, { _id: true });

// Main Batch schema
const batchSchema = new mongoose.Schema({
  // Batch identification
  batchId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Batch status/step tracking
  status: { 
    type: String, 
    enum: ['draft', 'validating', 'validated', 'shipping_selected', 'purchased', 'cancelled'],
    default: 'draft'
  },
  currentStep: { 
    type: Number, 
    min: 1, 
    max: 4, 
    default: 1 
  },
  
  // Ship From address
  shipFrom: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedAddress' },
    name: String,
    company: String,
    street1: String,
    street2: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'US' },
    phone: String,
    email: String
  },
  
  // Shipment rows
  rows: [shipmentRowSchema],
  
  // Statistics
  stats: {
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    warningRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 }
  },
  
  // Metadata
  originalFilename: String,
  uploadedAt: { type: Date, default: Date.now },
  lastModifiedAt: { type: Date, default: Date.now },
  purchasedAt: Date,
  
  // User reference (for future auth)
  userId: String
}, {
  timestamps: true
});

// Update lastModifiedAt on save
batchSchema.pre('save', function(next) {
  this.lastModifiedAt = new Date();
  this.stats.totalRows = this.rows.length;
  next();
});

// Index for efficient queries
batchSchema.index({ batchId: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Batch', batchSchema);