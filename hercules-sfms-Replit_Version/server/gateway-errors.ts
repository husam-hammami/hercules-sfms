/**
 * Gateway API Error Handling Helper
 * Provides standardized error responses for all gateway endpoints
 */

export enum GatewayErrorCode {
  // Activation Errors
  ACTIVATION_CODE_MISSING = 'ACTIVATION_CODE_MISSING',
  ACTIVATION_CODE_FORMAT_INVALID = 'ACTIVATION_CODE_FORMAT_INVALID',
  ACTIVATION_CODE_NOT_FOUND = 'ACTIVATION_CODE_NOT_FOUND',
  ACTIVATION_CODE_EXPIRED = 'ACTIVATION_CODE_EXPIRED',
  ACTIVATION_CODE_REVOKED = 'ACTIVATION_CODE_REVOKED',
  ACTIVATION_CODE_ALREADY_USED = 'ACTIVATION_CODE_ALREADY_USED',
  MACHINE_ID_MISSING = 'MACHINE_ID_MISSING',
  MACHINE_ID_FORMAT_INVALID = 'MACHINE_ID_FORMAT_INVALID',
  MACHINE_ID_MISMATCH = 'MACHINE_ID_MISMATCH',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Authentication Errors
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_FORMAT_INVALID = 'TOKEN_FORMAT_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_VERIFICATION_FAILED = 'TOKEN_VERIFICATION_FAILED',
  GATEWAY_ID_MISMATCH = 'GATEWAY_ID_MISMATCH',
  
  // Configuration Errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  PLC_CONFIG_EMPTY = 'PLC_CONFIG_EMPTY',
  SCHEMA_VERSION_MISMATCH = 'SCHEMA_VERSION_MISMATCH',
  INVALID_CONFIG_FORMAT = 'INVALID_CONFIG_FORMAT',
  
  // Data Validation Errors
  BATCH_ID_MISSING = 'BATCH_ID_MISSING',
  BATCH_SIZE_EXCEEDED = 'BATCH_SIZE_EXCEEDED',
  DATA_FORMAT_INVALID = 'DATA_FORMAT_INVALID',
  TAG_ID_MISSING = 'TAG_ID_MISSING',
  TAG_VALUE_INVALID = 'TAG_VALUE_INVALID',
  TIMESTAMP_INVALID = 'TIMESTAMP_INVALID',
  COMPRESSION_ERROR = 'COMPRESSION_ERROR',
  
  // Heartbeat Errors
  METRICS_FORMAT_INVALID = 'METRICS_FORMAT_INVALID',
  METRICS_MISSING = 'METRICS_MISSING',
  HEARTBEAT_INTERVAL_EXCEEDED = 'HEARTBEAT_INTERVAL_EXCEEDED',
  
  // Command Errors
  COMMAND_TYPE_INVALID = 'COMMAND_TYPE_INVALID',
  COMMAND_PARAMETERS_MISSING = 'COMMAND_PARAMETERS_MISSING',
  COMMAND_NOT_ALLOWED = 'COMMAND_NOT_ALLOWED',
  COMMAND_QUEUE_FULL = 'COMMAND_QUEUE_FULL',
  
  // Database Errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  
  // General Errors
  REQUEST_BODY_MISSING = 'REQUEST_BODY_MISSING',
  REQUEST_BODY_TOO_LARGE = 'REQUEST_BODY_TOO_LARGE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_NOT_REGISTERED = 'GATEWAY_NOT_REGISTERED'
}

export interface ErrorDetails {
  field?: string;
  expected?: string | number | boolean | any;
  received?: string | number | boolean | any;
  hint?: string;
  requiredFields?: string[];
  maxSize?: number;
  currentSize?: number;
  retryAfterMs?: number;
  expiresAt?: string;
  activatedAt?: string;
  machineId?: string;
  validFormat?: string;
  supportedTypes?: string[];
  limit?: number;
  current?: number;
  configuredPLCs?: number;
  configuredTags?: number;
  [key: string]: unknown;
}

