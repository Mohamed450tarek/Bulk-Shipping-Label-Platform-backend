 const shippingService = require('./shipping.service');
const pricingService = require('./Pricing.service');
const { asyncHandler }  = require('../shared/middleware/errorhandler');

/**
 * Get pricing table
 * GET /api/shipping/pricing
 */
const getPricingTable = asyncHandler(async (req, res) => {
  const pricingTable = pricingService.getPricingTable();

  res.json({
    success: true,
    data: pricingTable
  });
});

/**
 * Calculate rate for a weight
 * GET /api/shipping/calculate
 */
const calculateRate = asyncHandler(async (req, res) => {
  const { weight, unit = 'oz', service } = req.query;
  
  let weightOz = parseFloat(weight);
  if (unit === 'lb') {
    weightOz = weightOz * 16;
  }

  const result = service 
    ? pricingService.calculateRate(weightOz, service)
    : pricingService.getAllRates(weightOz);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get rates for a batch row
 * GET /api/shipping/rates/:batchId/:rowId
 */
const getRatesForRow = asyncHandler(async (req, res) => {
  const { batchId, rowId } = req.params;
  const rates = await shippingService.getRatesForRow(batchId, rowId);

  res.json({
    success: true,
    data: rates
  });
});

/**
 * Get rates for all rows in batch
 * GET /api/shipping/rates/:batchId
 */
const getRatesForBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const rates = await shippingService.getRatesForBatch(batchId);

  res.json({
    success: true,
    data: rates
  });
});

/**
 * Select shipping for a row
 * POST /api/shipping/select/:batchId/:rowId
 */
const selectShipping = asyncHandler(async (req, res) => {
  const { batchId, rowId } = req.params;
  const { serviceType } = req.body;

  const shipping = await shippingService.selectShipping(batchId, rowId, serviceType);

  res.json({
    success: true,
    message: 'Shipping service selected',
    data: shipping
  });
});

/**
 * Bulk select shipping for batch
 * POST /api/shipping/select/:batchId
 */
const bulkSelectShipping = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { serviceType = 'ground', strategy = 'all' } = req.body;

  const result = await shippingService.bulkSelectShipping(batchId, serviceType, strategy);

  res.json({
    success: true,
    message: `Updated ${result.updated} rows`,
    data: result
  });
});

/**
 * Purchase labels for batch
 * POST /api/shipping/purchase/:batchId
 */
const purchaseBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const result = await shippingService.purchaseBatch(batchId);

  res.json({
    success: true,
    message: 'Labels purchased successfully',
    data: result
  });
});

/**
 * Get label for a row
 * GET /api/shipping/labels/:batchId/:rowId
 */
const getLabel = asyncHandler(async (req, res) => {
  const { batchId, rowId } = req.params;
  const label = await shippingService.getLabel(batchId, rowId);

  res.json({
    success: true,
    data: label
  });
});

/**
 * Download all labels for batch as PDF/HTML
 * GET /api/shipping/labels/:batchId/download
 */
const downloadBatchLabels = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { format = 'html' } = req.query;

  const result = await shippingService.generateBatchLabels(batchId);

  if (format === 'json') {
    return res.json({
      success: true,
      data: result
    });
  }

  // Generate HTML labels document
  const html = generateLabelsHTML(result);
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `inline; filename="labels-${batchId}.html"`);
  res.send(html);
});

/**
 * Generate HTML document for labels
 */
