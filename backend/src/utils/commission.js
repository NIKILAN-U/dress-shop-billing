/**
 * Shop commission policy, in one place.
 *
 * 'Percentage' — commissionValue percent of the line total.
 * 'Fixed'      — commissionValue rupees for every ₹1000 of line total
 *                (the default shop rule is ₹3 per ₹1000).
 *
 * saleController computes this at sale time and stores the result on the line
 * item; the staff reports re-derive it only for legacy rows saved before the
 * policy existed. Both paths must agree, so they share this module.
 */
export const DEFAULT_COMMISSION_TYPE = 'Fixed';
export const DEFAULT_COMMISSION_VALUE = 3;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Resolve the commission type/value for a line, preferring an explicit value on
 * the line, then the product default, then the shop default. An explicit 0 is
 * honoured so a line can legitimately carry no commission.
 */
export const resolveCommissionTerms = (line = {}, product = {}) => {
  const type =
    line.commissionType || product.commissionType || DEFAULT_COMMISSION_TYPE;

  const value = [line.commissionValue, product.commissionValue].find(
    (v) => v !== undefined && v !== null
  );

  return {
    commissionType: type,
    commissionValue: value !== undefined ? value : DEFAULT_COMMISSION_VALUE
  };
};

/** Commission earned on a line total, given already-resolved terms. */
export const calculateCommission = (totalAmount, { commissionType, commissionValue }) => {
  const amount = Number(totalAmount) || 0;
  const value = Number(commissionValue) || 0;

  if (value <= 0) return 0;

  if (commissionType === 'Percentage') {
    return round2((amount * value) / 100);
  }

  return round2((amount / 1000) * value);
};

/**
 * Commission for a line already stored on a Sale. Rows written before the
 * policy existed carry no amount, so it is re-derived from the line's own
 * terms. The summary and the itemised ledger must both go through here or
 * their totals will not reconcile.
 */
export const commissionForStoredItem = (item = {}) => {
  const terms = resolveCommissionTerms(item);
  const stored = item.commissionAmount;
  const isLegacyRow =
    stored === undefined ||
    stored === null ||
    (stored === 0 && (Number(item.totalAmount) || 0) > 0);

  return {
    ...terms,
    commissionAmount: isLegacyRow
      ? calculateCommission(item.totalAmount, terms)
      : stored
  };
};