export interface GatewayErrorResponse {
  ok: false;
  error: string;
  message: string;
  details?: ErrorDetails;
  timestamp: string;
}

/**
 * Create a standardized error response for gateway APIs
 */
export function createGatewayError(
  code: GatewayErrorCode | string,
  message: string,
  details?: ErrorDetails,
  statusCode?: number
): { statusCode: number; response: GatewayErrorResponse } {
  const response: GatewayErrorResponse = {
    ok: false,
    error: code,
    message,
    timestamp: new Date().toISOString()
  };

  if (details && Object.keys(details).length > 0) {
    response.details = details;
  }

  // Determine status code based on error code if not provided
  if (!statusCode) {
    statusCode = getStatusCodeForError(code as GatewayErrorCode);
  }

  return { statusCode, response };
}

/**
 * Get appropriate HTTP status code for error type
 */
function getStatusCodeForError(code: GatewayErrorCode): number {
  switch (code) {
    // 400 Bad Request - Invalid input
    case GatewayErrorCode.ACTIVATION_CODE_MISSING:
    case GatewayErrorCode.ACTIVATION_CODE_FORMAT_INVALID:
    case GatewayErrorCode.MACHINE_ID_MISSING:
    case GatewayErrorCode.MACHINE_ID_FORMAT_INVALID:
    case GatewayErrorCode.REQUEST_BODY_MISSING:
    case GatewayErrorCode.BATCH_ID_MISSING:
    case GatewayErrorCode.DATA_FORMAT_INVALID:
    case GatewayErrorCode.TAG_ID_MISSING:
    case GatewayErrorCode.TAG_VALUE_INVALID:
    case GatewayErrorCode.TIMESTAMP_INVALID:
    case GatewayErrorCode.METRICS_FORMAT_INVALID:
    case GatewayErrorCode.METRICS_MISSING:
    case GatewayErrorCode.COMMAND_TYPE_INVALID:
    case GatewayErrorCode.COMMAND_PARAMETERS_MISSING:
    case GatewayErrorCode.INVALID_CONFIG_FORMAT:
      return 400;

    // 401 Unauthorized - Authentication required
    case GatewayErrorCode.TOKEN_MISSING:
    case GatewayErrorCode.TOKEN_FORMAT_INVALID:
    case GatewayErrorCode.TOKEN_EXPIRED:
    case GatewayErrorCode.TOKEN_INVALID:
    case GatewayErrorCode.TOKEN_VERIFICATION_FAILED:
      return 401;

    // 403 Forbidden - Access denied
    case GatewayErrorCode.GATEWAY_ID_MISMATCH:
    case GatewayErrorCode.COMMAND_NOT_ALLOWED:
    case GatewayErrorCode.GATEWAY_NOT_REGISTERED:
      return 403;

    // 404 Not Found
    case GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND:
    case GatewayErrorCode.CONFIG_NOT_FOUND:
      return 404;

    // 409 Conflict
    case GatewayErrorCode.MACHINE_ID_MISMATCH:
    case GatewayErrorCode.ACTIVATION_CODE_ALREADY_USED:
      return 409;

    // 410 Gone - Resource no longer available
    case GatewayErrorCode.ACTIVATION_CODE_EXPIRED:
    case GatewayErrorCode.ACTIVATION_CODE_REVOKED:
      return 410;

    // 413 Payload Too Large
    case GatewayErrorCode.REQUEST_BODY_TOO_LARGE:
    case GatewayErrorCode.BATCH_SIZE_EXCEEDED:
      return 413;

    // 422 Unprocessable Entity
    case GatewayErrorCode.COMPRESSION_ERROR:
    case GatewayErrorCode.SCHEMA_VERSION_MISMATCH:
      return 422;

    // 429 Too Many Requests
    case GatewayErrorCode.RATE_LIMIT_EXCEEDED:
    case GatewayErrorCode.COMMAND_QUEUE_FULL:
    case GatewayErrorCode.HEARTBEAT_INTERVAL_EXCEEDED:
      return 429;

    // 503 Service Unavailable
    case GatewayErrorCode.DATABASE_CONNECTION_FAILED:
    case GatewayErrorCode.DATABASE_TIMEOUT:
    case GatewayErrorCode.SERVICE_UNAVAILABLE:
      return 503;

    // 500 Internal Server Error - Default
    case GatewayErrorCode.DATABASE_QUERY_FAILED:
    case GatewayErrorCode.INTERNAL_SERVER_ERROR:
    default:
      return 500;
  }
}

