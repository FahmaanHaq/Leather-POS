import { CommonGet, CommonPost } from '../../common/HttpHelper';

const BASE = 'Payments';

export const getChequeRegister = (groupId, status) =>
    CommonGet(`${BASE}/ChequeRegister/${groupId}${status ? `?status=${status}` : ''}`);

export const updateChequeStatus = (payload) => CommonPost(`${BASE}/ChequeStatus`, payload);

export const getCashRegisterReport = (groupId, date) =>
    CommonGet(`${BASE}/CashRegister/${groupId}?date=${date}`);

export const getCardSettlementReport = (groupId, date) =>
    CommonGet(`${BASE}/CardSettlement/${groupId}?date=${date}`);
