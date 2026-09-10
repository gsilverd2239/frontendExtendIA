// Formatting utilities adapted for Paraguay (es-PY locale)
// Thousands separator: '.' (dot)
// Decimal separator: ',' (comma)
// Currency format: Guaraníes (Gs. - integer cost without decimals)

/**
 * Formats a monetary amount into Paraguay Guaraníes (Gs.) without decimals.
 * Example: 1500000 -> "Gs. 1.500.000"
 */
export const formatCurrencyGs = (amount: number | string | null | undefined): string => {
  if (amount == null) return 'Gs. 0';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return 'Gs. 0';
  const rounded = Math.round(num);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Gs. ${formatted}`;
};

/**
 * Formats quantities with '.' as thousands separator and ',' as decimal separator.
 * Example: 1250.5 -> "1.250,5" or 1000 -> "1.000"
 */
export const formatQuantityPy = (value: number | string | null | undefined, maxDecimals: number = 2): string => {
  if (value == null) return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '0';

  const numStr = num.toString();
  const [intStr, decStr] = numStr.split('.');

  const formattedInt = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decStr && maxDecimals > 0) {
    const trimmedDec = decStr.slice(0, maxDecimals);
    if (trimmedDec.length > 0) {
      return `${formattedInt},${trimmedDec}`;
    }
  }
  return formattedInt;
};
