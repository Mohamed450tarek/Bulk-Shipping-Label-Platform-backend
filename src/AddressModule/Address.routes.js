const express = require('express');
const addressController = require('./Address.controller.js');

const router = express.Router();

/**
 * @route   POST /api/address/validate
 * @desc    Validate a single address
 * @access  Public
 */
router.post('/validate', addressController.validateAddress);

/**
 * @route   POST /api/address/validate-batch/:batchId
 * @desc    Validate all addresses in a batch
 * @access  Public
 */
router.post('/validate-batch/:batchId', addressController.validateBatchAddresses);

/**
 * @route   GET /api/address/default-ship-from
 * @desc    Get default ship-from address
 * @access  Public
 */
router.get('/default-ship-from', addressController.getDefaultShipFrom);

/**
 * @route   POST /api/address/saved
 * @desc    Create a saved address
 * @access  Public
 */
router.post('/saved', addressController.createSavedAddress);

/**
 * @route   GET /api/address/saved
 * @desc    Get all saved addresses
 * @access  Public
 * 
 */
router.get('/saved', addressController.getSavedAddresses);

/**
 * @route   GET /api/address/saved/:id
 * @desc    Get saved address by ID
 * @access  Public
 */
router.get('/saved/:id', addressController.getSavedAddressById);

/**
 * @route   PUT /api/address/saved/:id
 * @desc    Update saved address
 * @access  Public
 */
router.put('/saved/:id', addressController.updateSavedAddress);

/**
 * @route   DELETE /api/address/saved/:id
 * @desc    Delete saved address
 * @access  Public
 */
router.delete('/saved/:id', addressController.deleteSavedAddress);

/**
 * @route   PATCH /api/address/saved/:id/default
 * @desc    Set address as default
 * @access  Public
 */
router.patch('/saved/:id/default', addressController.setDefaultAddress);

module.exports = router;