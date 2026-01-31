 const Batch = require('../Batchmodule/batch.model');
const SavedPackage = require('./Package.model');
const pricingService = require('./Pricing.service');
const logger = require('../shared/logger');
const { AppError } = require('../shared/middleware/errorHandler');
const { packageSchema, validateSchema } = require('../shared/validation');

class ShippingService {
  /**
   * Get shipping rates for a batch row
   */
  async getRatesForRow(batchId, rowId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    const row = batch.rows.id(rowId);
    if (!row) {
      throw new AppError('Row not found', 404, 'ROW_NOT_FOUND');
    }

    const weightOz = this._normalizeWeight(row.package.weight, row.package.weightUnit);
    return pricingService.getAllRates(weightOz);
  }

  /**
   * Get shipping rates for all rows in a batch
   */
  async getRatesForBatch(batchId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    const rowRates = batch.rows.map(row => {
      const weightOz = this._normalizeWeight(row.package.weight, row.package.weightUnit);
      const rates = pricingService.getAllRates(weightOz);
      
      return {
        rowId: row._id,
        rowNumber: row.rowNumber,
        recipientName: row.recipient.name,
        weight: weightOz,
        currentSelection: row.shipping.serviceType,
        ...rates
      };
    });

    return {
      batchId,
      rowCount: batch.rows.length,
      rows: rowRates
    };
  }

  /**
   * Select shipping service for a row
   */
  async selectShipping(batchId, rowId, serviceType) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    const row = batch.rows.id(rowId);
    if (!row) {
      throw new AppError('Row not found', 404, 'ROW_NOT_FOUND');
    }

    const weightOz = this._normalizeWeight(row.package.weight, row.package.weightUnit);
    const rate = pricingService.calculateRate(weightOz, serviceType);

    if (!rate.available) {
      throw new AppError(rate.error, 400, 'SERVICE_NOT_AVAILABLE');
    }

    row.shipping = {
      serviceType,
      rate: rate.rate,
      estimatedDelivery: rate.estimatedDelivery
    };

    await batch.save();

    logger.info('Shipping selected', { batchId, rowId, serviceType, rate: rate.rate });

