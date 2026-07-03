using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class InvoiceServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly InvoiceService _sut;

        public InvoiceServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new InvoiceService(unitOfWorkMock.Object);
        }

        private SaveInvoiceModel ValidModel(bool isHeld = false) => new()
        {
            GroupID = 1,
            InvoiceDate = DateTime.Today,
            IsHeld = isHeld,
            CreatedBy = 1,
            Lines = new List<InvoiceLineInput> { new() { ItemID = 1, UOMID = 1, Quantity = 1, UnitPrice = 100, Discount = 0 } },
            Payments = new List<PaymentInput> { new() { PaymentMode = 1, Amount = 100 } }
        };

        [Theory]
        [InlineData(-1, "match")]
        [InlineData(-2, "stock")]
        [InlineData(-3, "credit limit")]
        [InlineData(-4, "Regular customer")]
        [InlineData(-5, "at least one line")]
        public async Task SaveInvoiceAsync_GuardResultCodes_ReturnCorrectMessages(int code, string expectedFragment)
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithMultipleTableValuedParametersAsync(
                    "Sales.SaveInvoice", It.IsAny<Dictionary<string, (string, DataTable)>>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", code } });

            var response = await _sut.SaveInvoiceAsync(ValidModel());

            response.Status.Should().BeFalse();
            response.Message.Should().Contain(expectedFragment);
        }

        [Fact]
        public async Task SaveInvoiceAsync_PositiveResultAndHeld_ReturnsHeldMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithMultipleTableValuedParametersAsync(
                    "Sales.SaveInvoice", It.IsAny<Dictionary<string, (string, DataTable)>>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 7 } });

            var response = await _sut.SaveInvoiceAsync(ValidModel(isHeld: true));

            response.Status.Should().BeTrue();
            response.Data.Should().Be(7);
            response.Message.Should().Contain("held");
        }

        [Fact]
        public async Task SaveInvoiceAsync_PositiveResultAndNotHeld_ReturnsCompletedMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithMultipleTableValuedParametersAsync(
                    "Sales.SaveInvoice", It.IsAny<Dictionary<string, (string, DataTable)>>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 7 } });

            var response = await _sut.SaveInvoiceAsync(ValidModel(isHeld: false));

            response.Status.Should().BeTrue();
            response.Message.Should().Contain("completed");
        }

        [Theory]
        [InlineData(-1, "at least one line")]
        [InlineData(-2, "returnable state")]
        [InlineData(-3, "remaining quantity")]
        public async Task ReturnInvoiceAsync_GuardResultCodes_ReturnCorrectMessages(int code, string expectedFragment)
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithTableValuedParameterAsync(
                    "Sales.ReturnInvoice", "@ReturnLines", "Sales.ReturnLineType", It.IsAny<DataTable>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", code } });

            var model = new ReturnInvoiceModel
            {
                InvoiceID = 1,
                CreatedBy = 1,
                ReturnLines = new List<ReturnLineInput> { new() { InvoiceLineID = 1, QuantityToReturn = 1 } }
            };

            var response = await _sut.ReturnInvoiceAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain(expectedFragment);
        }

        [Fact]
        public async Task GetInvoiceByIdAsync_NoHeaderFound_ReturnsFailure()
        {
            _repositoryMock
                .Setup(r => r.GetThreeResultSetsBySPAsync<Invoice, InvoiceLineDetail, PaymentDetail>(
                    "Sales.GetInvoiceByID", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((new List<Invoice>(), new List<InvoiceLineDetail>(), new List<PaymentDetail>()));

            var response = await _sut.GetInvoiceByIdAsync(999);

            response.Status.Should().BeFalse();
            response.Message.Should().Be("Invoice not found");
        }

        [Fact]
        public async Task GetInvoiceByIdAsync_CombinesAllThreeResultSets()
        {
            var header = new Invoice { InvoiceID = 1, InvoiceNo = "INV-2026-000001", TotalAmount = 500 };
            var lines = new List<InvoiceLineDetail> { new() { InvoiceLineID = 1, ItemName = "Hide", Quantity = 2 } };
            var payments = new List<PaymentDetail> { new() { PaymentID = 1, PaymentMode = 1, Amount = 500 } };

            _repositoryMock
                .Setup(r => r.GetThreeResultSetsBySPAsync<Invoice, InvoiceLineDetail, PaymentDetail>(
                    "Sales.GetInvoiceByID", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((new List<Invoice> { header }, lines, payments));

            var response = await _sut.GetInvoiceByIdAsync(1);

            response.Status.Should().BeTrue();
            var detail = response.Data as InvoiceDetail;
            detail.Should().NotBeNull();
            detail!.Header!.InvoiceNo.Should().Be("INV-2026-000001");
            detail.Lines.Should().HaveCount(1);
            detail.Payments.Should().HaveCount(1);
        }
        [Fact]
        public async Task GetCustomerItemLastPriceAsync_NoHistory_ReturnsSuccessWithNullData()
        {
            _repositoryMock
                .Setup(r => r.GetEntityBySPAsync<CustomerItemPriceHistory>(
                    "Sales.GetCustomerItemLastPrice", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((CustomerItemPriceHistory?)null);

            var response = await _sut.GetCustomerItemLastPriceAsync(1, 5);

            // No purchase history is a normal outcome, not an error - the
            // Billing screen just falls back to the catalogue price.
            response.Status.Should().BeTrue();
            response.Data.Should().BeNull();
        }

        [Fact]
        public async Task GetCustomerItemLastPriceAsync_HasHistory_ReturnsThatPrice()
        {
            var history = new CustomerItemPriceHistory { UnitPrice = 850, Discount = 0, LastInvoiceNo = "INV-2026-000002" };
            _repositoryMock
                .Setup(r => r.GetEntityBySPAsync<CustomerItemPriceHistory>(
                    "Sales.GetCustomerItemLastPrice", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(history);

            var response = await _sut.GetCustomerItemLastPriceAsync(1, 5);

            response.Status.Should().BeTrue();
            var data = response.Data as CustomerItemPriceHistory;
            data.Should().NotBeNull();
            data!.UnitPrice.Should().Be(850);
        }
    }
}
