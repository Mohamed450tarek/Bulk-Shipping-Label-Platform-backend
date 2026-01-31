const logger = require('../shared/logger');

// Pricing tiers (weight in ounces, price in dollars)
const PRICING_TIERS = {
  ground: [
    { maxWeight: 4, price: 2.50 },
    { maxWeight: 8, price: 2.75 },
    { maxWeight: 12, price: 2.95 },
    { maxWeight: 16, price: 3.00 },  // 1 lb threshold
    // Ground not available above 16oz
  ],
  priority: [
    { maxWeight: 4, price: 4.00 },
    { maxWeight: 8, price: 4.50 },
    { maxWeight: 12, price: 5.00 },
    { maxWeight: 16, price: 5.50 },
    { maxWeight: 32, price: 6.00 },  // 2 lbs
    { maxWeight: 48, price: 7.50 },  // 3 lbs
    { maxWeight: 64, price: 9.00 },  // 4 lbs
    { maxWeight: 80, price: 10.50 }, // 5 lbs
    { maxWeight: 160, price: 15.00 }, // 10 lbs
    { maxWeight: 320, price: 25.00 }, // 20 lbs
    { maxWeight: 1120, price: 50.00 }, // 70 lbs (max)
  ]
};

// Delivery estimates
const DELIVERY_ESTIMATES = {
  ground: '5-7 business days',
  priority: '1-3 business days'
};

// Maximum weights
const MAX_WEIGHT = {
  ground: 16, // oz (1 lb)
  priority: 1120 // oz (70 lbs)
};

class PricingService {
  /**
   * Calculate shipping rate for a given weight
   * @param {number} weightOz - Weight in ounces
   * @param {string} serviceType - 'ground' or 'priority'
   * @returns {object} Rate information
   */
  calculateRate(weightOz, serviceType = 'ground') {
    logger.debug('Calculating rate', { weightOz, serviceType });

    // Validate service type
    if (!['ground', 'priority'].includes(serviceType)) {
      return {
        available: false,
        error: 'Invalid service type'
      };
    }

    // Check weight limits
    if (weightOz <= 0) {
      return {
        available: false,
        error: 'Weight must be greater than 0'
      };
    }

    if (weightOz > MAX_WEIGHT[serviceType]) {
      return {
        available: false,
        error: serviceType === 'ground' 
          ? 'Ground shipping not available for packages over 1 lb (16 oz)' 
          : 'Package exceeds maximum weight limit of 70 lbs'
      };
    }

    // Find applicable tier
    const tiers = PRICING_TIERS[serviceType];
    const tier = tiers.find(t => weightOz <= t.maxWeight);

    if (!tier) {
      return {
        available: false,
        error: 'No pricing tier available for this weight'
      };
    }

    return {
      available: true,
      serviceType,
      weight: weightOz,
      weightLb: (weightOz / 16).toFixed(2),
      rate: tier.price,
      estimatedDelivery: DELIVERY_ESTIMATES[serviceType]
    };
  }

  /**
   * Get all available rates for a weight
   * @param {number} weightOz - Weight in ounces
   * @returns {array} Array of available rates
   */
  getAllRates(weightOz) {
    const rates = [];

    // Check ground availability
    const groundRate = this.calculateRate(weightOz, 'ground');
    if (groundRate.available) {
      rates.push(groundRate);
    }

    // Priority is always available (up to 70 lbs)
    const priorityRate = this.calculateRate(weightOz, 'priority');
    if (priorityRate.available) {
      rates.push(priorityRate);
    }

    // Sort by price (cheapest first)
    rates.sort((a, b) => a.rate - b.rate);

    return {
      weight: weightOz,
      weightLb: (weightOz / 16).toFixed(2),
      rates,
      cheapest: rates[0] || null,
      fastest: rates.find(r => r.serviceType === 'priority') || null,
      groundAvailable: weightOz <= MAX_WEIGHT.ground
    };
  }

  /**
   * Calculate total cost for batch
   * @param {array} rows - Array of shipment rows with weights and service types
   * @returns {object} Total cost breakdown
   */
  calculateBatchTotal(rows) {
    let totalCost = 0;
    let groundCount = 0;
    let priorityCount = 0;
    let errors = [];

    const breakdown = rows.map((row, index) => {
      const weightOz = this._normalizeWeight(row.package?.weight, row.package?.weightUnit);
      const serviceType = row.shipping?.serviceType || 'ground';

      const rate = this.calculateRate(weightOz, serviceType);

      if (!rate.available) {
        errors.push({
          rowNumber: row.rowNumber || index + 1,
          error: rate.error
        });
        return {
          rowNumber: row.rowNumber || index + 1,
          weight: weightOz,
          serviceType,
          rate: null,
          error: rate.error
        };
      }

      totalCost += rate.rate;
      if (serviceType === 'ground') groundCount++;
      else priorityCount++;

      return {
        rowNumber: row.rowNumber || index + 1,
        weight: weightOz,
        serviceType,
        rate: rate.rate
      };
    });

    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      rowCount: rows.length,
      groundCount,
      priorityCount,
      errors,
      breakdown
    };
  }

  /**
   * Recommend service type based on weight
   * @param {number} weightOz - Weight in ounces
   * @returns {string} Recommended service type
   */
  recommendService(weightOz) {
    if (weightOz <= MAX_WEIGHT.ground) {
      return 'ground'; // Cheaper for lightweight
    }
    return 'priority'; // Only option for heavy
  }

  /**
   * Normalize weight to ounces
   */
  _normalizeWeight(weight, unit = 'oz') {
    if (unit === 'lb') {
      return weight * 16;
    }
    return weight;
  }

  /**
   * Get pricing table for display
   */
  getPricingTable() {
    return {
      ground: {
        maxWeight: '16 oz (1 lb)',
        estimatedDelivery: DELIVERY_ESTIMATES.ground,
        tiers: PRICING_TIERS.ground.map(t => ({
          upTo: `${t.maxWeight} oz`,
          price: `$${t.price.toFixed(2)}`
        }))
      },
      priority: {
        maxWeight: '1120 oz (70 lbs)',
        estimatedDelivery: DELIVERY_ESTIMATES.priority,
        tiers: PRICING_TIERS.priority.map(t => ({
          upTo: t.maxWeight <= 16 
            ? `${t.maxWeight} oz` 
            : `${(t.maxWeight / 16).toFixed(0)} lbs`,
          price: `$${t.price.toFixed(2)}`
        }))
      }
    };
  }
}

module.exports = new PricingService();