function generateLabelsHTML(data) {
  const { batch, labels } = data;
  
  const labelsHTML = labels.map((label, index) => `
    <div class="label" style="page-break-after: always;">
      <div class="label-header">
        <div class="service-badge ${label.serviceType}">${label.serviceType.toUpperCase()}</div>
        <div class="tracking">${label.trackingNumber}</div>
      </div>
      
      <div class="addresses">
        <div class="from-address">
          <div class="address-label">FROM:</div>
          <div class="address-content">
            <strong>${batch.shipFrom?.name || 'Sender'}</strong><br>
            ${batch.shipFrom?.company ? batch.shipFrom.company + '<br>' : ''}
            ${batch.shipFrom?.street1 || ''}<br>
            ${batch.shipFrom?.street2 ? batch.shipFrom.street2 + '<br>' : ''}
            ${batch.shipFrom?.city || ''}, ${batch.shipFrom?.state || ''} ${batch.shipFrom?.zip || ''}
          </div>
        </div>
        
        <div class="to-address">
          <div class="address-label">TO:</div>
          <div class="address-content">
            <strong>${label.recipient.name}</strong><br>
            ${label.recipient.company ? label.recipient.company + '<br>' : ''}
            ${label.recipient.street1}<br>
            ${label.recipient.street2 ? label.recipient.street2 + '<br>' : ''}
            ${label.recipient.city}, ${label.recipient.state} ${label.recipient.zip}
          </div>
        </div>
      </div>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Weight:</span>
          <span class="detail-value">${(label.weight / 16).toFixed(2)} lbs (${label.weight} oz)</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${label.serviceType === 'ground' ? 'Ground (5-7 days)' : 'Priority (1-3 days)'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Rate:</span>
          <span class="detail-value">$${label.rate.toFixed(2)}</span>
        </div>
        ${label.reference ? `
        <div class="detail-row">
          <span class="detail-label">Order #:</span>
          <span class="detail-value">${label.reference}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="barcode">
        <svg class="barcode-placeholder">
          <rect width="100%" height="100%" fill="#f0f0f0"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${label.trackingNumber}</text>
        </svg>
      </div>
      
      <div class="label-footer">
        <span>Label ${index + 1} of ${labels.length}</span>
        <span>Printed: ${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping Labels - ${batch.batchId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .header-info {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 15px;
    }
    
    .header-info div {
      text-align: center;
    }
    
    .header-info .value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    
    .header-info .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    
    .label {
      width: 4in;
      min-height: 6in;
      margin: 20px auto;
      padding: 15px;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .label-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px dashed #ccc;
      margin-bottom: 15px;
    }
    
    .service-badge {
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
    }
    
    .service-badge.ground {
      background: #dcfce7;
      color: #166534;
    }
    
    .service-badge.priority {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .tracking {
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }
    
    .addresses {
      margin-bottom: 15px;
    }
    
    .from-address, .to-address {
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    
    .from-address {
      background: #f9fafb;
      font-size: 12px;
    }
    
    .to-address {
      background: #eff6ff;
      font-size: 14px;
    }
    
    .address-label {
      font-size: 10px;
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    }
    
    .address-content {
      line-height: 1.4;
    }
    
    .details {
      padding: 10px;
      background: #f9fafb;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #eee;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      color: #666;
      font-size: 12px;
    }
    
    .detail-value {
      font-weight: bold;
      font-size: 12px;
    }
    
    .barcode {
      text-align: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .barcode-placeholder {
      width: 100%;
      height: 50px;
    }
    
    .label-footer {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 30px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    
    .print-btn:hover {
      background: #1d4ed8;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .header, .print-btn {
        display: none;
      }
      
      .label {
        margin: 0;
        box-shadow: none;
        border: 1px solid #333;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📦 Shipping Labels</h1>
    <p>Batch ID: ${batch.batchId}</p>
    <div class="header-info">
      <div>
        <div class="value">${labels.length}</div>
        <div class="label">Total Labels</div>
      </div>
      <div>
        <div class="value">$${labels.reduce((sum, l) => sum + l.rate, 0).toFixed(2)}</div>
        <div class="label">Total Cost</div>
      </div>
      <div>
        <div class="value">${new Date(batch.purchasedAt).toLocaleDateString()}</div>
        <div class="label">Purchase Date</div>
      </div>
    </div>
  </div>
  
  ${labelsHTML}
  
  <button class="print-btn" onclick="window.print()">🖨️ Print Labels</button>
</body>
</html>
  `;
}

// --- Saved Package Endpoints ---

/**
 * Create saved package
 * POST /api/shipping/packages
 */
const createSavedPackage = asyncHandler(async (req, res) => {
  const pkg = await shippingService.createSavedPackage(req.body);

  res.status(201).json({
    success: true,
    message: 'Package saved successfully',
    data: pkg
  });
});

/**
 * Get all saved packages
 * GET /api/shipping/packages
 */
const getSavedPackages = asyncHandler(async (req, res) => {
  const packages = await shippingService.getSavedPackages();

  res.json({
    success: true,
    data: packages
  });
});

/**
 * Get saved package by ID
 * GET /api/shipping/packages/:id
 */
const getSavedPackageById = asyncHandler(async (req, res) => {
  const pkg = await shippingService.getSavedPackageById(req.params.id);

  res.json({
    success: true,
    data: pkg
  });
});

/**
 * Update saved package
 * PUT /api/shipping/packages/:id
 */
const updateSavedPackage = asyncHandler(async (req, res) => {
  const pkg = await shippingService.updateSavedPackage(req.params.id, req.body);

  res.json({
    success: true,
    message: 'Package updated successfully',
    data: pkg
  });
});

/**
 * Delete saved package
 * DELETE /api/shipping/packages/:id
 */
const deleteSavedPackage = asyncHandler(async (req, res) => {
  await shippingService.deleteSavedPackage(req.params.id);

  res.json({
    success: true,
    message: 'Package deleted successfully'
  });
});

module.exports = {
  getPricingTable,
  calculateRate,
  getRatesForRow,
  getRatesForBatch,
  selectShipping,
  bulkSelectShipping,
  purchaseBatch,
  getLabel,
  downloadBatchLabels,
  createSavedPackage,
  getSavedPackages,
  getSavedPackageById,
  updateSavedPackage,
  deleteSavedPackage
};