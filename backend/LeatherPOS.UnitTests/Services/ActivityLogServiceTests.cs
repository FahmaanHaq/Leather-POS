using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Implementations;
using Moq;
using FluentAssertions;
using Xunit;

namespace LeatherPOS.UnitTests.Services
{
    public class ActivityLogServiceTests
    {
        private readonly Mock<ILeatherPOSRepository> _repositoryMock = new();
        private readonly ActivityLogService _sut;

        public ActivityLogServiceTests()
        {
            var unitOfWorkMock = new Mock<ILeatherPOSUnitOfWork>();
            unitOfWorkMock.Setup(u => u.Repository()).Returns(_repositoryMock.Object);
            _sut = new ActivityLogService(unitOfWorkMock.Object);
        }

        [Fact]
        public async Task GetActivityLogAsync_ReturnsEntriesFromRepository()
        {
            _repositoryMock
                .Setup(r => r.GetEntitiesBySPAsync<ActivityLogEntry>("Security.GetActivityLog", It.IsAny<Dictionary<string, Tuple<string, DbType, ParameterDirection>>>()))
                .ReturnsAsync(new List<ActivityLogEntry>
                {
                    new() { ActivityLogID = 1, Username = "admin", Action = "Login", CreatedDate = DateTime.UtcNow }
                });

            var response = await _sut.GetActivityLogAsync(1);

            response.Status.Should().BeTrue();
            var entries = response.Data as List<ActivityLogEntry>;
            entries.Should().HaveCount(1);
            entries![0].Action.Should().Be("Login");
        }
    }
}
