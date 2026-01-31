 const SavedAddress = require('./Address.model');
const Batch = require('../Batchmodule/Batch.model');
const addressProvider = require('./Address.provider');
const logger = require('../shared/logger');
const { AppError } = require('../shared/middleware/errorhandler');
const { addressSchema, validateSchema } = require('../shared/Validation');

class AddressService {
  /**
   * Validate a single address
   */
  async validateAddress(address) {
    // First, validate schema
    const schemaResult = validateSchema(addressSchema, address);
    if (!schemaResult.valid) {
      return {
        status: 'invalid',
        messages: schemaResult.errors.map(e => `${e.field}: ${e.message}`),
        suggestedAddress: null
      };
    }

    // Call external provider
    const result = await addressProvider.validate(address);
    
    logger.info('Address validation result', {
      status: result.status,
      messageCount: result.messages.length
    });

    return result;
  }

  /**
   * Validate all rows in a batch
   */
  async validateBatchAddresses(batchId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    logger.info('Starting batch address validation', { 
      batchId, 
      rowCount: batch.rows.length 
    });

    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;

    // Validate each row
    for (let i = 0; i < batch.rows.length; i++) {
      const row = batch.rows[i];
      
      try {
        const result = await this.validateAddress(row.recipient);
        
        row.validation = {
          status: result.status,
          messages: result.messages,
          validatedAt: new Date()
        };

        // Update suggested address if valid
        if (result.status === 'valid' && result.suggestedAddress) {
          // Store original and suggested for user review
          row.validation.suggestedAddress = result.suggestedAddress;
        }

        switch (result.status) {
          case 'valid': validCount++; break;
          case 'warning': warningCount++; break;
          case 'invalid': invalidCount++; break;
        }
      } catch (error) {
        logger.error('Row validation failed', { 
          batchId, 
          rowNumber: row.rowNumber,
          error: error.message 
        });
        
        row.validation = {
          status: 'warning',
          messages: ['Validation service unavailable'],
          validatedAt: new Date()
        };
        warningCount++;
      }
    }

    // Update batch stats
    batch.stats.validRows = validCount;
    batch.stats.warningRows = warningCount;
    batch.stats.invalidRows = invalidCount;
    batch.status = 'validated';

    await batch.save();

    logger.info('Batch validation complete', {
      batchId,
      valid: validCount,
      warning: warningCount,
      invalid: invalidCount
    });

    return {
      batchId,
      totalRows: batch.rows.length,
      valid: validCount,
      warning: warningCount,
      invalid: invalidCount,
      rows: batch.rows
    };
  }

  /**
   * Create a saved address
   */
  async createSavedAddress(data) {
    // Check required fields for SavedAddress model
    if (!data.label || !data.label.trim()) {
      throw new AppError('Label is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.name || !data.name.trim()) {
      throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.street1 || !data.street1.trim()) {
      throw new AppError('Street address is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.city || !data.city.trim()) {
      throw new AppError('City is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.state || !data.state.trim()) {
      throw new AppError('State is required', 400, 'VALIDATION_ERROR');
    }
    if (!data.zip || !data.zip.trim()) {
      throw new AppError('ZIP code is required', 400, 'VALIDATION_ERROR');
    }

    // Normalize state to 2 letters
    let state = data.state.toUpperCase().trim();
    if (state.length > 2) {
      // Try to get abbreviation
      const stateMap = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
      };
      const normalized = state.toLowerCase().replace(/[^a-z\s]/g, '');
      state = stateMap[normalized] || state.substring(0, 2);
    }

    // Try to validate with provider, but don't fail if provider is unavailable
    let validated = false;
    let validatedAddress = null;
    
    try {
      const validationResult = await addressProvider.validate({
        name: data.name,
        street1: data.street1,
        street2: data.street2 || '',
        city: data.city,
        state: state,
        zip: data.zip,
        country: data.country || 'US'
      });
      validated = validationResult.status === 'valid';
      validatedAddress = validationResult.suggestedAddress;
    } catch (error) {
      logger.warn('Address validation failed, saving without validation', { error: error.message });
      validated = false;
    }

    const savedAddress = new SavedAddress({
      type: data.type || 'ship_from',
      label: data.label.trim(),
      isDefault: data.isDefault || false,
      name: data.name.trim(),
      company: (data.company || '').trim(),
      street1: data.street1.trim(),
      street2: (data.street2 || '').trim(),
      city: data.city.trim(),
      state: state,
      zip: data.zip.trim(),
      country: (data.country || 'US').toUpperCase(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      validated,
      validatedAddress
    });

    await savedAddress.save();

    logger.info('Saved address created', { 
      id: savedAddress._id,
      label: savedAddress.label 
    });

    return savedAddress;
  }

  /**
   * Get all saved addresses
   */
  async getSavedAddresses(options = {}) {
    const { type, search, userId } = options;
    const query = {};

    if (type) query.type = type;
    if (userId) query.userId = userId;
    if (search) {
      query.$text = { $search: search };
    }

    const addresses = await SavedAddress.find(query)
      .sort({ isDefault: -1, label: 1 });

    return addresses;
  }

  /**
   * Get saved address by ID
   */
  async getSavedAddressById(id) {
    const address = await SavedAddress.findById(id);
    if (!address) {
      throw new AppError('Saved address not found', 404, 'ADDRESS_NOT_FOUND');
    }
    return address;
  }

  /**
   * Update saved address
   */
  async updateSavedAddress(id, updates) {
    const address = await this.getSavedAddressById(id);

    // If address fields changed, re-validate
    const addressFields = ['street1', 'street2', 'city', 'state', 'zip'];
    const addressChanged = addressFields.some(field => 
      updates[field] && updates[field] !== address[field]
    );

    if (addressChanged) {
      const mergedAddress = { ...address.toObject(), ...updates };
      const validationResult = await addressProvider.validate(mergedAddress);
      updates.validated = validationResult.status === 'valid';
      updates.validatedAddress = validationResult.suggestedAddress;
    }

    Object.assign(address, updates);
    await address.save();

    logger.info('Saved address updated', { id });

    return address;
  }

  /**
   * Delete saved address
   */
  async deleteSavedAddress(id) {
    const address = await this.getSavedAddressById(id);
    await SavedAddress.deleteOne({ _id: id });

    logger.info('Saved address deleted', { id });

    return { deleted: true };
  }

  /**
   * Set default address
   */
  async setDefaultAddress(id) {
    const address = await this.getSavedAddressById(id);
    address.isDefault = true;
    await address.save();

    logger.info('Default address set', { id, type: address.type });

    return address;
  }

  /**
   * Get default ship-from address
   */
  async getDefaultShipFrom(userId = null) {
    const query = { type: 'ship_from', isDefault: true };
    if (userId) query.userId = userId;

    const address = await SavedAddress.findOne(query);
    return address;
  }
}

module.exports = new AddressService();