/**
 * Specific error creators for common scenarios
 */

export function activationCodeMissingError() {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_MISSING,
    'Activation code is required to register this gateway.',
    {
      field: 'activationCode',
      hint: 'Provide the activation code in the request body as "activationCode" or "activation_code"',
      requiredFields: ['activationCode', 'machineId']
    }
  );
}

export function activationCodeFormatError(providedCode: string) {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_FORMAT_INVALID,
    `The activation code format is invalid. Expected format: HERC-XXXX-XXXX-XXXX-XXXX`,
    {
      field: 'activationCode',
      expected: 'HERC-XXXX-XXXX-XXXX-XXXX',
      received: providedCode,
      validFormat: 'HERC-[4 chars]-[4 chars]-[4 chars]-[4 chars]',
      hint: 'Ensure you copied the entire activation code correctly, including all hyphens'
    }
  );
}

export function activationCodeNotFoundError(codePrefix: string) {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND,
    'The provided activation code does not exist in our system.',
    {
      field: 'activationCode',
      received: codePrefix + '...',
      hint: 'Double-check the activation code for typos. If the code is correct, it may have been deleted or never generated. Contact support for a new code.'
    }
  );
}

export function activationCodeExpiredError(expiresAt: Date, codePrefix: string) {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_EXPIRED,
    `This activation code expired on ${expiresAt.toLocaleString()}. Expired codes cannot be used.`,
    {
      field: 'activationCode',
      received: codePrefix + '...',
      expiresAt: expiresAt.toISOString(),
      hint: 'Request a new activation code from your administrator or through the portal.'
    }
  );
}

export function activationCodeAlreadyUsedError(activatedAt: Date, machineId?: string) {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_ALREADY_USED,
    `This activation code was already used on ${activatedAt.toLocaleString()}.`,
    {
      field: 'activationCode',
      activatedAt: activatedAt.toISOString(),
      machineId: machineId ? machineId.substring(0, 8) + '...' : undefined,
      hint: 'Each activation code can only be used once. Request a new code for this gateway.'
    }
  );
}

export function machineIdMissingError() {
  return createGatewayError(
    GatewayErrorCode.MACHINE_ID_MISSING,
    'Machine ID is required for gateway activation to ensure secure binding.',
    {
      field: 'machineId',
      hint: 'Provide the machine ID in gatewayInfo.hardware.machineId or as a separate machineId field',
      requiredFields: ['activationCode', 'machineId']
    }
  );
}

export function machineIdMismatchError(expectedMachine: string, providedMachine: string) {
  return createGatewayError(
    GatewayErrorCode.MACHINE_ID_MISMATCH,
    'This activation code is bound to a different machine and cannot be used here.',
    {
      field: 'machineId',
      expected: expectedMachine.substring(0, 8) + '...',
      received: providedMachine.substring(0, 8) + '...',
      hint: 'Activation codes are locked to specific machines for security. Use the original machine or request a new activation code.'
    }
  );
}

