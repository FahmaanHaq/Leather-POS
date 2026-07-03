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
    }

    public interface ILeatherPOSUnitOfWork
    {
        ILeatherPOSRepository Repository();
    }
}
