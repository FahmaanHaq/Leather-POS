import { CommonGet, CommonPost } from '../../common/HttpHelper';

const BASE = 'Customers';

export const getAllCustomers = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);

export const getCustomerByID = (customerId) => CommonGet(`${BASE}/GetByID/${customerId}`);

export const saveCustomer = (payload) => CommonPost(`${BASE}/Save`, payload);

export const updateCustomer = (payload) => CommonPost(`${BASE}/Update`, payload);

export const getCustomerStatement = (customerId, fromDate, toDate) =>
    CommonGet(`${BASE}/Statement/${customerId}?fromDate=${fromDate}&toDate=${toDate}`);

export const getReceivablesAgeing = (groupId) => CommonGet(`${BASE}/ReceivablesAgeing/${groupId}`);

// FR-CUS-03: used inline on the future Billing screen to surface outstanding debt
// as soon as a customer is picked.
export const getCustomerBalanceSummary = (customerId) => CommonGet(`${BASE}/BalanceSummary/${customerId}`);
