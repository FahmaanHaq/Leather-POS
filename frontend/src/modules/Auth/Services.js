import { CommonGet, CommonPost } from '../../common/HttpHelper';

export const login = (payload) => CommonPost('Auth/Login', payload);
export const bootstrap = (payload) => CommonPost('Auth/Bootstrap', payload);
export const checkSetupRequired = () => CommonGet('Auth/SetupRequired');
