 const { parse } = require('csv-parse/sync');
const Batch = require('./batch.model');
const logger = require('../shared/logger');
const { AppError } = require('../shared/middleware/errorHandler');

// CSV column mapping (maps CSV headers to internal field names)
const CSV_COLUMN_MAP = {
  // === DOT NOTATION COLUMNS (recipient.name format) ===
  'recipient.name': 'recipientName',
  'recipient.street1': 'recipientStreet1',
  'recipient.street2': 'recipientStreet2',
  'recipient.city': 'recipientCity',
  'recipient.state': 'recipientState',
  'recipient.zip': 'recipientZip',
  'recipient.country': 'recipientCountry',
  'recipient.phone': 'recipientPhone',
  'recipient.email': 'recipientEmail',
  'recipient.company': 'recipientCompany',
  'weight.lbs': 'weightLb',
  'weight.lb': 'weightLb',
  'weight.oz': 'weightOz',
  'weight.ounces': 'weightOz',
  'package.weight': 'weight',
  'package.length': 'length',
  'package.width': 'width',
  'package.height': 'height',
  'phone1': 'recipientPhone',
  'phone2': 'recipientPhone2',
  'order_no': 'reference',
  'order_number': 'reference',
  'orderno': 'reference',
  'ordernumber': 'reference',
  'item_sku': 'sku',
  'itemsku': 'sku',
  
  // === COMBINED ADDRESS COLUMNS (From/To format) ===
  'from': 'fromAddress',
  'from_address': 'fromAddress',
  'fromaddress': 'fromAddress',
  'from address': 'fromAddress',
  'sender': 'fromAddress',
  'sender_address': 'fromAddress',
  'ship_from': 'fromAddress',
  'shipfrom': 'fromAddress',
  'origin': 'fromAddress',
  
  'to': 'toAddress',
  'to_address': 'toAddress',
  'toaddress': 'toAddress',
  'to address': 'toAddress',
  'recipient': 'toAddress',
  'recipient_address': 'toAddress',
  'ship_to': 'toAddress',
  'shipto': 'toAddress',
  'destination': 'toAddress',
  'delivery_address': 'toAddress',
  
  // === INDIVIDUAL FIELD COLUMNS ===
  // Recipient Name variations
  'recipient_name': 'recipientName',
  'recipientname': 'recipientName',
  'recipient name': 'recipientName',
  'name': 'recipientName',
  'full_name': 'recipientName',
  'fullname': 'recipientName',
  'full name': 'recipientName',
  'customer_name': 'recipientName',
  'customername': 'recipientName',
  'customer name': 'recipientName',
  'ship_to_name': 'recipientName',
  'shiptoname': 'recipientName',
  'ship to name': 'recipientName',
  
  // Company variations
  'recipient_company': 'recipientCompany',
  'recipientcompany': 'recipientCompany',
  'recipient company': 'recipientCompany',
  'company': 'recipientCompany',
  'company_name': 'recipientCompany',
  'companyname': 'recipientCompany',
  'company name': 'recipientCompany',
  'organization': 'recipientCompany',
  
  // Street 1 variations
  'recipient_street1': 'recipientStreet1',
  'recipientstreet1': 'recipientStreet1',
  'recipient street1': 'recipientStreet1',
  'recipient_street_1': 'recipientStreet1',
  'recipient_address1': 'recipientStreet1',
  'recipientaddress1': 'recipientStreet1',
  'recipient address1': 'recipientStreet1',
  'street1': 'recipientStreet1',
  'street_1': 'recipientStreet1',
  'street 1': 'recipientStreet1',
  'address1': 'recipientStreet1',
  'address_1': 'recipientStreet1',
  'address 1': 'recipientStreet1',
  'address': 'recipientStreet1',
  'street': 'recipientStreet1',
  'street_address': 'recipientStreet1',
  'streetaddress': 'recipientStreet1',
  'street address': 'recipientStreet1',
  'address_line_1': 'recipientStreet1',
  'addressline1': 'recipientStreet1',
  'address line 1': 'recipientStreet1',
  'ship_to_address': 'recipientStreet1',
  'shiptoaddress': 'recipientStreet1',
  'ship to address': 'recipientStreet1',
  
  // Street 2 variations
  'recipient_street2': 'recipientStreet2',
  'recipientstreet2': 'recipientStreet2',
  'recipient street2': 'recipientStreet2',
  'recipient_street_2': 'recipientStreet2',
  'recipient_address2': 'recipientStreet2',
  'recipientaddress2': 'recipientStreet2',
  'recipient address2': 'recipientStreet2',
  'street2': 'recipientStreet2',
  'street_2': 'recipientStreet2',
  'street 2': 'recipientStreet2',
  'address2': 'recipientStreet2',
  'address_2': 'recipientStreet2',
  'address 2': 'recipientStreet2',
  'apt': 'recipientStreet2',
  'apartment': 'recipientStreet2',
  'suite': 'recipientStreet2',
  'unit': 'recipientStreet2',
  'address_line_2': 'recipientStreet2',
  'addressline2': 'recipientStreet2',
  'address line 2': 'recipientStreet2',
  
  // City variations
  'recipient_city': 'recipientCity',
  'recipientcity': 'recipientCity',
  'recipient city': 'recipientCity',
  'city': 'recipientCity',
  'town': 'recipientCity',
  'ship_to_city': 'recipientCity',
  'shiptocity': 'recipientCity',
  'ship to city': 'recipientCity',
  
  // State variations
  'recipient_state': 'recipientState',
  'recipientstate': 'recipientState',
  'recipient state': 'recipientState',
  'state': 'recipientState',
  'province': 'recipientState',
  'region': 'recipientState',
  'state_code': 'recipientState',
  'statecode': 'recipientState',
  'state code': 'recipientState',
  'ship_to_state': 'recipientState',
  'shiptostate': 'recipientState',
  'ship to state': 'recipientState',
  
  // ZIP variations
  'recipient_zip': 'recipientZip',
  'recipientzip': 'recipientZip',
  'recipient zip': 'recipientZip',
  'recipient_zipcode': 'recipientZip',
  'recipientzipcode': 'recipientZip',
  'recipient zipcode': 'recipientZip',
  'recipient_postal': 'recipientZip',
  'recipientpostal': 'recipientZip',
  'recipient postal': 'recipientZip',
  'recipient_postal_code': 'recipientZip',
  'recipientpostalcode': 'recipientZip',
  'recipient postal code': 'recipientZip',
  'zip': 'recipientZip',
  'zipcode': 'recipientZip',
  'zip_code': 'recipientZip',
  'zip code': 'recipientZip',
  'postal': 'recipientZip',
  'postal_code': 'recipientZip',
  'postalcode': 'recipientZip',
  'postal code': 'recipientZip',
  'postcode': 'recipientZip',
  'post_code': 'recipientZip',
  'post code': 'recipientZip',
  'ship_to_zip': 'recipientZip',
  'shiptozip': 'recipientZip',
  'ship to zip': 'recipientZip',
  
  // Country variations
  'recipient_country': 'recipientCountry',
  'recipientcountry': 'recipientCountry',
  'recipient country': 'recipientCountry',
  'country': 'recipientCountry',
  'country_code': 'recipientCountry',
  'countrycode': 'recipientCountry',
  'country code': 'recipientCountry',
  
  // Phone variations
  'recipient_phone': 'recipientPhone',
  'recipientphone': 'recipientPhone',
  'recipient phone': 'recipientPhone',
  'phone': 'recipientPhone',
  'phone_number': 'recipientPhone',
  'phonenumber': 'recipientPhone',
  'phone number': 'recipientPhone',
  'telephone': 'recipientPhone',
  'tel': 'recipientPhone',
  'mobile': 'recipientPhone',
  'cell': 'recipientPhone',
  
  // Email variations
  'recipient_email': 'recipientEmail',
  'recipientemail': 'recipientEmail',
  'recipient email': 'recipientEmail',
  'email': 'recipientEmail',
  'email_address': 'recipientEmail',
  'emailaddress': 'recipientEmail',
  'email address': 'recipientEmail',
  'e-mail': 'recipientEmail',
  
  // Weight variations (including with asterisk)
  'weight': 'weight',
  'weight*': 'weight',
  'weight_oz': 'weight',
  'weightoz': 'weight',
  'weight oz': 'weight',
  'weight_ounces': 'weight',
  'weightounces': 'weight',
  'weight ounces': 'weight',
  'package_weight': 'weight',
  'packageweight': 'weight',
  'package weight': 'weight',
  'weight_lb': 'weightLb',
  'weightlb': 'weightLb',
  'weight lb': 'weightLb',
  'weight_lbs': 'weightLb',
  'weightlbs': 'weightLb',
  'weight lbs': 'weightLb',
  'weight_pounds': 'weightLb',
  'weightpounds': 'weightLb',
  'weight pounds': 'weightLb',
  
  // Dimension variations (including with asterisk)
  'dimensions': 'dimensions',
  'dimensions*': 'dimensions',
  'dimension': 'dimensions',
  'size': 'dimensions',
  'package_size': 'dimensions',
  'pkg_dimensions': 'dimensions',
  'length': 'length',
  'pkg_length': 'length',
  'package_length': 'length',
  'width': 'width',
  'pkg_width': 'width',
  'package_width': 'width',
  'height': 'height',
  'pkg_height': 'height',
  'package_height': 'height',
  
  // Reference variations
  'reference': 'reference',
  'ref': 'reference',
  'order_id': 'reference',
  'orderid': 'reference',
  'order id': 'reference',
  'order_number': 'reference',
  'ordernumber': 'reference',
  'order number': 'reference',
  'order': 'reference',
  'order_ref': 'reference',
  'orderref': 'reference',
  'order ref': 'reference',
  'po_number': 'reference',
  'ponumber': 'reference',
  'po number': 'reference',
  'invoice': 'reference',
  'invoice_number': 'reference',
  'invoicenumber': 'reference',
  'invoice number': 'reference',
  
  // Notes variations
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
  'instructions': 'notes',
  'special_instructions': 'notes',
  'specialinstructions': 'notes',
  'special instructions': 'notes',
  'delivery_instructions': 'notes',
  'deliveryinstructions': 'notes',
  'delivery instructions': 'notes'
};

