/**
 * Parses an Indian-format currency string into a number.
 * "₹66,006.14" -> 66006.14
 * Also handles US format used by Order Entry, e.g. "$508.33".
 * @param {string|number} raw
 * @returns {number}
 */
function parseCurrency(raw) {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[₹$,\s]/g, '').trim();
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Could not parse a number from: "${raw}"`);
  }
  return value;
}

module.exports = { parseCurrency };
