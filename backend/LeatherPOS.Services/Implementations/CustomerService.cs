using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class CustomerService : ICustomerService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;

        public CustomerService(ILeatherPOSUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<LeatherPOSResponse> GetAllCustomersAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };

            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Customer>("Sales.GetAllCustomers", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetCustomerByIdAsync(int customerId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(customerId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };

            var result = await _unitOfWork.Repository().GetEntityBySPAsync<Customer>("Sales.GetCustomerByID", parameters);
            return result is null
                ? LeatherPOSResponse.Fail("Customer not found")
                : LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveCustomerAsync(CustomerSaveModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@CustomerType", new Tuple<string, DbType, ParameterDirection>(model.CustomerType.ToString(), DbType.Byte, ParameterDirection.Input) },
                { "@Name", new Tuple<string, DbType, ParameterDirection>(model.Name, DbType.String, ParameterDirection.Input) },
                { "@Phone", new Tuple<string, DbType, ParameterDirection>(model.Phone ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Address", new Tuple<string, DbType, ParameterDirection>(model.Address ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CreditLimit", new Tuple<string, DbType, ParameterDirection>(model.CreditLimit?.ToString() ?? string.Empty, DbType.Decimal, ParameterDirection.Input) },
                { "@CreditDays", new Tuple<string, DbType, ParameterDirection>(model.CreditDays?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Sales.SaveCustomer", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);
            return GenerateSaveUpdateResponse(resultCode, "Customer", isUpdate: false);
        }

        public async Task<LeatherPOSResponse> UpdateCustomerAsync(CustomerUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(model.CustomerID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Name", new Tuple<string, DbType, ParameterDirection>(model.Name, DbType.String, ParameterDirection.Input) },
                { "@Phone", new Tuple<string, DbType, ParameterDirection>(model.Phone ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Address", new Tuple<string, DbType, ParameterDirection>(model.Address ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CreditLimit", new Tuple<string, DbType, ParameterDirection>(model.CreditLimit?.ToString() ?? string.Empty, DbType.Decimal, ParameterDirection.Input) },
                { "@CreditDays", new Tuple<string, DbType, ParameterDirection>(model.CreditDays?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@IsActive", new Tuple<string, DbType, ParameterDirection>(model.IsActive.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@ModifiedBy", new Tuple<string, DbType, ParameterDirection>(model.ModifiedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Sales.UpdateCustomer", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);
            return GenerateSaveUpdateResponse(resultCode, "Customer", isUpdate: true);
        }

        public async Task<LeatherPOSResponse> GetCustomerStatementAsync(int customerId, DateTime fromDate, DateTime toDate)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@CustomerID", new Tuple<string, DbType, ParameterDirection>(customerId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@FromDate", new Tuple<string, DbType, ParameterDirection>(fromDate.ToString("yyyy-MM-dd"), DbType.DateTime, ParameterDirection.Input) },
                { "@ToDate", new Tuple<string, DbType, ParameterDirection>(toDate.ToString("yyyy-MM-dd"), DbType.DateTime, ParameterDirection.Input) }
            };

            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<CustomerLedgerEntry>("Sales.GetCustomerStatement", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetReceivablesAgeingAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };

            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Customer>("Sales.GetReceivablesAgeing", parameters);
            return LeatherPOSResponse.Success(result);
        }

        /// <summary>
        /// Maps the SP output @Result code to a status/message, mirroring
        /// GenerateResponseMessage in the reference MasterGroupService.
        /// </summary>
        private static LeatherPOSResponse GenerateSaveUpdateResponse(int resultCode, string entityName, bool isUpdate) => resultCode switch
        {
            1 when isUpdate => LeatherPOSResponse.Success(resultCode, $"{entityName} updated successfully"),
            > 0 when !isUpdate => LeatherPOSResponse.Success(resultCode, $"{entityName} saved successfully"),
            -1 => LeatherPOSResponse.Fail("A customer with this phone number already exists in this group"),
            -2 => LeatherPOSResponse.Fail("Cannot deactivate a customer with an outstanding balance"),
            -4 => LeatherPOSResponse.Fail("Walk-in customers cannot be given credit terms"),
            _ => LeatherPOSResponse.Fail("An unexpected error occurred while saving the customer")
        };
    }
}
