using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class PaymentService : IPaymentService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public PaymentService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> SaveDebtSettlementAsync(DebtSettlementModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(model.CustomerID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@PaymentMode", new Tuple<string, DbType, ParameterDirection>(model.PaymentMode.ToString(), DbType.Byte, ParameterDirection.Input) },
                { "@Amount", new Tuple<string, DbType, ParameterDirection>(model.Amount.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@TenderedAmount", new Tuple<string, DbType, ParameterDirection>(model.TenderedAmount?.ToString() ?? string.Empty, DbType.Decimal, ParameterDirection.Input) },
                { "@ChangeGiven", new Tuple<string, DbType, ParameterDirection>(model.ChangeGiven?.ToString() ?? string.Empty, DbType.Decimal, ParameterDirection.Input) },
                { "@ChequeNo", new Tuple<string, DbType, ParameterDirection>(model.ChequeNo ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Bank", new Tuple<string, DbType, ParameterDirection>(model.Bank ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Branch", new Tuple<string, DbType, ParameterDirection>(model.Branch ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@ChequeDate", new Tuple<string, DbType, ParameterDirection>(model.ChequeDate?.ToString("yyyy-MM-dd") ?? string.Empty, DbType.Date, ParameterDirection.Input) },
                { "@CardType", new Tuple<string, DbType, ParameterDirection>(model.CardType ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Last4Digits", new Tuple<string, DbType, ParameterDirection>(model.Last4Digits ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@ApprovalCode", new Tuple<string, DbType, ParameterDirection>(model.ApprovalCode ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@TerminalID", new Tuple<string, DbType, ParameterDirection>(model.TerminalID ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Sales.SaveDebtSettlement", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);

            return resultCode switch
            {
                > 0 => LeatherPOSResponse.Success(resultCode, "Debt settlement recorded successfully"),
                -1 => LeatherPOSResponse.Fail("Settlement amount must be positive"),
                -2 => LeatherPOSResponse.Fail("Credit cannot be used to pay off existing debt"),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while recording the settlement")
            };
        }

        public async Task<LeatherPOSResponse> GetChequeRegisterAsync(int groupId, byte? statusFilter)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@StatusFilter", new Tuple<string, DbType, ParameterDirection>(statusFilter?.ToString() ?? string.Empty, DbType.Byte, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<ChequeRegisterEntry>("Sales.GetChequeRegister", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> UpdateChequeStatusAsync(ChequeStatusUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@ChequeDetailID", new Tuple<string, DbType, ParameterDirection>(model.ChequeDetailID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@NewStatus", new Tuple<string, DbType, ParameterDirection>(model.NewStatus.ToString(), DbType.Byte, ParameterDirection.Input) },
                { "@ChangedBy", new Tuple<string, DbType, ParameterDirection>(model.ChangedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Sales.UpdateChequeStatus", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);

            return resultCode switch
            {
                1 => LeatherPOSResponse.Success(resultCode, "Cheque status updated successfully"),
                -1 => LeatherPOSResponse.Fail("Cheque not found"),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while updating the cheque status")
            };
        }

        public async Task<LeatherPOSResponse> GetCashRegisterReportAsync(int groupId, DateTime reportDate)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ReportDate", new Tuple<string, DbType, ParameterDirection>(reportDate.ToString("yyyy-MM-dd"), DbType.Date, ParameterDirection.Input) }
            };

            var (summaries, transactions, _) = await _unitOfWork.Repository()
                .GetThreeResultSetsBySPAsync<CashRegisterSummary, CashRegisterTransaction, EmptyResultSet>("Sales.GetCashRegisterReport", parameters);

            return LeatherPOSResponse.Success(new CashRegisterReport
            {
                Summary = summaries.FirstOrDefault() ?? new CashRegisterSummary(),
                Transactions = transactions
            });
        }

        public async Task<LeatherPOSResponse> GetCardSettlementReportAsync(int groupId, DateTime reportDate)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ReportDate", new Tuple<string, DbType, ParameterDirection>(reportDate.ToString("yyyy-MM-dd"), DbType.Date, ParameterDirection.Input) }
            };

            var (summaries, transactions, _) = await _unitOfWork.Repository()
                .GetThreeResultSetsBySPAsync<CardSettlementSummary, CardSettlementTransaction, EmptyResultSet>("Sales.GetCardSettlementReport", parameters);

            return LeatherPOSResponse.Success(new CardSettlementReport
            {
                SummaryByCardType = summaries,
                Transactions = transactions
            });
        }
    }
}
