using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class RoleServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly RoleService _sut;

        public RoleServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new RoleService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task UpdateRoleAsync_ResultCodeMinus2_ReturnsActiveUsersGuardMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Security.UpdateRole", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -2 } });

            var response = await _sut.UpdateRoleAsync(new RoleUpdateModel { RoleID = 1, RoleName = "Cashier", IsActive = false, ModifiedBy = 1 });

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("active users");
        }

        [Fact]
        public async Task SaveRoleAsync_ResultCodeMinus1_ReturnsDuplicateNameMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Security.SaveRole", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -1 } });

            var response = await _sut.SaveRoleAsync(new RoleSaveModel { GroupID = 1, RoleName = "Cashier", CreatedBy = 1 });

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task SaveRoleAsync_PositiveResultCode_ReturnsNewRoleId()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Security.SaveRole", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 7 } });

            var response = await _sut.SaveRoleAsync(new RoleSaveModel { GroupID = 1, RoleName = "Inventory Officer", CreatedBy = 1 });

            response.Status.Should().BeTrue();
            response.Data.Should().Be(7);
        }
    }
}
