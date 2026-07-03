/* =========================================================================
   Sales schema - Customer Management Stored Procedures
   ========================================================================= */

CREATE OR ALTER PROCEDURE Sales.GetAllCustomers
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CustomerID, c.GroupID, c.CustomerType, c.Name, c.Phone, c.Address,
           c.CreditLimit, c.CreditDays, c.IsActive,
           ISNULL((SELECT TOP 1 Balance FROM Sales.CustomerLedger cl
                   WHERE cl.CustomerID = c.CustomerID
                   ORDER BY cl.LedgerID DESC), 0) AS OutstandingBalance,
           c.CreatedBy, c.CreatedDate, c.ModifiedBy, c.ModifiedDate
    FROM Sales.Customers c
    WHERE c.GroupID = @GroupID AND c.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Sales.GetCustomerByID
    @CustomerID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CustomerID, c.GroupID, c.CustomerType, c.Name, c.Phone, c.Address,
           c.CreditLimit, c.CreditDays, c.IsActive,
           ISNULL((SELECT TOP 1 Balance FROM Sales.CustomerLedger cl
                   WHERE cl.CustomerID = c.CustomerID
                   ORDER BY cl.LedgerID DESC), 0) AS OutstandingBalance
    FROM Sales.Customers c
    WHERE c.CustomerID = @CustomerID;
END
GO

-- FR-CUS-03: quick balance lookup used by the Billing screen customer search
CREATE OR ALTER PROCEDURE Sales.GetCustomerBalanceSummary
    @CustomerID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CustomerID, c.Name, c.CreditLimit, c.CreditDays,
           ISNULL((SELECT TOP 1 Balance FROM Sales.CustomerLedger cl
                   WHERE cl.CustomerID = c.CustomerID
                   ORDER BY cl.LedgerID DESC), 0) AS OutstandingBalance
    FROM Sales.Customers c
    WHERE c.CustomerID = @CustomerID;
END
GO

CREATE OR ALTER PROCEDURE Sales.SaveCustomer
    @GroupID INT,
    @CustomerType TINYINT,
    @Name NVARCHAR(150),
    @Phone NVARCHAR(30) = NULL,
    @Address NVARCHAR(255) = NULL,
    @CreditLimit DECIMAL(18,2) = NULL,
    @CreditDays INT = NULL,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- FR-CUS-05: walk-in customers cannot carry credit terms
    IF @CustomerType = 2 AND (@CreditLimit IS NOT NULL OR @CreditDays IS NOT NULL)
    BEGIN
        SET @Result = -4; -- walk-in customer cannot have credit terms
        RETURN;
    END

    IF @Phone IS NOT NULL AND EXISTS (
        SELECT 1 FROM Sales.Customers WHERE GroupID = @GroupID AND Phone = @Phone AND IsActive = 1
    )
    BEGIN
        SET @Result = -1; -- duplicate phone within group
        RETURN;
    END

    INSERT INTO Sales.Customers
        (GroupID, CustomerType, Name, Phone, Address, CreditLimit, CreditDays, CreatedBy, CreatedDate)
    VALUES
        (@GroupID, @CustomerType, @Name, @Phone, @Address, @CreditLimit, @CreditDays, @CreatedBy, GETDATE());

    SET @Result = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE Sales.UpdateCustomer
    @CustomerID INT,
    @Name NVARCHAR(150),
    @Phone NVARCHAR(30) = NULL,
    @Address NVARCHAR(255) = NULL,
    @CreditLimit DECIMAL(18,2) = NULL,
    @CreditDays INT = NULL,
    @IsActive BIT,
    @ModifiedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CustomerType TINYINT = (SELECT CustomerType FROM Sales.Customers WHERE CustomerID = @CustomerID);

    IF @CustomerType = 2 AND (@CreditLimit IS NOT NULL OR @CreditDays IS NOT NULL)
    BEGIN
        SET @Result = -4;
        RETURN;
    END

    IF @IsActive = 0 AND EXISTS (
        SELECT 1 FROM Sales.CustomerLedger
        WHERE CustomerID = @CustomerID
        GROUP BY CustomerID HAVING SUM(DebitAmount) - SUM(CreditAmount) > 0
    )
    BEGIN
        SET @Result = -2; -- cannot deactivate a customer with an outstanding balance
        RETURN;
    END

    UPDATE Sales.Customers
    SET Name = @Name, Phone = @Phone, Address = @Address,
        CreditLimit = @CreditLimit, CreditDays = @CreditDays, IsActive = @IsActive,
        ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
    WHERE CustomerID = @CustomerID;

    SET @Result = 1;
END
GO

-- FR-CUS-06: statement report
CREATE OR ALTER PROCEDURE Sales.GetCustomerStatement
    @CustomerID INT,
    @FromDate DATETIME,
    @ToDate DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    SELECT LedgerID, TransactionDate, Narration, DebitAmount, CreditAmount, Balance
    FROM Sales.CustomerLedger
    WHERE CustomerID = @CustomerID AND TransactionDate BETWEEN @FromDate AND @ToDate
    ORDER BY TransactionDate, LedgerID;
END
GO

-- FR-CUS-07: debt ageing buckets
CREATE OR ALTER PROCEDURE Sales.GetReceivablesAgeing
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH LastBalance AS (
        SELECT cl.CustomerID, cl.Balance, cl.TransactionDate,
               ROW_NUMBER() OVER (PARTITION BY cl.CustomerID ORDER BY cl.LedgerID DESC) AS rn
        FROM Sales.CustomerLedger cl
    )
    SELECT c.CustomerID, c.Name, lb.Balance,
        CASE
            WHEN DATEDIFF(DAY, lb.TransactionDate, GETDATE()) <= 30 THEN '0-30'
            WHEN DATEDIFF(DAY, lb.TransactionDate, GETDATE()) <= 60 THEN '31-60'
            WHEN DATEDIFF(DAY, lb.TransactionDate, GETDATE()) <= 90 THEN '61-90'
            ELSE '90+'
        END AS AgeingBucket
    FROM Sales.Customers c
    JOIN LastBalance lb ON lb.CustomerID = c.CustomerID AND lb.rn = 1
    WHERE c.GroupID = @GroupID AND lb.Balance > 0;
END
GO
