import { CommonGet, CommonPost } from '../../../common/HttpHelper';

export const getAllScreens = () => CommonGet('Permissions/Screens');
export const getRolePermissions = (roleId) => CommonGet(`Permissions/RolePermissions/${roleId}`);
export const saveRolePermission = (payload) => CommonPost('Permissions/SaveRolePermission', payload);
export const getEffectivePermissions = (userId) => CommonGet(`Permissions/Effective/${userId}`);