class BatchService {
  /**
   * Parse CSV buffer and create a new batch
   */
  async createBatchFromCSV(buffer, filename) {
    logger.info('Parsing CSV file', { filename });
    
    try {
      // Parse CSV with flexible options
      const records = parse(buffer, {
        columns: (headers) => {
          logger.info('CSV Headers detected', { headers });
          return headers.map(h => this._normalizeHeader(h));
        },
        skip_empty_lines: true,
        trim: true,
        cast: false, // Don't auto-cast, we'll handle it
        cast_date: false,
        relax_column_count: true,
        relax_quotes: true,
        skip_records_with_empty_values: false
      });

      if (records.length === 0) {
        throw new AppError('CSV file is empty or has no valid data rows', 400, 'EMPTY_CSV');
      }

      // Detect CSV format
      const sampleRecord = records[0];
      const hasToAddress = 'toAddress' in sampleRecord;
      const hasIndividualFields = 'recipientName' in sampleRecord || 'recipientStreet1' in sampleRecord;

      logger.info('CSV format detected', { 
        rowCount: records.length,
        hasToAddress,
        hasIndividualFields,
        columns: Object.keys(sampleRecord)
      });

      // Transform records based on format
      let rows = [];
      let shipFrom = null;
      let skippedRows = 0;
      let errorRows = 0;

      if (hasToAddress) {
        // Format: From, To, Weight, Dimensions (combined address format)
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const row = this._transformCombinedRecord(record, i + 1);
          const validation = this._validateRowData(row);
          
          if (validation.isSkip) {
            skippedRows++;
            logger.info('Skipping empty row', { rowNumber: i + 1 });
            continue;
          }
          
          if (!validation.isValid) {
            row.validation = {
              status: 'invalid',
              messages: validation.errors
            };
            errorRows++;
          }
          
          rows.push(row);
        }
        
        // Extract ship-from from first record if available
        if (records[0].fromAddress) {
          shipFrom = this._parseAddress(records[0].fromAddress);
        }
      } else if (hasIndividualFields) {
        // Format: Individual columns (name, street1, city, state, zip)
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const row = this._transformIndividualRecord(record, i + 1);
          const validation = this._validateRowData(row);
          
          if (validation.isSkip) {
            skippedRows++;
            logger.info('Skipping empty row', { rowNumber: i + 1 });
            continue;
          }
          
          if (!validation.isValid) {
            row.validation = {
              status: 'invalid',
              messages: validation.errors
            };
            errorRows++;
          }
          
          rows.push(row);
        }
      } else {
        // Unknown format
        const mappedFields = Object.keys(sampleRecord);
        throw new AppError(
          `CSV columns not recognized. Found columns: ${mappedFields.join(', ')}. ` +
          `Expected either: (1) 'To' column with full address, or (2) Individual columns like: name, street1, city, state, zip, weight`,
          400,
          'INVALID_CSV_COLUMNS'
        );
      }

