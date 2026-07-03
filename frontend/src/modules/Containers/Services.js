import { CommonGet, CommonPost } from '../../common/HttpHelper';

const BASE = 'Containers';

export const getAllContainers = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);
export const getContainerByID = (containerId) => CommonGet(`${BASE}/GetByID/${containerId}`);
export const saveContainer = (payload) => CommonPost(`${BASE}/Save`, payload);
export const getSuppliers = (groupId) => CommonGet(`${BASE}/Suppliers/${groupId}`);
