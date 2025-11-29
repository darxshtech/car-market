/**
 * Format price in Indian Rupee format with proper comma placement
 * Example: 500000 -> ₹5,00,000
 */
export function formatINR(amount: number): string {
  // Convert to string and split into integer and decimal parts
  const parts = amount.toFixed(0).split('.');
  const integerPart = parts[0];
  
  // Indian numbering system: last 3 digits, then groups of 2
  let formatted = '';
  const length = integerPart.length;
  
  if (length <= 3) {
    formatted = integerPart;
  } else {
    // Last 3 digits
    formatted = integerPart.slice(-3);
    let remaining = integerPart.slice(0, -3);
    
    // Add groups of 2 from right to left
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        formatted = remaining + ',' + formatted;
        remaining = '';
      } else {
        formatted = remaining.slice(-2) + ',' + formatted;
        remaining = remaining.slice(0, -2);
      }
    }
  }
  
  return '₹' + formatted;
}

/**
 * Mask owner name to show only first name and last name initial
 * Example: "John Doe" -> "John D."
 */
export function maskOwnerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return '';
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1][0];
  
  return `${firstName} ${lastNameInitial}.`;
}
