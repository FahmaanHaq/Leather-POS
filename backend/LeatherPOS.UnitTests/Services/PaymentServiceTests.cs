using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class PaymentServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly PaymentService _sut;

        public PaymentServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new PaymentService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task SaveDebtSettlementAsync_ResultCodeMinus2_RejectsCreditAsSettlementMode()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.SaveDebtSettlement", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -2 } });

            var model = new DebtSettlementModel { GroupID = 1, CustomerID = 1, PaymentMode = 4, Amount = 1000, CreatedBy = 1 };
            var response = await _sut.SaveDebtSettlementAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("Credit cannot be used");
        }

        [Fact]
        public async Task SaveDebtSettlementAsync_PositiveResult_ReturnsSuccess()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.SaveDebtSettlement", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 10 } });

            var model = new DebtSettlementModel { GroupID = 1, CustomerID = 1, PaymentMode = 1, Amount = 1000, CreatedBy = 1 };
            var response = await _sut.SaveDebtSettlementAsync(model);

            response.Status.Should().BeTrue();
            response.Data.Should().Be(10);
        }

        [Fact]
        public async Task UpdateChequeStatusAsync_NotFound_ReturnsFailure()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.UpdateChequeStatus", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -1 } });

            var model = new ChequeStatusUpdateModel { ChequeDetailID = 999, NewStatus = 4, ChangedBy = 1 };
            var response = await _sut.UpdateChequeStatusAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("not found");
        }

        [Fact]
        public async Task GetCashRegisterReportAsync_CombinesSummaryAndTransactions()
        {
            var summary = new CashRegisterSummary { TransactionCount = 3, TotalCash = 1500 };
            var transactions = new List<CashRegisterTransaction> { new() { PaymentID = 1, Amount = 500 } };

            _repositoryMock
                .Setup(r => r.GetThreeResultSetsBySPAsync<CashRegisterSummary, CashRegisterTransaction, EmptyResultSet>(
                    "Sales.GetCashRegisterReport", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((new List<CashRegisterSummary> { summary }, transactions, new List<EmptyResultSet>()));

            var response = await _sut.GetCashRegisterReportAsync(1, DateTime.Today);

            response.Status.Should().BeTrue();
            var report = response.Data as CashRegisterReport;
            report.Should().NotBeNull();
            report!.Summary.TotalCash.Should().Be(1500);
            report.Transactions.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCardSettlementReportAsync_CombinesSummaryAndTransactions()
        {
            var summaries = new List<CardSettlementSummary> { new() { CardType = "Visa", TransactionCount = 2, TotalAmount = 800 } };
            var transactions = new List<CardSettlementTransaction> { new() { PaymentID = 1, CardType = "Visa", Amount = 400 } };

            _repositoryMock
                .Setup(r => r.GetThreeResultSetsBySPAsync<CardSettlementSummary, CardSettlementTransaction, EmptyResultSet>(
                    "Sales.GetCardSettlementReport", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((summaries, transactions, new List<EmptyResultSet>()));

            var response = await _sut.GetCardSettlementReportAsync(1, DateTime.Today);

            response.Status.Should().BeTrue();
            var report = response.Data as CardSettlementReport;
            report.Should().NotBeNull();
            report!.SummaryByCardType.Should().HaveCount(1);
            report.Transactions.Should().HaveCount(1);
        }
    }
}
