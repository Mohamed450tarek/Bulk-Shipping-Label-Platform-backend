 const axios = require('axios');
const logger = require('../shared/logger');

/**
 * Address Validation Provider
 * Abstracts external address validation APIs with fallback logic
 */

// Valid US states for basic validation
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
]);

class AddressProvider {
  constructor() {
    this.provider = process.env.ADDRESS_VALIDATION_PROVIDER || 'mock';
    this.uspsUserId = process.env.USPS_USER_ID;
    this.googleApiKey = process.env.GOOGLE_ADDRESS_API_KEY;
  }
  

  /**
   * Main validation method - routes to appropriate provider
   */
  async validate(address) {
    logger.info('Validating address', { 
      provider: this.provider,
      city: address.city,
      state: address.state 
    });

    try {
      switch (this.provider) {
        case 'usps':
          return await this._validateUSPS(address);
        case 'google':
          return await this._validateGoogle(address);
        case 'mock':
        default:
          return this._validateMock(address);
      }
    } catch (error) {
      logger.warn('Address validation API failed, falling back to basic validation', {
        error: error.message,
        provider: this.provider
      });
      return this._validateBasic(address);
    }
  }

  /**
   * USPS Web Tools API validation
   */
  async _validateUSPS(address) {
    if (!this.uspsUserId) {
      throw new Error('USPS_USER_ID not configured');
    }

    const xml = `
      <AddressValidateRequest USERID="${this.uspsUserId}">
        <Revision>1</Revision>
        <Address ID="0">
          <Address1>${address.street2 || ''}</Address1>
          <Address2>${address.street1}</Address2>
          <City>${address.city}</City>
          <State>${address.state}</State>
          <Zip5>${address.zip.substring(0, 5)}</Zip5>
          <Zip4></Zip4>
        </Address>
      </AddressValidateRequest>
    `;

    const response = await axios.get('https://secure.shippingapis.com/ShippingAPI.dll', {
      params: {
        API: 'Verify',
        XML: xml
      },
      timeout: 5000
    });

    // Parse USPS response (simplified)
    const data = response.data;
    
    if (data.includes('<Error>')) {
      const errorMatch = data.match(/<Description>(.*?)<\/Description>/);
      return {
        status: 'invalid',
        messages: [errorMatch ? errorMatch[1] : 'Address validation failed'],
        suggestedAddress: null
      };
    }

    // Extract validated address
    const cityMatch = data.match(/<City>(.*?)<\/City>/);
    const stateMatch = data.match(/<State>(.*?)<\/State>/);
    const zip5Match = data.match(/<Zip5>(.*?)<\/Zip5>/);
    const zip4Match = data.match(/<Zip4>(.*?)<\/Zip4>/);

    return {
      status: 'valid',
      messages: [],
      suggestedAddress: {
        city: cityMatch ? cityMatch[1] : address.city,
        state: stateMatch ? stateMatch[1] : address.state,
        zip: zip4Match && zip4Match[1] 
          ? `${zip5Match[1]}-${zip4Match[1]}` 
          : zip5Match ? zip5Match[1] : address.zip
      }
    };
  }