export function rateLimitExceededError(retryAfterMs: number) {
  return createGatewayError(
    GatewayErrorCode.RATE_LIMIT_EXCEEDED,
    `Too many activation attempts. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`,
    {
      retryAfterMs,
      hint: `You've exceeded the rate limit. Wait ${Math.ceil(retryAfterMs / 60000)} minutes before attempting activation again.`,
      limit: 10,
      current: 10
    }
  );
}

export function tokenMissingError() {
  return createGatewayError(
    GatewayErrorCode.TOKEN_MISSING,
    'Authentication token is required to access this endpoint.',
    {
      field: 'Authorization',
      expected: 'Bearer <token>',
      hint: 'Include the JWT token in the Authorization header as "Bearer <token>"'
    }
  );
}

export function tokenFormatInvalidError(providedFormat: string) {
  return createGatewayError(
    GatewayErrorCode.TOKEN_FORMAT_INVALID,
    'The authorization header format is invalid.',
    {
      field: 'Authorization',
      expected: 'Bearer <token>',
      received: providedFormat,
      hint: 'Use the format "Bearer <token>" where <token> is your JWT token'
    }
  );
}

export function tokenExpiredError() {
  return createGatewayError(
    GatewayErrorCode.TOKEN_EXPIRED,
    'Your authentication token has expired. Please refresh or reactivate.',
    {
      hint: 'Use the /api/gateway/refresh endpoint to get a new token, or reactivate the gateway if refresh fails'
    }
  );
}

export function tokenInvalidError() {
  return createGatewayError(
    GatewayErrorCode.TOKEN_INVALID,
    'The provided token is invalid or corrupted.',
    {
      hint: 'Ensure you are using the correct token. If the problem persists, reactivate the gateway.'
    }
  );
}

export function configNotFoundError(gatewayId: string) {
  return createGatewayError(
    GatewayErrorCode.CONFIG_NOT_FOUND,
    'No configuration found for this gateway.',
    {
      field: 'gatewayId',
      received: gatewayId,
      hint: 'Ensure PLC devices and tags are configured in the portal before requesting configuration.',
      configuredPLCs: 0,
      configuredTags: 0
    }
  );
}

export function gatewayNotFoundError(gatewayId: string) {
  return createGatewayError(
    GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND,
    `Gateway ${gatewayId} not found`,
    {
      gatewayId,
      details: `No activation code found for gateway ID ${gatewayId}`,
      hint: 'Ensure the gateway has been activated properly.'
    }
  );
}

export function plcConfigEmptyError() {
  return createGatewayError(
    GatewayErrorCode.PLC_CONFIG_EMPTY,
    'No PLC devices are configured for this gateway.',
    {
      hint: 'Configure at least one PLC device with tags in the portal before the gateway can start collecting data.',
      configuredPLCs: 0,
      configuredTags: 0
    }
  );
}

export function batchIdMissingError() {
  return createGatewayError(
    GatewayErrorCode.BATCH_ID_MISSING,
    'Batch ID is required for data synchronization.',
    {
      field: 'batch_id',
      hint: 'Include a unique batch_id in the request body to track this data batch',
      requiredFields: ['batch_id', 'timestamp', 'data']
    }
  );
}

export function batchSizeExceededError(maxSize: number, currentSize: number) {
  return createGatewayError(
    GatewayErrorCode.BATCH_SIZE_EXCEEDED,
    `Data batch exceeds the maximum allowed size of ${maxSize} items.`,
    {
      field: 'data',
      expected: `Array with <= ${maxSize} items`,
      received: `Array with ${currentSize} items`,
      maxSize,
      currentSize,
      hint: `Split your data into smaller batches of ${maxSize} items or less`
    }
  );
}

export function dataFormatInvalidError(field: string, issue: string) {
  return createGatewayError(
    GatewayErrorCode.DATA_FORMAT_INVALID,
    `Invalid data format: ${issue}`,
    {
      field,
      hint: 'Ensure all data points have tag_id, value, and timestamp fields with correct types',
      requiredFields: ['tag_id', 'value', 'timestamp']
    }
  );
}

