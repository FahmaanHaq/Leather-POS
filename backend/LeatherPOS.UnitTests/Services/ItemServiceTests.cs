using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class ItemServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly ItemService _sut;

        public ItemServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new ItemService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task SaveItemAsync_ResultCodeMinus1_ReturnsDuplicateCodeMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Inventory.SaveItem", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -1 } });

            var model = new ItemSaveModel { GroupID = 1, ItemCode = "HIDE-001", ItemName = "Cow Hide", BaseUOMID = 1, CreatedBy = 1 };
            var response = await _sut.SaveItemAsync(model);

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task ValidateImportBatchAsync_ReturnsErrorCountAndValidCount()
        {
            _repositoryMock
                .Setup(r => r.GetEntitiesBySPWithTableValuedParameterAsync<ItemImportRowResult>(
                    "Inventory.ValidateItemImportBatch", "@Rows", "Inventory.ItemImportRowType",
                    It.IsAny<DataTable>(), It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new List<ItemImportRowResult>
                {
                    new() { RowNumber = 1, ItemCode = "A-001", ErrorMessage = null },
                    new() { RowNumber = 2, ItemCode = "A-002", ErrorMessage = "Duplicate item code" }
                });

            var rows = new List<ItemImportRow>
            {
                new() { RowNumber = 1, ItemCode = "A-001", ItemName = "Item A", UOMCode = "pcs" },
                new() { RowNumber = 2, ItemCode = "A-002", ItemName = "Item B", UOMCode = "pcs" }
            };

            var response = await _sut.ValidateImportBatchAsync(1, rows);

            response.Status.Should().BeTrue();
            dynamic data = response.Data!;
            ((int)data.ValidCount).Should().Be(1);
            ((int)data.ErrorCount).Should().Be(1);
        }
    }
}
