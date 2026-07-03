import { CommonGet, CommonPost } from '../../../common/HttpHelper';

const BASE = 'Groups';

export const getAllGroups = () => CommonGet(`${BASE}/GetAll`);
export const saveGroup = (payload) => CommonPost(`${BASE}/Save`, payload);
export const updateGroup = (payload) => CommonPost(`${BASE}/Update`, payload);