export function metricsFormatInvalidError(issue: string) {
  return createGatewayError(
    GatewayErrorCode.METRICS_FORMAT_INVALID,
    `Invalid metrics format: ${issue}`,
    {
      field: 'metrics',
      expected: '{ cpu: number, memory: number, uptime: number, ... }',
      hint: 'Provide metrics as an object with numeric values for cpu, memory, uptime, etc.'
    }
  );
}

export function commandTypeInvalidError(providedType: string, validTypes: string[]) {
  return createGatewayError(
    GatewayErrorCode.COMMAND_TYPE_INVALID,
    `Invalid command type "${providedType}".`,
    {
      field: 'command_type',
      expected: validTypes.join(', '),
      received: providedType,
      supportedTypes: validTypes,
      hint: `Use one of the supported command types: ${validTypes.join(', ')}`
    }
  );
}

export function commandParametersMissingError(commandType: string, requiredParams: string[]) {
  return createGatewayError(
    GatewayErrorCode.COMMAND_PARAMETERS_MISSING,
    `Command "${commandType}" requires additional parameters.`,
    {
      field: 'parameters',
      requiredFields: requiredParams,
      hint: `Include the required parameters: ${requiredParams.join(', ')}`
    }
  );
}

export function databaseConnectionError(details?: string) {
  return createGatewayError(
    GatewayErrorCode.DATABASE_CONNECTION_FAILED,
    'Unable to connect to the database. Our team has been notified.',
    {
      hint: 'This is a temporary issue. Please try again in a few moments.',
      ...(details && process.env.NODE_ENV !== 'production' ? { received: details } : {})
    }
  );
}

export function internalServerError(errorId?: string) {
  return createGatewayError(
    GatewayErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred while processing your request.',
    {
      hint: 'This error has been logged. If the problem persists, contact support with error ID: ' + (errorId || 'unknown'),
      ...(errorId ? { field: 'errorId', received: errorId } : {})
    }
  );
}

/**
 * Helper to validate activation code format
 */
export function isValidActivationCodeFormat(code: string): boolean {
  // Expected format: HERC-XXXX-XXXX-XXXX-XXXX or DEMO-XXX-XXX-XXXX
  const hercPattern = /^HERC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  const demoPattern = /^DEMO-[A-Z0-9]{3,4}-[A-Z0-9]{3,4}-[A-Z0-9]{4,6}$/i;
  return hercPattern.test(code) || demoPattern.test(code);
}

/**
 * Helper to validate machine ID format
 */
export function isValidMachineIdFormat(machineId: string): boolean {
  // Machine ID should be at least 8 characters, alphanumeric with possible hyphens
  return /^[A-Z0-9\-]{8,}$/i.test(machineId);
}

/**
 * Helper to extract meaningful error info from database errors
 */
export function extractDatabaseErrorInfo(error: any): string {
  if (error?.code === 'ECONNREFUSED') {
    return 'Database connection refused';
  }
  if (error?.code === 'ETIMEDOUT') {
    return 'Database connection timeout';
  }
  if (error?.message?.includes('does not exist')) {
    return 'Database table or column missing';
  }
  if (error?.message?.includes('permission denied')) {
    return 'Database permission denied';
  }
  return 'Database operation failed';
}

/**
 * Enhanced error response with troubleshooting
 */
export interface EnhancedGatewayErrorResponse extends GatewayErrorResponse {
  supportId: string;
  documentation?: string;
  troubleshooting?: TroubleshootingInfo;
}

export interface TroubleshootingInfo {
  steps: string[];
  commonCauses: string[];
  solutions: string[];
  relatedErrors?: string[];
  estimatedResolutionTime?: string;
}

/**
 * Generate support ID for error tracking
 */
export function generateSupportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SUP-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get documentation URL for error code
 */
