using System.Data;
using System.Reflection;
using LeatherPOS.Models.Common;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace LeatherPOS.Services.Implementations
{
    /// <summary>
    /// Real ADO.NET implementation of ILeatherPOSRepository, executing everything
    /// via stored procedures against Azure SQL. Uses simple reflection-based
    /// mapping (column name -> property name, case-insensitive) rather than a
    /// dependency like Dapper, to keep the package footprint minimal.
    /// </summary>
    public class LeatherPOSRepository : ILeatherPOSRepository
    {
        private readonly string _connectionString;

        public LeatherPOSRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection connection string is not configured.");
        }

        public async Task<List<T>> GetEntitiesBySPAsync<T>(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters) where T : new()
        {
            var results = new List<T>();

            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, parameters);

            await connection.OpenAsync();
            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
                results.Add(MapReaderToObject<T>(reader));

            return results;
        }

        public async Task<T?> GetEntityBySPAsync<T>(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters) where T : new()
        {
            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, parameters);

            await connection.OpenAsync();
            await using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
                return MapReaderToObject<T>(reader);

            return default;
        }

        public async Task<Dictionary<string, object>> ExecuteSPWithInputOutputAsync(string spName, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters)
        {
            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, parameters);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();

            return ExtractOutputValues(command, parameters);
        }

        public async Task<Dictionary<string, object>> ExecuteSPWithTableValuedParameterAsync(
            string spName, string tvpParameterName, string tvpTypeName, DataTable tvpData,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters)
        {
            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, scalarParameters);
            AddTableValuedParameter(command, tvpParameterName, tvpTypeName, tvpData);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();

            return ExtractOutputValues(command, scalarParameters);
        }

        public async Task<List<T>> GetEntitiesBySPWithTableValuedParameterAsync<T>(
            string spName, string tvpParameterName, string tvpTypeName, DataTable tvpData,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters) where T : new()
        {
            var results = new List<T>();

            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, scalarParameters);
            AddTableValuedParameter(command, tvpParameterName, tvpTypeName, tvpData);

            await connection.OpenAsync();
            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
                results.Add(MapReaderToObject<T>(reader));

            return results;
        }

        public async Task<Dictionary<string, object>> ExecuteSPWithMultipleTableValuedParametersAsync(
            string spName,
            Dictionary<string, (string TypeName, DataTable Data)> tvpParameters,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> scalarParameters)
        {
            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, scalarParameters);

            foreach (var (parameterName, (typeName, data)) in tvpParameters)
                AddTableValuedParameter(command, parameterName, typeName, data);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();

            return ExtractOutputValues(command, scalarParameters);
        }

        public async Task<(List<T1> Set1, List<T2> Set2, List<T3> Set3)> GetThreeResultSetsBySPAsync<T1, T2, T3>(
            string spName,
            Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters)
            where T1 : new() where T2 : new() where T3 : new()
        {
            var set1 = new List<T1>();
            var set2 = new List<T2>();
            var set3 = new List<T3>();

            await using var connection = new SqlConnection(_connectionString);
            await using var command = new SqlCommand(spName, connection) { CommandType = CommandType.StoredProcedure };
            AddParameters(command, parameters);

            await connection.OpenAsync();
            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
                set1.Add(MapReaderToObject<T1>(reader));

            if (await reader.NextResultAsync())
            {
                while (await reader.ReadAsync())
                    set2.Add(MapReaderToObject<T2>(reader));
            }

            if (await reader.NextResultAsync())
            {
                while (await reader.ReadAsync())
                    set3.Add(MapReaderToObject<T3>(reader));
            }

            return (set1, set2, set3);
        }

        private static void AddParameters(SqlCommand command, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters)
        {

            foreach (var (name, (value, dbType, direction)) in parameters)
            {
                var parameter = command.Parameters.Add(name, ToSqlDbType(dbType));
                parameter.Direction = direction;

                if (direction == ParameterDirection.Output)
                {
                    parameter.Size = dbType == DbType.String ? 255 : 0;
                    continue;
                }

                parameter.Value = string.IsNullOrEmpty(value) ? DBNull.Value : ConvertValue(value, dbType);
            }
        }

        private static void AddTableValuedParameter(SqlCommand command, string parameterName, string typeName, DataTable data)
        {
            var parameter = command.Parameters.AddWithValue(parameterName, data);
            parameter.SqlDbType = SqlDbType.Structured;
            parameter.TypeName = typeName;
        }

        private static Dictionary<string, object> ExtractOutputValues(SqlCommand command, Dictionary<string, Tuple<string, DbType, ParameterDirection>> parameters)
        {
            var output = new Dictionary<string, object>();
            foreach (var (name, (_, _, direction)) in parameters)
            {
                if (direction is ParameterDirection.Output or ParameterDirection.InputOutput)
                {
                    var value = command.Parameters[name].Value;
                    output[name] = value == DBNull.Value ? 0 : value;
                }
            }
            return output;
        }

        private static SqlDbType ToSqlDbType(DbType dbType) => dbType switch
        {
            DbType.Int32 => SqlDbType.Int,
            DbType.String => SqlDbType.NVarChar,
            DbType.Decimal => SqlDbType.Decimal,
            DbType.Boolean => SqlDbType.Bit,
            DbType.DateTime => SqlDbType.DateTime,
            DbType.Date => SqlDbType.Date,
            DbType.Byte => SqlDbType.TinyInt,
            DbType.Int64 => SqlDbType.BigInt,
            _ => SqlDbType.NVarChar
        };

        private static object ConvertValue(string value, DbType dbType) => dbType switch
        {
            DbType.Int32 => int.Parse(value),
            DbType.Int64 => long.Parse(value),
            DbType.Decimal => decimal.Parse(value),
            DbType.Boolean => bool.Parse(value),
            DbType.DateTime => DateTime.Parse(value),
            DbType.Date => DateTime.Parse(value),
            DbType.Byte => byte.Parse(value),
            _ => value
        };

        private static T MapReaderToObject<T>(SqlDataReader reader) where T : new()
        {
            var obj = new T();
            var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);

            for (var i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                var property = properties.FirstOrDefault(p => string.Equals(p.Name, columnName, StringComparison.OrdinalIgnoreCase));
                if (property is null || reader.IsDBNull(i)) continue;

                var value = reader.GetValue(i);
                var targetType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
                property.SetValue(obj, Convert.ChangeType(value, targetType));
            }

            return obj;
        }
    }

    public class LeatherPOSUnitOfWork : ILeatherPOSUnitOfWork
    {
        private readonly ILeatherPOSRepository _repository;

        public LeatherPOSUnitOfWork(ILeatherPOSRepository repository) => _repository = repository;

        public ILeatherPOSRepository Repository() => _repository;
    }
}
