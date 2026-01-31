# Bulk Shipping Label Platform

A robust, server-side driven Bulk Shipping Label Creation Platform using a Domain-Driven Modular Monolith architecture with Express.js and MongoDB.

## Architecture

The application follows a **Modular Monolith** pattern, divided into self-contained domain modules:

```
src/
├── app.js                    # App entry point, module stitching
├── server.js                 # Server bootstrap
├── shared/                   # Shared utilities
│   ├── database.js           # MongoDB connection
│   ├── logger.js             # Winston logging
│   ├── validation.js         # Zod schemas
│   └── middleware/
│       ├── errorHandler.js   # Global error handling
│       └── requestLogger.js  # Request logging
└── modules/
    ├── batch/                # CSV upload & batch management
    │   ├── batch.model.js
    │   ├── batch.service.js
    │   ├── batch.controller.js
    │   └── batch.routes.js
    ├── address/              # Address validation & saved addresses
    │   ├── address.model.js
    │   ├── address.service.js
    │   ├── address.provider.js  # External API integration
    │   ├── address.controller.js
    │   └── address.routes.js
    └── shipping/             # Rates, packages & label purchase
        ├── package.model.js
        ├── pricing.service.js   # Tier-based pricing logic
        ├── shipping.service.js
        ├── shipping.controller.js
        └── shipping.routes.js
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# - MONGODB_URI
# - ADDRESS_VALIDATION_PROVIDER (mock/usps/google)

# Start development server
npm run dev
```

### Running Tests

```bash
# Unit tests (no server needed)
node tests/pricing.test.js

# Integration tests (requires server running)
npm start &
npm test
```

## API Reference

### Batch Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch/upload` | Upload CSV file |
| GET | `/api/batch` | List all batches |
| GET | `/api/batch/:batchId` | Get batch details |
| GET | `/api/batch/:batchId/stats` | Get batch statistics |
| PATCH | `/api/batch/:batchId/rows/:rowId` | Update a row |
| DELETE | `/api/batch/:batchId/rows/:rowId` | Delete a row |
| PATCH | `/api/batch/:batchId/step` | Update workflow step |
| PATCH | `/api/batch/:batchId/ship-from` | Set ship-from address |
| DELETE | `/api/batch/:batchId` | Delete batch |

### Address Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/address/validate` | Validate single address |
| POST | `/api/address/validate-batch/:batchId` | Validate batch addresses |
| GET | `/api/address/default-ship-from` | Get default ship-from |
| POST | `/api/address/saved` | Create saved address |
| GET | `/api/address/saved` | List saved addresses |
| GET | `/api/address/saved/:id` | Get saved address |
| PUT | `/api/address/saved/:id` | Update saved address |
| DELETE | `/api/address/saved/:id` | Delete saved address |
| PATCH | `/api/address/saved/:id/default` | Set as default |

### Shipping Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shipping/pricing` | Get pricing table |
| GET | `/api/shipping/calculate` | Calculate rate for weight |
| GET | `/api/shipping/rates/:batchId` | Get rates for batch |
| GET | `/api/shipping/rates/:batchId/:rowId` | Get rates for row |
| POST | `/api/shipping/select/:batchId` | Bulk select shipping |
| POST | `/api/shipping/select/:batchId/:rowId` | Select shipping for row |
| POST | `/api/shipping/purchase/:batchId` | Purchase labels |
| GET | `/api/shipping/labels/:batchId/:rowId` | Get label |
| POST | `/api/shipping/packages` | Create saved package |
| GET | `/api/shipping/packages` | List saved packages |
| GET | `/api/shipping/packages/:id` | Get saved package |
| PUT | `/api/shipping/packages/:id` | Update saved package |
| DELETE | `/api/shipping/packages/:id` | Delete saved package |

## CSV Format

The platform accepts CSV files with the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| recipient_name | Yes | Recipient's name |
| recipient_company | No | Company name |
| recipient_street1 | Yes | Street address |
| recipient_street2 | No | Apt/Suite/Unit |
| recipient_city | Yes | City |
| recipient_state | Yes | 2-letter state code |
| recipient_zip | Yes | ZIP code (5 or 9 digit) |
| recipient_phone | No | Phone number |
| recipient_email | No | Email address |
| weight | Yes | Package weight (oz) |
| length | No | Length (inches) |
| width | No | Width (inches) |
| height | No | Height (inches) |
| reference | No | Order/reference number |
| notes | No | Special instructions |

## Pricing Tiers

### Ground Shipping (Max 16oz / 1lb)

| Weight | Price |
|--------|-------|
| ≤ 4 oz | $2.50 |
| ≤ 8 oz | $2.75 |
| ≤ 12 oz | $2.95 |
| ≤ 16 oz | $3.00 |

### Priority Shipping (Max 70lbs)

| Weight | Price |
|--------|-------|
| ≤ 4 oz | $4.00 |
| ≤ 8 oz | $4.50 |
| ≤ 12 oz | $5.00 |
| ≤ 16 oz | $5.50 |
| ≤ 2 lbs | $6.00 |
| ≤ 3 lbs | $7.50 |
| ≤ 4 lbs | $9.00 |
| ≤ 5 lbs | $10.50 |
| ≤ 10 lbs | $15.00 |
| ≤ 20 lbs | $25.00 |
| ≤ 70 lbs | $50.00 |

## Address Validation

The platform supports multiple address validation providers:

- **mock** (default): Basic regex validation for development
- **usps**: USPS Web Tools API
- **google**: Google Address Validation API

Set the provider via `ADDRESS_VALIDATION_PROVIDER` environment variable.

## Workflow Steps

1. **Upload** - CSV file upload and parsing
2. **Validate** - Address validation with warnings/errors
3. **Select Shipping** - Choose Ground or Priority for each shipment
4. **Purchase** - Generate labels and tracking numbers

## Logging

Structured logging via Winston:
- Console output with colors
- File logging to `logs/error.log` and `logs/combined.log`
- Request/response logging with duration

## Error Handling

- Global error middleware
- Zod validation errors
- Mongoose validation errors
- Custom AppError class with error codes

## License

ISC