using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class ContainerServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly ContainerService _sut;

        public ContainerServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new ContainerService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task SaveContainerAsync_NoLines_ShortCircuitsWithoutCallingRepository()
        {
            var model = new ContainerSaveModel { GroupID = 1, SupplierID = 1, ReferenceNo = "GRN-001", ReceivedDate = DateTime.Today, Lines = new List<ContainerLine>() };

            var response = await _sut.SaveContainerAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("at least one stock line");
            _repositoryMock.Verify(r => r.ExecuteSPWithTableValuedParameterAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DataTable>(),
                It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()), Times.Never);
        }

        [Fact]
        public async Task SaveContainerAsync_ValidLines_PostsTvpAndReturnsNewContainerId()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithTableValuedParameterAsync(
                    "Inventory.SaveContainer", "@Lines", "Inventory.ContainerItemType",
                    It.IsAny<DataTable>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 15 } });

            var model = new ContainerSaveModel
            {
                GroupID = 1,
                SupplierID = 1,
                ReferenceNo = "GRN-002",
                ReceivedDate = DateTime.Today,
                Lines = new List<ContainerLine> { new() { ItemID = 1, Quantity = 100.5m, UnitCost = 850m } },
                CreatedBy = 1
            };

            var response = await _sut.SaveContainerAsync(model);

            response.Status.Should().BeTrue();
            response.Data.Should().Be(15);
        }

        [Fact]
        public async Task SaveSupplierAsync_PositiveResult_ReturnsNewSupplierId()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Inventory.SaveSupplier", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 3 } });

            var response = await _sut.SaveSupplierAsync(new SupplierSaveModel { GroupID = 1, Name = "Colombo Tannery", CreatedBy = 1 });

            response.Status.Should().BeTrue();
            response.Data.Should().Be(3);
        }

        [Fact]
        public async Task SaveSupplierAsync_ResultCodeMinus1_ReturnsDuplicateNameError()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Inventory.SaveSupplier", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -1 } });

            var response = await _sut.SaveSupplierAsync(new SupplierSaveModel { GroupID = 1, Name = "Colombo Tannery", CreatedBy = 1 });

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("already exists");
        }
    }
}
