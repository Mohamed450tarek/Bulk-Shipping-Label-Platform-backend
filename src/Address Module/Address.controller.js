const addressService = require('./Address.service.js');
const { asyncHandler } = require('../shared/middleware/errorhandler');

/**
 * Validate a single address
 * POST /api/address/validate
 */
const validateAddress = asyncHandler(async (req, res) => {
  const result = await addressService.validateAddress(req.body);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Validate all addresses in a batch
 * POST /api/address/validate-batch/:batchId
 */
const validateBatchAddresses = asyncHandler(async (req, res) => {
  const result = await addressService.validateBatchAddresses(req.params.batchId);

  res.json({
    success: true,
    message: 'Batch validation complete',
    data: result
  });
});

/**
 * Create a saved address
 * POST /api/address/saved
 */
const createSavedAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createSavedAddress(req.body);

  res.status(201).json({
    success: true,
    message: 'Address saved successfully',
    data: address
  });
});

/**
 * Get all saved addresses
 * GET /api/address/saved
 */
const getSavedAddresses = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const addresses = await addressService.getSavedAddresses({ type, search });

  res.json({
    success: true,
    data: addresses
  });
});

/**
 * Get saved address by ID
 * GET /api/address/saved/:id
 */
const getSavedAddressById = asyncHandler(async (req, res) => {
  const address = await addressService.getSavedAddressById(req.params.id);

  res.json({
    success: true,
    data: address
  });
});

/**
 * Update saved address
 * PUT /api/address/saved/:id
 */
const updateSavedAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateSavedAddress(req.params.id, req.body);

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: address
  });
});

/**
 * Delete saved address
 * DELETE /api/address/saved/:id
 */
const deleteSavedAddress = asyncHandler(async (req, res) => {
  await addressService.deleteSavedAddress(req.params.id);

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
});

/**
 * Set default address
 * PATCH /api/address/saved/:id/default
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.params.id);

  res.json({
    success: true,
    message: 'Default address set',
    data: address
  });
});

/**
 * Get default ship-from address
 * GET /api/address/default-ship-from
 */
const getDefaultShipFrom = asyncHandler(async (req, res) => {
  const address = await addressService.getDefaultShipFrom();

  res.json({
    success: true,
    data: address
  });
});

module.exports = {
  validateAddress,
  validateBatchAddresses,
  createSavedAddress,
  getSavedAddresses,
  getSavedAddressById,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultAddress,
  getDefaultShipFrom
};