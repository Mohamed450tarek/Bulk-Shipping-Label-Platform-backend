const express = require('express');
const multer = require('multer');
const batchController = require('./Batch.controller');

const router = express.Router();

// Configure Multer for CSV file uploads (memory storage for streaming)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files only
    if (file.mimetype === 'text/csv' || 
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

/**
 * @route   POST /api/batch/upload
 * @desc    Upload CSV file and create new batch
 * @access  Public
 */
router.post('/upload', upload.single('file'), batchController.uploadCSV);

/**
 * @route   GET /api/batch
 * @desc    Get all batches with pagination
 * @access  Public
 */
router.get('/', batchController.getAllBatches);

/**
 * @route   GET /api/batch/:batchId
 * @desc    Get batch by ID with all rows
 * @access  Public
 */
router.get('/:batchId', batchController.getBatch);

/**
 * @route   GET /api/batch/:batchId/stats
 * @desc    Get batch statistics
 * @access  Public
 */
router.get('/:batchId/stats', batchController.getBatchStats);

/**
 * @route   PATCH /api/batch/:batchId/rows/:rowId
 * @desc    Update a specific row in batch
 * @access  Public
 */
router.patch('/:batchId/rows/:rowId', batchController.updateRow);

/**
 * @route   DELETE /api/batch/:batchId/rows/:rowId
 * @desc    Delete a row from batch
 * @access  Public
 */
router.delete('/:batchId/rows/:rowId', batchController.deleteRow);

/**
 * @route   PATCH /api/batch/:batchId/step
 * @desc    Update batch workflow step
 * @access  Public
 */
router.patch('/:batchId/step', batchController.updateStep);

/**
 * @route   PATCH /api/batch/:batchId/ship-from
 * @desc    Set ship-from address for batch
 * @access  Public
 */
router.patch('/:batchId/ship-from', batchController.setShipFrom);

/**
 * @route   DELETE /api/batch/:batchId
 * @desc    Delete a batch
 * @access  Public
 */
router.delete('/:batchId', batchController.deleteBatch);

module.exports = router;