  /**
   * Google Address Validation API
   */
  async _validateGoogle(address) {
    if (!this.googleApiKey) {
      throw new Error('GOOGLE_ADDRESS_API_KEY not configured');
    }

    const response = await axios.post(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${this.googleApiKey}`,
      {
        address: {
          regionCode: address.country || 'US',
          addressLines: [
            address.street1,
            address.street2 || ''
          ].filter(Boolean),
          locality: address.city,
          administrativeArea: address.state,
          postalCode: address.zip
        }
      },
      { timeout: 5000 }
    );

    const result = response.data.result;
    const verdict = result.verdict;

    if (verdict.addressComplete && verdict.validationGranularity !== 'OTHER') {
      return {
        status: 'valid',
        messages: [],
        suggestedAddress: {
          street1: result.address.formattedAddress,
          city: address.city,
          state: address.state,
          zip: result.address.postalAddress?.postalCode || address.zip
        }
      };
    }

    const messages = [];
    if (verdict.hasUnconfirmedComponents) {
      messages.push('Some address components could not be confirmed');
    }
    if (!verdict.addressComplete) {
      messages.push('Address appears incomplete');
    }

    return {
      status: 'warning',
      messages,
      suggestedAddress: null
    };
  }

  /**
   * Mock validation (for development/testing)
   * More lenient - accepts most valid-looking addresses
   */
  _validateMock(address) {
    logger.info('Using mock address validation', { 
      name: address.name,
      city: address.city,
      state: address.state,
      zip: address.zip
    });
    
    const messages = [];
    let status = 'valid';

    // Check required fields exist
    if (!address.name || address.name.trim().length === 0) {
      status = 'invalid';
      messages.push('Name is required');
    }

    if (!address.street1 || address.street1.trim().length < 3) {
      status = 'invalid';
      messages.push('Street address is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      status = 'invalid';
      messages.push('City is required');
    }

    if (!address.state || address.state.trim().length === 0) {
      status = 'invalid';
      messages.push('State is required');
    }

    if (!address.zip || address.zip.trim().length === 0) {
      status = 'invalid';
      messages.push('ZIP code is required');
    }

    // If any required field is missing, return invalid
    if (status === 'invalid') {
      return { status, messages, suggestedAddress: null };
    }

    // State validation (warning only, not invalid)
    const stateUpper = address.state.toUpperCase().trim();
    if (!US_STATES.has(stateUpper)) {
      status = 'warning';
      messages.push(`State "${address.state}" may not be a valid US state code`);
    }

    // ZIP format check (warning only for non-standard formats)
    const zipClean = address.zip.replace(/\s/g, '');
    if (!/^\d{5}(-\d{4})?$/.test(zipClean)) {
      // Only warn, don't invalidate
      if (status !== 'warning') status = 'warning';
      messages.push('ZIP code format may be non-standard');
    }

    // PO Box warning
    if (address.street1.toLowerCase().includes('po box')) {
      if (status !== 'warning') status = 'warning';
      messages.push('PO Box addresses may have delivery restrictions');
    }

    // If everything looks good, return valid
    if (messages.length === 0) {
      return {
        status: 'valid',
        messages: [],
        suggestedAddress: {
          street1: address.street1.toUpperCase(),
          street2: (address.street2 || '').toUpperCase(),
          city: address.city.toUpperCase(),
          state: stateUpper,
          zip: zipClean
        }
      };
    }

    return {
      status,
      messages,
      suggestedAddress: status === 'valid' ? {
        street1: address.street1.toUpperCase(),
        street2: (address.street2 || '').toUpperCase(),
        city: address.city.toUpperCase(),
        state: stateUpper,
        zip: zipClean
      } : null
    };
  }

  /**
   * Basic regex-based validation (fallback)
   * Used when external APIs fail - very lenient
   */
  _validateBasic(address) {
    logger.warn('Using basic fallback validation');
    
    const messages = [];

    // Check required fields only
    if (!address.name || address.name.trim().length === 0) {
      messages.push('Name is required');
    }
    if (!address.street1 || address.street1.trim().length === 0) {
      messages.push('Street address is required');
    }
    if (!address.city || address.city.trim().length === 0) {
      messages.push('City is required');
    }
    if (!address.state || address.state.trim().length === 0) {
      messages.push('State is required');
    }
    if (!address.zip || address.zip.trim().length === 0) {
      messages.push('ZIP code is required');
    }

    // If missing required fields, return invalid
    if (messages.length > 0) {
      return { status: 'invalid', messages, suggestedAddress: null };
    }

    // All required fields present - return valid with warning
    return {
      status: 'valid',
      messages: ['Address validation API unavailable - basic checks passed'],
      suggestedAddress: {
        street1: address.street1,
        street2: address.street2 || '',
        city: address.city,
        state: address.state.toUpperCase(),
        zip: address.zip
      }
    };
  }
}

module.exports = new AddressProvider();