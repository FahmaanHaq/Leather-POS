using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class CustomerServiceTests
    {
        private readonly Mock<ILeatherPOSUnitOfWork> _unitOfWorkMock;
        private readonly Mock<ILeatherPOSRepository> _repositoryMock;
        private readonly CustomerService _sut;

        public CustomerServiceTests()
        {
            _repositoryMock = new Mock<ILeatherPOSRepository>();
            _unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            _unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new CustomerService(_unitOfWorkMock.Object);
        }

        [Fact]
        public async Task SaveCustomerAsync_PositiveResultCode_ReturnsSuccessWithNewId()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.SaveCustomer", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 42 } });

            var model = new CustomerSaveModel { GroupID = 1, CustomerType = 1, Name = "Test Co", CreatedBy = 1 };

            var response = await _sut.SaveCustomerAsync(model);

            response.Status.Should().BeTrue();
            response.Data.Should().Be(42);
        }

        [Fact]
        public async Task SaveCustomerAsync_ResultCodeMinus4_ReturnsWalkInCreditTermsError()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.SaveCustomer", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -4 } });

            var model = new CustomerSaveModel { GroupID = 1, CustomerType = 2, Name = "Walk-in", CreditLimit = 1000, CreatedBy = 1 };

            var response = await _sut.SaveCustomerAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("credit terms");
        }

        [Fact]
        public async Task UpdateCustomerAsync_ResultCodeMinus2_ReturnsOutstandingBalanceError()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.UpdateCustomer", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -2 } });

            var model = new CustomerUpdateModel { CustomerID = 1, Name = "Regular Co", IsActive = false, ModifiedBy = 1 };

            var response = await _sut.UpdateCustomerAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("outstanding balance");
        }

        [Fact]
        public async Task UpdateCustomerAsync_ResultCodeOne_ReturnsUpdatedMessage_NotSavedMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Sales.UpdateCustomer", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 1 } });

            var model = new CustomerUpdateModel { CustomerID = 1, Name = "Regular Co", IsActive = true, ModifiedBy = 1 };

            var response = await _sut.UpdateCustomerAsync(model);

            response.Status.Should().BeTrue();
            response.Message.Should().Contain("updated");
        }

        [Fact]
        public async Task GetCustomerByIdAsync_NotFound_ReturnsFailure()
        {
            _repositoryMock
                .Setup(r => r.GetEntityBySPAsync<Customer>("Sales.GetCustomerByID", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync((Customer?)null);

            var response = await _sut.GetCustomerByIdAsync(999);

            response.Status.Should().BeFalse();
            response.Message.Should().Be("Customer not found");
        }
    }
}
