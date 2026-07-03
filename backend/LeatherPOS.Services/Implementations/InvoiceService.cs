using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class InvoiceService : IInvoiceService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public InvoiceService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> SaveInvoiceAsync(SaveInvoiceModel model)
        {
            var linesTable = BuildLinesTable(model.Lines);
            var paymentsTable = BuildPaymentsTable(model.Payments);

            var scalarParameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@InvoiceID", new Tuple<string, DbType, ParameterDirection>(model.InvoiceID?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(model.CustomerID?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@InvoiceDate", new Tuple<string, DbType, ParameterDirection>(model.InvoiceDate.ToString("yyyy-MM-dd HH:mm:ss"), DbType.DateTime, ParameterDirection.Input) },
                { "@IsHeld", new Tuple<string, DbType, ParameterDirection>(model.IsHeld.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@PassToAccounting", new Tuple<string, DbType, ParameterDirection>(model.PassToAccounting.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var tvpParameters = new Dictionary<string, (string TypeName, DataTable Data)>
            {
                { "@Lines", ("Sales.InvoiceLineType", linesTable) },
                { "@Payments", ("Sales.PaymentType", paymentsTable) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithMultipleTableValuedParametersAsync(
                "Sales.SaveInvoice", tvpParameters, scalarParameters);
            var resultCode = Convert.ToInt32(output["@Result"]);

            return resultCode switch
            {
                > 0 when model.IsHeld => LeatherPOSResponse.Success(resultCode, "Bill held successfully"),
                > 0 => LeatherPOSResponse.Success(resultCode, "Sale completed successfully"),
                -1 => LeatherPOSResponse.Fail("Payment total does not match the invoice total"),
                -2 => LeatherPOSResponse.Fail("Insufficient stock for one or more items"),
                -3 => LeatherPOSResponse.Fail("This would exceed the customer's credit limit"),
                -4 => LeatherPOSResponse.Fail("Credit/debt payment requires a Regular customer to be selected"),
                -5 => LeatherPOSResponse.Fail("A bill must have at least one line"),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while saving the invoice")
            };
        }

        public async Task<LeatherPOSResponse> ReturnInvoiceAsync(ReturnInvoiceModel model)
        {
            var table = new DataTable();
            table.Columns.Add("InvoiceLineID", typeof(int));
            table.Columns.Add("QuantityToReturn", typeof(decimal));
            foreach (var line in model.ReturnLines)
                table.Rows.Add(line.InvoiceLineID, line.QuantityToReturn);

            var scalarParameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@InvoiceID", new Tuple<string, DbType, ParameterDirection>(model.InvoiceID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithTableValuedParameterAsync(
                "Sales.ReturnInvoice", "@ReturnLines", "Sales.ReturnLineType", table, scalarParameters);
            var resultCode = Convert.ToInt32(output["@Result"]);

            return resultCode switch
            {
                > 0 => LeatherPOSResponse.Success(resultCode, "Return processed successfully"),
                -1 => LeatherPOSResponse.Fail("Specify at least one line to return"),
                -2 => LeatherPOSResponse.Fail("Invoice not found or not in a returnable state"),
                -3 => LeatherPOSResponse.Fail("Cannot return more than the remaining quantity on a line"),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while processing the return")
            };
        }

        public async Task<LeatherPOSResponse> GetAllInvoicesAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Invoice>("Sales.GetAllInvoices", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetHeldInvoicesAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<HeldInvoice>("Sales.GetHeldInvoices", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetInvoiceByIdAsync(int invoiceId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@InvoiceID", new Tuple<string, DbType, ParameterDirection>(invoiceId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };

            var (headers, lines, payments) = await _unitOfWork.Repository()
                .GetThreeResultSetsBySPAsync<Invoice, InvoiceLineDetail, PaymentDetail>("Sales.GetInvoiceByID", parameters);

            var header = headers.FirstOrDefault();
            if (header is null)
                return LeatherPOSResponse.Fail("Invoice not found");

            return LeatherPOSResponse.Success(new InvoiceDetail { Header = header, Lines = lines, Payments = payments });
        }

        public async Task<LeatherPOSResponse> SearchItemsForBillingAsync(int groupId, string searchTerm)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@SearchTerm", new Tuple<string, DbType, ParameterDirection>(searchTerm, DbType.String, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<BillingItemSearchResult>("Sales.SearchItemsForBilling", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetCustomerItemLastPriceAsync(int customerId, int itemId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(customerId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ItemID", new Tuple<string, DbType, ParameterDirection>(itemId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            // Returns null (no rows) when this customer has never bought this item before - that's a normal, expected outcome, not an error.
            var result = await _unitOfWork.Repository().GetEntityBySPAsync<CustomerItemPriceHistory>("Sales.GetCustomerItemLastPrice", parameters);
            return LeatherPOSResponse.Success(result);
        }

        private static DataTable BuildLinesTable(List<InvoiceLineInput> lines)
        {
            var table = new DataTable();
            table.Columns.Add("ItemID", typeof(int));
            table.Columns.Add("UOMID", typeof(int));
            table.Columns.Add("Quantity", typeof(decimal));
            table.Columns.Add("UnitPrice", typeof(decimal));
            table.Columns.Add("Discount", typeof(decimal));

            foreach (var line in lines)
                table.Rows.Add(line.ItemID, line.UOMID, line.Quantity, line.UnitPrice, line.Discount);

            return table;
        }

        private static DataTable BuildPaymentsTable(List<PaymentInput> payments)
        {
            var table = new DataTable();
            table.Columns.Add("PaymentMode", typeof(byte));
            table.Columns.Add("Amount", typeof(decimal));

            var tenderedCol = table.Columns.Add("TenderedAmount", typeof(decimal));
            tenderedCol.AllowDBNull = true;
            var changeCol = table.Columns.Add("ChangeGiven", typeof(decimal));
            changeCol.AllowDBNull = true;
            var chequeNoCol = table.Columns.Add("ChequeNo", typeof(string));
            chequeNoCol.AllowDBNull = true;
            var bankCol = table.Columns.Add("Bank", typeof(string));
            bankCol.AllowDBNull = true;
            var branchCol = table.Columns.Add("Branch", typeof(string));
            branchCol.AllowDBNull = true;
            var chequeDateCol = table.Columns.Add("ChequeDate", typeof(DateTime));
            chequeDateCol.AllowDBNull = true;
            var cardTypeCol = table.Columns.Add("CardType", typeof(string));
            cardTypeCol.AllowDBNull = true;
            var last4Col = table.Columns.Add("Last4Digits", typeof(string));
            last4Col.AllowDBNull = true;
            var approvalCol = table.Columns.Add("ApprovalCode", typeof(string));
            approvalCol.AllowDBNull = true;
            var terminalCol = table.Columns.Add("TerminalID", typeof(string));
            terminalCol.AllowDBNull = true;

            foreach (var p in payments)
            {
                var row = table.NewRow();
                row["PaymentMode"] = p.PaymentMode;
                row["Amount"] = p.Amount;
                row["TenderedAmount"] = (object?)p.TenderedAmount ?? DBNull.Value;
                row["ChangeGiven"] = (object?)p.ChangeGiven ?? DBNull.Value;
                row["ChequeNo"] = (object?)p.ChequeNo ?? DBNull.Value;
                row["Bank"] = (object?)p.Bank ?? DBNull.Value;
                row["Branch"] = (object?)p.Branch ?? DBNull.Value;
                row["ChequeDate"] = (object?)p.ChequeDate ?? DBNull.Value;
                row["CardType"] = (object?)p.CardType ?? DBNull.Value;
                row["Last4Digits"] = (object?)p.Last4Digits ?? DBNull.Value;
                row["ApprovalCode"] = (object?)p.ApprovalCode ?? DBNull.Value;
                row["TerminalID"] = (object?)p.TerminalID ?? DBNull.Value;
                table.Rows.Add(row);
            }

            return table;
        }
    }
}