    return row.shipping;
  }

  /**
   * Bulk select shipping for all rows
   */
  async bulkSelectShipping(batchId, serviceType, strategy = 'all') {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const row of batch.rows) {
      const weightOz = this._normalizeWeight(row.package.weight, row.package.weightUnit);
      
      // Determine service type based on strategy
      let targetService = serviceType;
      if (strategy === 'cheapest') {
        targetService = pricingService.recommendService(weightOz);
      }

      const rate = pricingService.calculateRate(weightOz, targetService);

      if (rate.available) {
        row.shipping = {
          serviceType: targetService,
          rate: rate.rate,
          estimatedDelivery: rate.estimatedDelivery
        };
        updated++;
      } else {
        // Try alternate service
        const altService = targetService === 'ground' ? 'priority' : 'ground';
        const altRate = pricingService.calculateRate(weightOz, altService);
        
        if (altRate.available) {
          row.shipping = {
            serviceType: altService,
            rate: altRate.rate,
            estimatedDelivery: altRate.estimatedDelivery
          };
          updated++;
        } else {
          errors.push({
            rowNumber: row.rowNumber,
            error: rate.error
          });
          skipped++;
        }
      }
    }

    // Update batch estimated cost
    const total = pricingService.calculateBatchTotal(batch.rows);
    batch.stats.estimatedCost = total.totalCost;

    await batch.save();

    logger.info('Bulk shipping selection complete', { batchId, updated, skipped });

    return {
      batchId,
      updated,
      skipped,
      errors,
      estimatedCost: total.totalCost
    };
  }

  /**
   * Purchase labels for a batch (mock implementation)
   */
  async purchaseBatch(batchId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    // Validate batch is ready for purchase
    if (!batch.shipFrom || !batch.shipFrom.street1) {
      throw new AppError('Ship-from address is required', 400, 'MISSING_SHIP_FROM');
    }

    const invalidRows = batch.rows.filter(r => 
      r.validation.status === 'invalid' || !r.shipping.serviceType
    );

    if (invalidRows.length > 0) {
      throw new AppError(
        `${invalidRows.length} rows have validation errors or no shipping selected`,
        400,
        'INVALID_ROWS'
      );
    }

    // Calculate final total
    const total = pricingService.calculateBatchTotal(batch.rows);

    // Mock purchase - generate tracking numbers
    const purchaseResults = batch.rows.map((row, index) => {
      const trackingNumber = this._generateTrackingNumber(row.shipping.serviceType);
      
      row.label = {
        trackingNumber,
        labelUrl: `/api/shipping/labels/${batchId}/${row._id}`,
        purchasedAt: new Date()
      };

      return {
        rowNumber: row.rowNumber,
        trackingNumber,
        serviceType: row.shipping.serviceType,
        rate: row.shipping.rate
      };
    });

    // Update batch status
    batch.status = 'purchased';
    batch.currentStep = 4;
    batch.purchasedAt = new Date();
    batch.stats.estimatedCost = total.totalCost;

    await batch.save();

    logger.info('Batch purchased', { 
      batchId, 
      labelCount: purchaseResults.length,
      totalCost: total.totalCost 
    });

    return {
      success: true,
      batchId,
      purchasedAt: batch.purchasedAt,
      totalCost: total.totalCost,
      labelCount: purchaseResults.length,
      labels: purchaseResults
    };
  }

  /**
   * Get label for a row (mock - returns JSON representation)
   */
  async getLabel(batchId, rowId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    const row = batch.rows.id(rowId);
    if (!row) {
      throw new AppError('Row not found', 404, 'ROW_NOT_FOUND');
    }

    if (!row.label || !row.label.trackingNumber) {
      throw new AppError('Label not yet purchased', 400, 'LABEL_NOT_PURCHASED');
    }

    // Return mock label data
    return {
      trackingNumber: row.label.trackingNumber,
      purchasedAt: row.label.purchasedAt,
      serviceType: row.shipping.serviceType,
      shipFrom: batch.shipFrom,
      shipTo: row.recipient,
      package: row.package,
      rate: row.shipping.rate,
      barcode: `*${row.label.trackingNumber}*` // Mock barcode
    };
  }

  /**
   * Generate all labels for a batch
   */
  async generateBatchLabels(batchId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }

    if (batch.status !== 'purchased') {
      throw new AppError('Labels not yet purchased', 400, 'NOT_PURCHASED');
    }

    const labels = batch.rows
      .filter(row => row.label && row.label.trackingNumber)
      .map(row => ({
        rowNumber: row.rowNumber,
        trackingNumber: row.label.trackingNumber,
        purchasedAt: row.label.purchasedAt,
        serviceType: row.shipping.serviceType,
        rate: row.shipping.rate,
        recipient: {
          name: row.recipient.name,
          company: row.recipient.company,
          street1: row.recipient.street1,
          street2: row.recipient.street2,
          city: row.recipient.city,
          state: row.recipient.state,
          zip: row.recipient.zip,
          country: row.recipient.country || 'US'
        },
        weight: row.package.weight,
        reference: row.reference || row.sku
      }));

    logger.info('Generated batch labels', { batchId, labelCount: labels.length });

    return {
      batch: {
        batchId: batch.batchId,
        originalFilename: batch.originalFilename,
        purchasedAt: batch.purchasedAt,
        shipFrom: batch.shipFrom,
        totalCost: batch.stats.estimatedCost
      },
      labels
    };
  }

  // --- Saved Package CRUD ---

  async createSavedPackage(data) {
    const schemaResult = validateSchema(packageSchema, data);
    if (!schemaResult.valid) {
      throw new AppError(
        `Validation failed: ${schemaResult.errors.map(e => e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const savedPackage = new SavedPackage(data);
    await savedPackage.save();

    logger.info('Saved package created', { id: savedPackage._id, label: savedPackage.label });

    return savedPackage;
  }

  async getSavedPackages(userId = null) {
    const query = userId ? { userId } : {};
    return SavedPackage.find(query).sort({ isDefault: -1, label: 1 });
  }

  async getSavedPackageById(id) {
    const pkg = await SavedPackage.findById(id);
    if (!pkg) {
      throw new AppError('Saved package not found', 404, 'PACKAGE_NOT_FOUND');
    }
    return pkg;
  }

  async updateSavedPackage(id, updates) {
    const pkg = await this.getSavedPackageById(id);
    Object.assign(pkg, updates);
    await pkg.save();

    logger.info('Saved package updated', { id });

    return pkg;
  }

  async deleteSavedPackage(id) {
    await this.getSavedPackageById(id);
    await SavedPackage.deleteOne({ _id: id });

    logger.info('Saved package deleted', { id });

    return { deleted: true };
  }

  // --- Helpers ---

  _normalizeWeight(weight, unit = 'oz') {
    if (unit === 'lb') {
      return weight * 16;
    }
    return weight;
  }

  _generateTrackingNumber(serviceType) {
    const prefix = serviceType === 'ground' ? 'GND' : 'PRI';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

module.exports = new ShippingService();