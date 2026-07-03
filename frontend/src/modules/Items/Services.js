import { CommonGet, CommonPost } from '../../common/HttpHelper';

const BASE = 'Items';

export const getAllItems = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);
export const getItemByID = (itemId) => CommonGet(`${BASE}/GetByID/${itemId}`);
export const saveItem = (payload) => CommonPost(`${BASE}/Save`, payload);
export const updateItem = (payload) => CommonPost(`${BASE}/Update`, payload);
export const getLowStockItems = (groupId) => CommonGet(`${BASE}/LowStock/${groupId}`);

// FR-ITM-02: sends parsed Excel rows for server-side validation before commit
export const validateImportBatch = (groupId, rows) => CommonPost(`${BASE}/ValidateImportBatch/${groupId}`, rows);

export const getAllUOM = () => CommonGet('UOM/GetAll');
