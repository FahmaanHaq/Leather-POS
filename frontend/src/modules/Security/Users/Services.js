import { CommonGet, CommonPost } from '../../../common/HttpHelper';

const BASE = 'Users';

export const getAllUsers = (groupId) => CommonGet(`${BASE}/GetAll/${groupId}`);
export const getUserByID = (userId) => CommonGet(`${BASE}/GetByID/${userId}`);
export const saveUser = (payload) => CommonPost(`${BASE}/Save`, payload);
export const updateUser = (payload) => CommonPost(`${BASE}/Update`, payload);
