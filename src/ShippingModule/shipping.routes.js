 const express = require('express');
const shippingController = require('./Shipping.controller');

const router = express.Router();

/**
 * @route   GET /api/shipping/pricing
 * @desc    Get pricing table
 * @access  Public
 */
router.get('/pricing', shippingController.getPricingTable);

/**
 * @route   GET /api/shipping/calculate
 * @desc    Calculate rate for weight
 * @query   weight - Package weight
 * @query   unit - 'oz' or 'lb' (default: 'oz')
 * @query   service - 'ground' or 'priority' (optional, returns all if not specified)
 * @access  Public
 */
router.get('/calculate', shippingController.calculateRate);

/**
 * @route   GET /api/shipping/rates/:batchId
 * @desc    Get shipping rates for all rows in batch
 * @access  Public
 */
router.get('/rates/:batchId', shippingController.getRatesForBatch);

/**
 * @route   GET /api/shipping/rates/:batchId/:rowId
 * @desc    Get shipping rates for a specific row
 * @access  Public
 */
router.get('/rates/:batchId/:rowId', shippingController.getRatesForRow);

/**
 * @route   POST /api/shipping/select/:batchId
 * @desc    Bulk select shipping for all rows
 * @body    serviceType - 'ground' or 'priority'
 * @body    strategy - 'all' or 'cheapest'
 * @access  Public
 */
router.post('/select/:batchId', shippingController.bulkSelectShipping);

/**
 * @route   POST /api/shipping/select/:batchId/:rowId
 * @desc    Select shipping for a specific row
 * @body    serviceType - 'ground' or 'priority'
 * @access  Public
 */
router.post('/select/:batchId/:rowId', shippingController.selectShipping);

/**
 * @route   POST /api/shipping/purchase/:batchId
 * @desc    Purchase labels for batch
 * @access  Public
 */
router.post('/purchase/:batchId', shippingController.purchaseBatch);

/**
 * @route   GET /api/shipping/labels/:batchId/download
 * @desc    Download all labels for batch as HTML
 * @access  Public
 */
router.get('/labels/:batchId/download', shippingController.downloadBatchLabels);

/**
 * @route   GET /api/shipping/labels/:batchId/:rowId
 * @desc    Get label for a row
 * @access  Public
 */
router.get('/labels/:batchId/:rowId', shippingController.getLabel);

// --- Saved Package Routes ---

/**
 * @route   POST /api/shipping/packages
 * @desc    Create saved package template
 * @access  Public
 */
router.post('/packages', shippingController.createSavedPackage);

/**
 * @route   GET /api/shipping/packages
 * @desc    Get all saved packages
 * @access  Public
 */
router.get('/packages', shippingController.getSavedPackages);

/**
 * @route   GET /api/shipping/packages/:id
 * @desc    Get saved package by ID
 * @access  Public
 */
router.get('/packages/:id', shippingController.getSavedPackageById);

/**
 * @route   PUT /api/shipping/packages/:id
 * @desc    Update saved package
 * @access  Public
 */
router.put('/packages/:id', shippingController.updateSavedPackage);

/**
 * @route   DELETE /api/shipping/packages/:id
 * @desc    Delete saved package
 * @access  Public
 */
router.delete('/packages/:id', shippingController.deleteSavedPackage);

module.exports = router;