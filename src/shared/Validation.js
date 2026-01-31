 const { z } = require('zod');

// Common address schema - flexible validation
const addressSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  company: z.string().max(100).optional().default(''),
  street1: z.string().min(1, 'Street address is required').max(200),
  street2: z.string().max(200).optional().default(''),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50).transform(s => s.toUpperCase()),
  zip: z.string().min(5, 'ZIP code is required').max(20),
  country: z.string().max(50).default('US'),
  phone: z.string().max(30).optional().default(''),
  email: z.string().max(255).optional().default('')
}).transform(data => ({
  ...data,
  // Clean up ZIP to just 5 or 9 digits if valid
  zip: data.zip.replace(/[^\d-]/g, ''),
  // Clean up state to uppercase 2-letter code
  state: data.state.substring(0, 2).toUpperCase()
}));

// Package dimensions schema
const packageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  weight: z.number().positive('Weight must be positive'),
  weightUnit: z.enum(['oz', 'lb']).default('oz'),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  dimensionUnit: z.enum(['in', 'cm']).default('in')
});

// Shipment row schema (from CSV)
const shipmentRowSchema = z.object({
  recipientName: z.string().min(1),
  recipientCompany: z.string().optional(),
  recipientStreet1: z.string().min(1),
  recipientStreet2: z.string().optional(),
  recipientCity: z.string().min(1),
  recipientState: z.string().length(2).toUpperCase(),
  recipientZip: z.string(),
  recipientCountry: z.string().default('US'),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().optional(),
  weight: z.number().positive(),
  weightUnit: z.enum(['oz', 'lb']).default('oz'),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

// Validate and parse with helpful errors
const validateSchema = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })),
      data: null
    };
  }
  return { valid: true, errors: [], data: result.data };
};

module.exports = {
  addressSchema,
  packageSchema,
  shipmentRowSchema,
  validateSchema,
  z
};