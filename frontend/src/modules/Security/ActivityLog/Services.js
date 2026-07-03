import { CommonGet } from '../../../common/HttpHelper';

export const getActivityLog = (groupId) => CommonGet(`ActivityLog/GetAll/${groupId}`);
