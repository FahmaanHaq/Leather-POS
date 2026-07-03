import { CommonGet, CommonPost } from '../../common/HttpHelper';

const BASE = 'Invoices';

export const searchItemsForBilling = (groupId, term) =>
    CommonGet(`${BASE}/SearchItems/${groupId}?term=${encodeURIComponent(term)}`);

export const saveInvoice = (payload) => CommonPost(`${BASE}/Save`, payload);
export const returnInvoice = (payload) => CommonPost(`${BASE}/Return`, payload);
export const getAllInvoices = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);
export const getHeldInvoices = (groupId) => CommonGet(`${BASE}/Held/${groupId}`);
export const getInvoiceById = (invoiceId) => CommonGet(`${BASE}/GetByID/${invoiceId}`);

export const saveDebtSettlement = (payload) => CommonPost('Payments/DebtSettlement', payload);

// Not in the original SRS: looks up what this customer last paid for this
// item, so the Billing screen can default to that price instead of the
// catalogue SellingPrice for returning customers.
export const getCustomerItemLastPrice = (customerId, itemId) =>
    CommonGet(`${BASE}/CustomerItemPrice/${customerId}/${itemId}`);
