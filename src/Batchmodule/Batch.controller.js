const batchService = require('./Batch.service');
const { asyncHandler } = require('../shared/middleware/errorhandler');
const logger = require('../shared/logger');

/**
 * Upload CSV and create new batch
 * POST /api/batch/upload
 */
const uploadCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      code: 'NO_FILE',
      message: 'No CSV file uploaded'
    });
  }

  const batch = await batchService.createBatchFromCSV(
    req.file.buffer,
    req.file.originalname
  );

  res.status(201).json({
    success: true,
    message: 'CSV uploaded and batch created',
    data: {
      batchId: batch.batchId,
      filename: batch.originalFilename,
      rowCount: batch.rows.length,
      status: batch.status,
      currentStep: batch.currentStep,
      rows: batch.rows
    }
  });
});

/**
 * Get all batches
 * GET /api/batch
 */
const getAllBatches = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  
  const result = await batchService.getAllBatches({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status
  });

  res.json({
    success: true,
    data: result.batches,
    pagination: result.pagination
  });
});

/**
 * Get batch by ID
 * GET /api/batch/:batchId
 */
const getBatch = asyncHandler(async (req, res) => {
  const batch = await batchService.getBatchById(req.params.batchId);

  res.json({
    success: true,
    data: batch
  });
});

/**
 * Update a row in batch
 * PATCH /api/batch/:batchId/rows/:rowId
 */
const updateRow = asyncHandler(async (req, res) => {
  const { batchId, rowId } = req.params;
  const updates = req.body;

  const row = await batchService.updateRow(batchId, rowId, updates);

  res.json({
    success: true,
    message: 'Row updated successfully',
    data: row
  });
});

/**
 * Delete a row from batch
 * DELETE /api/batch/:batchId/rows/:rowId
 */
const deleteRow = asyncHandler(async (req, res) => {
  const { batchId, rowId } = req.params;

  await batchService.deleteRow(batchId, rowId);

  res.json({
    success: true,
    message: 'Row deleted successfully'
  });
});

/**
 * Update batch step
 * PATCH /api/batch/:batchId/step
 */
const updateStep = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { step } = req.body;

  const batch = await batchService.updateStep(batchId, step);

  res.json({
    success: true,
    message: `Moved to step ${step}`,
    data: {
      batchId: batch.batchId,
      currentStep: batch.currentStep,
      status: batch.status
    }
  });
});

/**
 * Set ship-from address
 * PATCH /api/batch/:batchId/ship-from
 */
const setShipFrom = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const shipFromData = req.body;

  const batch = await batchService.setShipFrom(batchId, shipFromData);

  res.json({
    success: true,
    message: 'Ship-from address set',
    data: {
      batchId: batch.batchId,
      shipFrom: batch.shipFrom
    }
  });
});

/**
 * Delete batch
 * DELETE /api/batch/:batchId
 */
const deleteBatch = asyncHandler(async (req, res) => {
  await batchService.deleteBatch(req.params.batchId);

  res.json({
    success: true,
    message: 'Batch deleted successfully'
  });
});

/**
 * Get batch statistics
 * GET /api/batch/:batchId/stats
 */
const getBatchStats = asyncHandler(async (req, res) => {
  const stats = await batchService.updateStats(req.params.batchId);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  uploadCSV,
  getAllBatches,
  getBatch,
  updateRow,
  deleteRow,
  updateStep,
  setShipFrom,
  deleteBatch,
  getBatchStats
};