export function getErrorDocumentationUrl(code: GatewayErrorCode | string): string {
  const baseUrl = process.env.DOCS_BASE_URL || 'https://docs.herculesv2.com/gateway/errors';
  return `${baseUrl}/${code.toLowerCase()}`;
}

/**
 * Get troubleshooting info for error code
 */
export function getTroubleshootingInfo(code: GatewayErrorCode | string): TroubleshootingInfo | undefined {
  const troubleshooting: Record<string, TroubleshootingInfo> = {
    [GatewayErrorCode.ACTIVATION_CODE_FORMAT_INVALID]: {
      steps: [
        'Verify the activation code format matches: HERC-XXXX-XXXX-XXXX-XXXX',
        'Check for typos or missing characters',
        'Ensure no extra spaces at the beginning or end',
        'Try copying the code again from the portal'
      ],
      commonCauses: [
        'Incomplete code copied from portal',
        'Manual typing errors',
        'Extra whitespace characters',
        'Wrong code format (using old format)'
      ],
      solutions: [
        'Copy the entire code using the copy button in the portal',
        'Paste directly without manual editing',
        'Request a new activation code if the current one seems corrupted'
      ],
      estimatedResolutionTime: '2-5 minutes'
    },
    [GatewayErrorCode.ACTIVATION_CODE_NOT_FOUND]: {
      steps: [
        'Double-check the activation code for typos',
        'Verify the code was generated in the portal',
        'Check if the code might have been deleted',
        'Contact your administrator for a new code'
      ],
      commonCauses: [
        'Code was never generated',
        'Code was deleted from the system',
        'Typing error in the activation code',
        'Using a code from a different environment'
      ],
      solutions: [
        'Generate a new activation code from the portal',
        'Verify you are connecting to the correct server',
        'Ask your administrator to check the code status'
      ],
      relatedErrors: ['ACTIVATION_CODE_FORMAT_INVALID'],
      estimatedResolutionTime: '5-10 minutes'
    },
    [GatewayErrorCode.ACTIVATION_CODE_EXPIRED]: {
      steps: [
        'Check the expiration date of your code',
        'Request a new activation code from the portal',
        'Contact administrator if you cannot generate codes'
      ],
      commonCauses: [
        'Code validity period has passed',
        'Code was generated too long ago',
        'System time mismatch'
      ],
      solutions: [
        'Generate a fresh activation code',
        'Use the code immediately after generation',
        'Set a longer validity period when generating codes'
      ],
      estimatedResolutionTime: '5 minutes'
    },
    [GatewayErrorCode.ACTIVATION_CODE_ALREADY_USED]: {
      steps: [
        'Check if this gateway was already activated',
        'Verify the correct machine ID is being used',
        'Request a new activation code for this gateway'
      ],
      commonCauses: [
        'Code was already used for another gateway',
        'Gateway was previously activated',
        'Multiple activation attempts with same code'
      ],
      solutions: [
        'Generate a new unique code for each gateway',
        'Use the refresh token endpoint if gateway was previously activated',
        'Check gateway database for existing registration'
      ],
      relatedErrors: ['MACHINE_ID_MISMATCH'],
      estimatedResolutionTime: '5-10 minutes'
    },
    [GatewayErrorCode.RATE_LIMIT_EXCEEDED]: {
      steps: [
        'Wait for the specified time before retrying',
        'Check the retry-after header for exact wait time',
        'Reduce request frequency'
      ],
      commonCauses: [
        'Too many requests in a short time',
        'Automated retry loops',
        'Multiple gateways from same IP'
      ],
      solutions: [
        'Implement exponential backoff in retry logic',
        'Wait for the rate limit window to reset',
        'Contact support if legitimate usage is being blocked'
      ],
      estimatedResolutionTime: '5-15 minutes'
    },
    [GatewayErrorCode.TOKEN_EXPIRED]: {
      steps: [
        'Use the /api/gateway/refresh endpoint to get a new token',
        'If refresh fails, reactivate the gateway',
        'Check token expiration time in your logs'
      ],
      commonCauses: [
        'Token lifetime exceeded',
        'Gateway was offline for extended period',
        'Clock synchronization issues'
      ],
      solutions: [
        'Implement automatic token refresh before expiration',
        'Reactivate the gateway with a valid activation code',
        'Ensure system clock is synchronized'
      ],
      relatedErrors: ['TOKEN_INVALID', 'TOKEN_VERIFICATION_FAILED'],
      estimatedResolutionTime: '2-5 minutes'
    },
    [GatewayErrorCode.CONFIG_NOT_FOUND]: {
      steps: [
        'Configure PLC devices in the portal',
        'Add tags to the configured PLC devices',
        'Wait for configuration to propagate (usually instant)',
        'Retry the configuration request'
      ],
      commonCauses: [
        'No PLC devices configured',
        'No tags configured for PLC devices',
        'Gateway not properly linked to facility',
        'Configuration not yet synchronized'
      ],
      solutions: [
        'Access the portal PLC configuration page',
        'Add at least one PLC device with tags',
        'Verify gateway is assigned to correct facility',
        'Check gateway-facility mapping in the database'
      ],
      relatedErrors: ['PLC_CONFIG_EMPTY'],
      estimatedResolutionTime: '10-20 minutes'
    },
    [GatewayErrorCode.MACHINE_ID_MISMATCH]: {
      steps: [
        'Verify the machine ID of the current system',
        'Check if code is bound to a different machine',
        'Request a new code for this specific machine'
      ],
      commonCauses: [
        'Code was activated on a different machine',
        'Machine hardware changed',
        'Running on a different computer',
        'Virtualization causing ID changes'
      ],
      solutions: [
        'Use the original machine where code was first used',
        'Generate a new activation code for this machine',
        'Contact support if hardware was replaced'
      ],
      relatedErrors: ['ACTIVATION_CODE_ALREADY_USED'],
      estimatedResolutionTime: '5-15 minutes'
    },
    [GatewayErrorCode.DATABASE_CONNECTION_FAILED]: {
      steps: [
        'Wait a moment and retry the request',
        'Check system status page for outages',
        'Contact support if issue persists'
      ],
      commonCauses: [
        'Temporary database outage',
        'Network connectivity issues',
        'Database maintenance in progress',
        'Connection pool exhausted'
      ],
      solutions: [
        'Retry with exponential backoff',
        'Check network connectivity',
        'Wait for maintenance window to complete'
      ],
      estimatedResolutionTime: '5-30 minutes'
    }
  };

  return troubleshooting[code];
}

/**
 * Create enhanced error response with troubleshooting
 */
export function createEnhancedGatewayError(
  code: GatewayErrorCode | string,
  message: string,
  details?: ErrorDetails,
  statusCode?: number
): { 
  statusCode: number; 
  response: EnhancedGatewayErrorResponse;
  headers: Record<string, string>;
} {
  const baseError = createGatewayError(code, message, details, statusCode);
  const supportId = generateSupportId();
  const documentation = getErrorDocumentationUrl(code);
  const troubleshooting = getTroubleshootingInfo(code);

  const enhancedResponse: EnhancedGatewayErrorResponse = {
    ...baseError.response,
    supportId,
    documentation,
    ...(troubleshooting && { troubleshooting })
  };

  const headers: Record<string, string> = {
    'X-Error-Code': code,
    'X-Support-ID': supportId,
    'X-Error-Documentation': documentation,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  };

  // Add retry-after header for rate limit errors
  if (code === GatewayErrorCode.RATE_LIMIT_EXCEEDED && details?.retryAfterMs) {
    headers['Retry-After'] = Math.ceil(details.retryAfterMs / 1000).toString();
  }

  return {
    statusCode: baseError.statusCode,
    response: enhancedResponse,
    headers
  };
}