      // Re-number rows after filtering
      rows.forEach((row, idx) => {
        row.rowNumber = idx + 1;
      });

      if (rows.length === 0) {
        throw new AppError('No valid rows found in CSV file', 400, 'NO_VALID_ROWS');
      }

      logger.info('CSV rows processed', {
        totalRecords: records.length,
        validRows: rows.length,
        skippedRows,
        errorRows
      });

      // Create batch
      const batch = new Batch({
        originalFilename: filename,
        rows,
        shipFrom: shipFrom || {},
        stats: {
          totalRows: rows.length,
          invalidRows: errorRows
        }
      });

      await batch.save();

      logger.info('Batch created', { 
        batchId: batch.batchId, 
        rowCount: rows.length,
        errorRows
      });

      return batch;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('CSV parsing failed', { error: error.message, stack: error.stack });
      throw new AppError(`Failed to parse CSV: ${error.message}`, 400, 'CSV_PARSE_ERROR');
    }
  }

  /**
   * Validate row data and return validation result
   * Returns { isValid, isSkip, errors }
   */
  _validateRowData(row) {
    const errors = [];
    
    // Check if row is completely empty (skip it)
    const hasAnyData = row.recipient.name || row.recipient.street1 || row.recipient.city;
    if (!hasAnyData) {
      return { isValid: false, isSkip: true, errors: ['Empty row'] };
    }
    
    // Required field validation
    if (!row.recipient.name || !row.recipient.name.trim()) {
      errors.push('Missing recipient name');
    }
    
    if (!row.recipient.street1 || !row.recipient.street1.trim()) {
      errors.push('Missing street address');
    }
    
    if (!row.recipient.city || !row.recipient.city.trim()) {
      errors.push('Missing city');
    }
    
    if (!row.recipient.state || !row.recipient.state.trim()) {
      errors.push('Missing state');
    }
    
    if (!row.recipient.zip || !row.recipient.zip.trim()) {
      errors.push('Missing ZIP code');
    }
    
    // State format validation (should be 2 letters)
    if (row.recipient.state && row.recipient.state.length > 2) {
      // Try to convert full state name to abbreviation
      const stateAbbr = this._getStateAbbreviation(row.recipient.state);
      if (stateAbbr) {
        row.recipient.state = stateAbbr;
      } else {
        errors.push(`Invalid state format: "${row.recipient.state}" (expected 2-letter code)`);
      }
    }
    
    // ZIP code validation
    if (row.recipient.zip && !/^\d{5}(-\d{4})?$/.test(row.recipient.zip)) {
      errors.push(`Invalid ZIP code format: "${row.recipient.zip}"`);
    }
    
    // Weight validation - just warn, don't error
    if (!row.package.weight || row.package.weight <= 0) {
      row.package.weight = 16; // Default to 1 lb
    }
    
    return {
      isValid: errors.length === 0,
      isSkip: false,
      errors
    };
  }

  /**
   * Convert full state name to 2-letter abbreviation
   */
  _getStateAbbreviation(stateName) {
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
      'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
      // Common variations
      'newyork': 'NY', 'northcarolina': 'NC', 'southcarolina': 'SC',
      'westvirginia': 'WV', 'newjersey': 'NJ', 'newmexico': 'NM', 'newhampshire': 'NH',
      'northdakota': 'ND', 'southdakota': 'SD', 'rhodeisland': 'RI'
    };
    
    const normalized = stateName.toLowerCase().trim().replace(/[^a-z]/g, '');
    return stateMap[normalized] || null;
  }

  /**
   * Parse a combined address string into components
   * Handles formats like:
   * - "John Doe, 123 Main St, New York, NY 10001"
   * - "John Doe, 123 Main St, Suite 100, New York, NY 10001"
   * - "123 Main St, New York, NY 10001" (no name)
   */
  _parseAddress(addressString) {
    if (!addressString || typeof addressString !== 'string') {
      return {
        name: '',
        company: '',
        street1: '',
        street2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
        phone: '',
        email: ''
      };
    }

    const parts = addressString.split(',').map(p => p.trim()).filter(p => p);
    
    let name = '';
    let company = '';
    let street1 = '';
    let street2 = '';
    let city = '';
    let state = '';
    let zip = '';
    let country = 'US';

    // Try to parse based on number of parts
    if (parts.length >= 4) {
      // Check if last part contains state and zip (e.g., "NY 10001" or "NY, 10001")
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      
      if (stateZipMatch) {
        // Last part is "STATE ZIP"
        state = stateZipMatch[1].toUpperCase();
        zip = stateZipMatch[2];
        city = parts[parts.length - 2];
        
        // Check if first part looks like a name (no numbers) or an address (has numbers)
        const firstPartHasNumber = /\d/.test(parts[0]);
        
        if (firstPartHasNumber) {
          // First part is street address
          street1 = parts[0];
          if (parts.length > 4) {
            street2 = parts.slice(1, parts.length - 2).join(', ');
          }
        } else {
          // First part is name
          name = parts[0];
          street1 = parts[1];
          if (parts.length > 4) {
            street2 = parts.slice(2, parts.length - 2).join(', ');
          }
        }
      } else {
        // Try alternative parsing - maybe state and zip are separate
        const zipMatch = lastPart.match(/^\d{5}(-\d{4})?$/);
        if (zipMatch) {
          zip = lastPart;
          const secondLastPart = parts[parts.length - 2];
          const stateMatch = secondLastPart.match(/^([A-Z]{2})$/i);
          if (stateMatch) {
            state = stateMatch[1].toUpperCase();
            city = parts[parts.length - 3];
            
            const firstPartHasNumber = /\d/.test(parts[0]);
            if (firstPartHasNumber) {
              street1 = parts[0];
              if (parts.length > 5) {
                street2 = parts.slice(1, parts.length - 3).join(', ');
              }
            } else {
              name = parts[0];
              street1 = parts[1];
              if (parts.length > 5) {
                street2 = parts.slice(2, parts.length - 3).join(', ');
              }
            }
          }
        } else {
          // Fallback: just split into parts
          name = parts[0];
          street1 = parts[1] || '';
          city = parts[2] || '';
          const lastPartSplit = lastPart.split(/\s+/);
          if (lastPartSplit.length >= 2) {
            state = lastPartSplit[0];
            zip = lastPartSplit.slice(1).join('');
          }
        }
      }
    } else if (parts.length === 3) {
      // Minimal: "Street, City, State Zip"
      street1 = parts[0];
      city = parts[1];
      const stateZipMatch = parts[2].match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      if (stateZipMatch) {
        state = stateZipMatch[1].toUpperCase();
        zip = stateZipMatch[2];
      }
    } else if (parts.length === 2) {
      street1 = parts[0];
      city = parts[1];
    } else if (parts.length === 1) {
      street1 = parts[0];
    }

    return {
      name: name.trim(),
      company: company.trim(),
      street1: street1.trim(),
      street2: street2.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      country: country,
      phone: '',
      email: ''
    };
  }

  /**
   * Parse dimensions string like "6x4x2" or "6 x 4 x 2"
   */
  _parseDimensions(dimString) {
    if (!dimString || typeof dimString !== 'string') {
      return { length: null, width: null, height: null };
    }

    // Match patterns like "6x4x2", "6 x 4 x 2", "6*4*2", "6-4-2"
    const match = dimString.match(/(\d+(?:\.\d+)?)\s*[x×*\-]\s*(\d+(?:\.\d+)?)\s*[x×*\-]\s*(\d+(?:\.\d+)?)/i);
    
    if (match) {
      return {
        length: parseFloat(match[1]) || null,
        width: parseFloat(match[2]) || null,
        height: parseFloat(match[3]) || null
      };
    }

    return { length: null, width: null, height: null };
  }

  /**
   * Parse weight string - handles "15", "15 oz", "1.5 lb", etc.
   */
  _parseWeight(weightString) {
    if (!weightString) return { weight: 1, weightUnit: 'oz' };
    
    const str = String(weightString).trim().toLowerCase();
    
    // Check for pounds
    const lbMatch = str.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds)?$/);
    if (lbMatch && (lbMatch[2] || str.includes('lb'))) {
      return {
        weight: parseFloat(lbMatch[1]) * 16, // Convert to oz
        weightUnit: 'oz'
      };
    }
    
    // Default to ounces
    const ozMatch = str.match(/^(\d+(?:\.\d+)?)/);
    if (ozMatch) {
      return {
        weight: parseFloat(ozMatch[1]) || 1,
        weightUnit: 'oz'
      };
    }
    
    return { weight: 1, weightUnit: 'oz' };
  }

  /**
   * Transform a combined address format record (From/To columns)
   */
  _transformCombinedRecord(record, rowNumber) {
    const recipient = this._parseAddress(record.toAddress);
    const { weight, weightUnit } = this._parseWeight(record.weight);
    const dimensions = this._parseDimensions(record.dimensions);

    return {
      rowNumber,
      recipient,
      package: {
        weight,
        weightUnit,
        ...dimensions
      },
      reference: String(record.reference || '').trim(),
      notes: String(record.notes || '').trim(),
      validation: {
        status: 'pending',
        messages: []
      }
    };
  }

  /**
   * Transform individual field format record
   */
  _transformIndividualRecord(record, rowNumber) {
    let weight = 0;
    let weightUnit = 'oz';
    
    // Handle weight.lbs and weight.oz separately
    const weightLb = parseFloat(record.weightLb) || 0;
    const weightOz = parseFloat(record.weightOz) || parseFloat(record.weight) || 0;
    
    // Combine: convert lbs to oz and add oz
    weight = (weightLb * 16) + weightOz;

    if (weight <= 0) {
      weight = 16; // Default to 1 lb if no weight
    }

    // Handle dimensions if provided as single string
    let dimensions = { length: null, width: null, height: null };
    if (record.dimensions) {
      dimensions = this._parseDimensions(record.dimensions);
    } else {
      dimensions = {
        length: parseFloat(record.length) || null,
        width: parseFloat(record.width) || null,
        height: parseFloat(record.height) || null
      };
    }

    return {
      rowNumber,
      recipient: {
        name: String(record.recipientName || '').trim(),
        company: String(record.recipientCompany || '').trim(),
        street1: String(record.recipientStreet1 || '').trim(),
        street2: String(record.recipientStreet2 || '').trim(),
        city: String(record.recipientCity || '').trim(),
        state: String(record.recipientState || '').toUpperCase().trim(),
        zip: String(record.recipientZip || '').trim(),
        country: String(record.recipientCountry || 'US').trim(),
        phone: String(record.recipientPhone || '').trim(),
        email: String(record.recipientEmail || '').trim()
      },
      package: {
        weight,
        weightUnit,
        ...dimensions
      },
      reference: String(record.reference || '').trim(),
      sku: String(record.sku || '').trim(),
      notes: String(record.notes || '').trim(),
      validation: {
        status: 'pending',
        messages: []
      }
    };
  }

  /**
   * Normalize CSV header to mapped field name
   */
  _normalizeHeader(header) {
    if (!header) return 'unknown';
    
    // Convert to lowercase and trim
    let normalized = header.toLowerCase().trim();
    
    // Remove BOM if present
    normalized = normalized.replace(/^\uFEFF/, '');
    
    // FIRST: Check if it's a dot notation column (recipient.name, weight.lbs, etc.)
    // These should be preserved with dots for direct mapping
    if (CSV_COLUMN_MAP[normalized]) {
      return CSV_COLUMN_MAP[normalized];
    }
    
    // Try with underscores converted from dots
    const dotsToUnderscores = normalized.replace(/\./g, '_');
    if (CSV_COLUMN_MAP[dotsToUnderscores]) {
      return CSV_COLUMN_MAP[dotsToUnderscores];
    }
    
    // Keep asterisks for special columns like "Weight*"
    // Replace multiple spaces/underscores with single underscore
    const withUnderscores = normalized.replace(/[\s_]+/g, '_');
    
    // Remove trailing/leading underscores (but keep asterisks)
    const cleaned = withUnderscores.replace(/^_+|_+$/g, '');
    
    // Check direct mapping first (with asterisk)
    if (CSV_COLUMN_MAP[cleaned]) {
      return CSV_COLUMN_MAP[cleaned];
    }
    
    // Try without asterisk
    const noAsterisk = cleaned.replace(/\*/g, '');
    if (CSV_COLUMN_MAP[noAsterisk]) {
      return CSV_COLUMN_MAP[noAsterisk];
    }
    
    // Try without underscores
    const noUnderscore = cleaned.replace(/_/g, '');
    if (CSV_COLUMN_MAP[noUnderscore]) {
      return CSV_COLUMN_MAP[noUnderscore];
    }
    
    // Try with spaces instead of underscores
    const withSpaces = cleaned.replace(/_/g, ' ');
    if (CSV_COLUMN_MAP[withSpaces]) {
      return CSV_COLUMN_MAP[withSpaces];
    }
    
    logger.warn('Unmapped CSV column', { original: header, normalized });
    return normalized;
  }

  /**
   * Get batch by ID
   */
  async getBatchById(batchId) {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
    }
    return batch;
  }

  /**
   * Get all batches with pagination
   */
  async getAllBatches(options = {}) {
    const { page = 1, limit = 20, status } = options;
    const query = status ? { status } : {};
    
    const batches = await Batch.find(query)
      .select('-rows')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Batch.countDocuments(query);
    
    return {
      batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update a specific row in a batch
   */
  async updateRow(batchId, rowId, updates) {
    const batch = await this.getBatchById(batchId);
    
    const rowIndex = batch.rows.findIndex(r => r._id.toString() === rowId);
    if (rowIndex === -1) {
      throw new AppError('Row not found', 404, 'ROW_NOT_FOUND');
    }

    if (updates.recipient) {
      Object.assign(batch.rows[rowIndex].recipient, updates.recipient);
    }
    
    if (updates.package) {
      Object.assign(batch.rows[rowIndex].package, updates.package);
    }
    
    batch.rows[rowIndex].validation = {
      status: 'pending',
      messages: [],
      validatedAt: null
    };
    
    batch.rows[rowIndex].shipping = {
      serviceType: null,
      rate: null
    };

    await batch.save();
    
    logger.info('Row updated', { batchId, rowId });
    
    return batch.rows[rowIndex];
  }

  /**
   * Delete a row from a batch
   */
  async deleteRow(batchId, rowId) {
    const batch = await this.getBatchById(batchId);
    
    const rowIndex = batch.rows.findIndex(r => r._id.toString() === rowId);
    if (rowIndex === -1) {
      throw new AppError('Row not found', 404, 'ROW_NOT_FOUND');
    }

    batch.rows.splice(rowIndex, 1);
    
    batch.rows.forEach((row, idx) => {
      row.rowNumber = idx + 1;
    });

    await batch.save();
    
    logger.info('Row deleted', { batchId, rowId });
    
    return { deleted: true };
  }

  /**
   * Update batch step
   */
  async updateStep(batchId, step) {
    const batch = await this.getBatchById(batchId);
    
    if (step < 1 || step > 4) {
      throw new AppError('Invalid step number', 400, 'INVALID_STEP');
    }
    
    batch.currentStep = step;
    
    const statusMap = {
      1: 'draft',
      2: 'validating',
      3: 'shipping_selected',
      4: 'purchased'
    };
    
    if (step < 4) {
      batch.status = statusMap[step] || batch.status;
    }

    await batch.save();
    
    logger.info('Batch step updated', { batchId, step });
    
    return batch;
  }

  /**
   * Set ship-from address for batch
   */
  async setShipFrom(batchId, shipFromData) {
    const batch = await this.getBatchById(batchId);
    
    batch.shipFrom = shipFromData;
    await batch.save();
    
    logger.info('Ship-from address set', { batchId });
    
    return batch;
  }

  /**
   * Delete a batch
   */
  async deleteBatch(batchId) {
    const batch = await this.getBatchById(batchId);
    
    if (batch.status === 'purchased') {
      throw new AppError('Cannot delete a purchased batch', 400, 'BATCH_PURCHASED');
    }

    await Batch.deleteOne({ batchId });
    
    logger.info('Batch deleted', { batchId });
    
    return { deleted: true };
  }

  /**
   * Update batch statistics
   */
  async updateStats(batchId) {
    const batch = await this.getBatchById(batchId);
    
    let validRows = 0;
    let warningRows = 0;
    let invalidRows = 0;
    let totalWeight = 0;
    
    batch.rows.forEach(row => {
      switch (row.validation.status) {
        case 'valid': validRows++; break;
        case 'warning': warningRows++; break;
        case 'invalid': invalidRows++; break;
      }
      totalWeight += row.package.weight || 0;
    });
    
    batch.stats = {
      totalRows: batch.rows.length,
      validRows,
      warningRows,
      invalidRows,
      totalWeight,
      estimatedCost: batch.stats.estimatedCost
    };
    
    await batch.save();
    
    return batch.stats;
  }
}

module.exports = new BatchService();