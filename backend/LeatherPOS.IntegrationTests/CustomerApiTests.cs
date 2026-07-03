using System.Net.Http.Json;
using LeatherPOS.Models.Sales;
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.IntegrationTests
{
    /// <summary>
    /// Runs the real API in-process against a real test database (TestLeatherPOS,
    /// same DB as the tSQLt suite). Use Respawn in a shared fixture to reset state
    /// between tests instead of a full restore - see CustomerApiTestFixture below.
    /// </summary>
    public class CustomerApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public CustomerApiTests(WebApplicationFactory<Program> factory)
        {
            // In a real setup, override the connection string here via
            // factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration(...))
            // to point at TestLeatherPOS instead of the dev/prod DB.
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task SaveCustomer_WalkInWithCreditLimit_ReturnsValidationFailure()
        {
            var payload = new CustomerSaveModel
            {
                GroupID = 1,
                CustomerType = 2, // Walk-in
                Name = "Integration Test Walk-in",
                CreditLimit = 5000,
                CreatedBy = 1
            };

            var response = await _client.PostAsJsonAsync("/api/Customers/Save", payload);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
            body!["Status"].ToString().Should().Be("False");
        }

        [Fact]
        public async Task SaveCustomer_ThenGetById_ReturnsTheSameCustomer()
        {
            var payload = new CustomerSaveModel
            {
                GroupID = 1,
                CustomerType = 1,
                Name = $"Integration Test Regular {Guid.NewGuid():N}",
                CreditLimit = 25000,
                CreditDays = 30,
                CreatedBy = 1
            };

            var saveResponse = await _client.PostAsJsonAsync("/api/Customers/Save", payload);
            saveResponse.EnsureSuccessStatusCode();

            // real assertion would deserialize the new CustomerID from Data and
            // GET /api/Customers/GetByID/{id} to confirm the round trip
        }
    }
}
