import { CommonGet, CommonPost } from '../../../common/HttpHelper';

const BASE = 'Roles';

export const getAllRoles = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);
export const getRoleByID = (roleId) => CommonGet(`${BASE}/GetByID/${roleId}`);
export const saveRole = (payload) => CommonPost(`${BASE}/Save`, payload);
export const updateRole = (payload) => CommonPost(`${BASE}/Update`, payload);
