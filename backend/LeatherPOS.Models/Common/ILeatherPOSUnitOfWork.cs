using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace LeatherPOS.Models.Common
{
    /// <summary>
    /// Reference-only stub matching your existing generic repository / unit-of-work
    /// signatures (IAgriGenERPUnitOfWork). Replace with a using-statement to your
    /// real implementation — this file exists purely so the Services below compile
    /// standalone and show the exact call pattern to copy.
    /// </summary>
    public interface ILeatherPOSRepository
    {
        Task<List<T>> GetEntitiesBySPAsync<T>(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters) where T : new();
        Task<T?> GetEntityBySPAsync<T>(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters) where T : new();
        Task<Dictionary<string, object>> ExecuteSPWithInputOutputAsync(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters);

        /// <summary>
        /// For SPs that take a table-valued parameter (e.g. Inventory.ValidateItemImportBatch,
        /// Inventory.SaveContainer). SQL Server TVPs require SqlDbType.Structured, which sits
        /// outside the generic System.Data.DbType enum, so these get a dedicated signature:
        /// tvpTypeName is the SQL type name (e.g. "Inventory.ItemImportRowType"), tvpData is a
        /// DataTable whose columns match the TVP definition, and scalarParameters/output work
        /// exactly like ExecuteSPWithInputOutputAsync.
        /// </summary>
        Task<Dictionary<string, object>> ExecuteSPWithTableValuedParameterAsync(
            string spName,
            string tvpParameterName,
            string tvpTypeName,
            DataTable tvpData,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters);

        Task<List<T>> GetEntitiesBySPWithTableValuedParameterAsync<T>(
            string spName,
            string tvpParameterName,
            string tvpTypeName,
            DataTable tvpData,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters) where T : new();

        /// <summary>
        /// For SPs needing more than one TVP in a single call (e.g. Sales.SaveInvoice
        /// takes both @Lines and @Payments). Key = parameter name (e.g. "@Lines"),
        /// value = (SQL type name, populated DataTable).
        /// </summary>
        Task<Dictionary<string, object>> ExecuteSPWithMultipleTableValuedParametersAsync(
            string spName,
            Dictionary<string, (string TypeName, DataTable Data)> tvpParameters,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters);

        /// <summary>
        /// For SPs returning three ordered result sets in one round trip (e.g.
        /// Sales.GetInvoiceByID: header, then lines, then payments).
        /// </summary>
        Task<(List<T1> Set1, List<T2> Set2, List<T3> Set3)> GetThreeResultSetsBySPAsync<T1, T2, T3>(
            string spName,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters)
            where T1 : new() where T2 : new() where T3 : new();
    }

    public interface ILeatherPOSUnitOfWork
    {
        ILeatherPOSRepository Repository();
    }
}
