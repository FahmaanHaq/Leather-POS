using System.Data;
using LeatherPOS.Models.Administration;
using LeatherPOS.Models.Common;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class GroupServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly GroupService _sut;

        public GroupServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new GroupService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task SaveGroupAsync_PositiveResultCode_ReturnsNewGroupId()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Administration.SaveGroup", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", 3 } });

            var response = await _sut.SaveGroupAsync(new GroupSaveModel { GroupName = "Colombo Branch" });

            response.Status.Should().BeTrue();
            response.Data.Should().Be(3);
        }

        [Fact]
        public async Task SaveGroupAsync_NegativeResultCode_ReturnsDuplicateNameError()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Administration.SaveGroup", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -1 } });

            var response = await _sut.SaveGroupAsync(new GroupSaveModel { GroupName = "Colombo Branch" });

            response.Status.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateGroupAsync_ResultCodeMinus2_ReturnsActiveUsersGuardMessage()
        {
            _repositoryMock
                .Setup(r => r.ExecuteSPWithInputOutputAsync("Administration.UpdateGroup", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new Dictionary<string, object> { { "@Result", -2 } });

            var response = await _sut.UpdateGroupAsync(new GroupUpdateModel { GroupID = 1, GroupName = "Colombo Branch", IsActive = false });

            response.Status.Should().BeFalse();
            response.Message.Should().Contain("active users");
        }
    }
}
