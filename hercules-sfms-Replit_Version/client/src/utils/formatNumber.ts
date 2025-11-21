/**
 * Comprehensive number formatting utility for consistent display across the application
 */

export type FormatType = 'decimal' | 'percentage' | 'currency' | 'integer' | 'auto';

export interface FormatOptions {
  type?: FormatType;
  maxDecimals?: number;
  removeTrailingZeros?: boolean;
  thousandsSeparator?: boolean;
  currencySymbol?: string;
  unit?: string;
  fallback?: string;
  scientificThreshold?: number;
}

/**
 * Format a number according to specified rules
 * @param value - The number to format (can be string, number, null, or undefined)
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  // Handle null/undefined/NaN cases
  if (value === null || value === undefined) {
    return options.fallback ?? '—';
  }

  // Convert to number if string
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(num)) {
    return options.fallback ?? '—';
  }

  // Handle Infinity
  if (!isFinite(num)) {
    return num > 0 ? '∞' : '-∞';
  }

  // Default options
  const {
    type = 'auto',
    maxDecimals = 3,
    removeTrailingZeros = true,
    thousandsSeparator = true,
    currencySymbol = '$',
    unit = '',
    fallback = '—',
    scientificThreshold = 0.001
  } = options;

  let formatted: string;
  let decimals = maxDecimals;

  // Determine format type
  switch (type) {
    case 'percentage':
      decimals = Math.min(maxDecimals, 1); // Max 1 decimal for percentages
      formatted = formatWithDecimals(num, decimals, removeTrailingZeros);
      return `${formatted}%`;

    case 'currency':
      decimals = Math.min(maxDecimals, 2); // Max 2 decimals for currency
      formatted = formatWithDecimals(Math.abs(num), decimals, false); // Keep zeros for currency
      if (thousandsSeparator && Math.abs(num) >= 1000) {
        formatted = addThousandsSeparator(formatted);
      }
      return num < 0 ? `-${currencySymbol}${formatted}` : `${currencySymbol}${formatted}`;

    case 'integer':
      formatted = Math.round(num).toString();
      if (thousandsSeparator && Math.abs(num) >= 1000) {
        formatted = addThousandsSeparator(formatted);
      }
      return formatted + (unit ? ` ${unit}` : '');

    case 'decimal':
      formatted = formatDecimalInternal(num, decimals, removeTrailingZeros, thousandsSeparator, scientificThreshold);
      return formatted + (unit ? ` ${unit}` : '');

    case 'auto':
    default:
      // Auto-detect best format
      
      // For very small numbers, use scientific notation or < threshold
      if (Math.abs(num) > 0 && Math.abs(num) < scientificThreshold) {
        return `< ${scientificThreshold}` + (unit ? ` ${unit}` : '');
      }

      // For whole numbers or very close to whole numbers
      if (Math.abs(num - Math.round(num)) < 0.0001) {
        formatted = Math.round(num).toString();
        if (thousandsSeparator && Math.abs(num) >= 1000) {
          formatted = addThousandsSeparator(formatted);
        }
        return formatted + (unit ? ` ${unit}` : '');
      }

      // For decimals
      formatted = formatDecimalInternal(num, decimals, removeTrailingZeros, thousandsSeparator, scientificThreshold);
      return formatted + (unit ? ` ${unit}` : '');
  }
}

/**
 * Format a decimal number with specified precision
 */
function formatDecimalInternal(
  num: number,
  maxDecimals: number,
  removeTrailingZeros: boolean,
  thousandsSeparator: boolean,
  scientificThreshold: number
): string {
  // Check if we should use scientific notation
  if (Math.abs(num) > 0 && Math.abs(num) < scientificThreshold) {
    return num.toExponential(2);
  }

  let formatted = formatWithDecimals(num, maxDecimals, removeTrailingZeros);
  
  if (thousandsSeparator && Math.abs(num) >= 1000) {
    formatted = addThousandsSeparator(formatted);
  }
  
  return formatted;
}

/**
 * Format with specific decimal places
 */
function formatWithDecimals(
  num: number,
  decimals: number,
  removeTrailingZeros: boolean
): string {
  let formatted = num.toFixed(decimals);
  
  if (removeTrailingZeros) {
    // Remove trailing zeros after decimal point
    formatted = formatted.replace(/\.?0+$/, '');
    
    // If we removed all decimals and the decimal point, that's fine
    // But if we have something like "1." we should remove the decimal point
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
  }
  
  return formatted;
}

/**
 * Add thousands separator to a number string
 */
function addThousandsSeparator(str: string): string {
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Convenience functions for common formats
 */
export const formatPercentage = (value: number | string | null | undefined): string => {
  return formatNumber(value, { type: 'percentage', maxDecimals: 1 });
};

export const formatCurrency = (value: number | string | null | undefined, symbol = '$'): string => {
  return formatNumber(value, { type: 'currency', currencySymbol: symbol });
};

export const formatInteger = (value: number | string | null | undefined): string => {
  return formatNumber(value, { type: 'integer' });
};

export const formatDecimal = (value: number | string | null | undefined, decimals = 3): string => {
  return formatNumber(value, { type: 'decimal', maxDecimals: decimals });
};

/**
 * Format with specific unit
 */
export const formatWithUnit = (
  value: number | string | null | undefined,
  unit: string,
  decimals = 3
): string => {
  return formatNumber(value, { type: 'auto', maxDecimals: decimals, unit });
};

/**
 * Format temperature
 */
export const formatTemperature = (value: number | string | null | undefined, unit = '°C'): string => {
  return formatNumber(value, { type: 'decimal', maxDecimals: 1, unit });
};

/**
 * Format weight/mass
 */
export const formatWeight = (value: number | string | null | undefined, unit = 'kg'): string => {
  return formatNumber(value, { type: 'decimal', maxDecimals: 2, unit });
};

/**
 * Format flow rate
 */
export const formatFlowRate = (value: number | string | null | undefined, unit = 'm³/h'): string => {
  return formatNumber(value, { type: 'decimal', maxDecimals: 2, unit });
};

/**
 * Format pressure
 */
export const formatPressure = (value: number | string | null | undefined, unit = 'bar'): string => {
  return formatNumber(value, { type: 'decimal', maxDecimals: 2, unit });
};

/**
 * Format efficiency/utilization as percentage
 */
export const formatEfficiency = (value: number | string | null | undefined): string => {
  return formatNumber(value, { type: 'percentage', maxDecimals: 1 });
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatCompact = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || isNaN(num)) {
    return '—';
  }

  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return formatNumber(num / 1e9, { maxDecimals: 1 }) + 'B';
  } else if (absNum >= 1e6) {
    return formatNumber(num / 1e6, { maxDecimals: 1 }) + 'M';
  } else if (absNum >= 1e3) {
    return formatNumber(num / 1e3, { maxDecimals: 1 }) + 'K';
  }
  
  return formatNumber(num, { maxDecimals: 1 });
};