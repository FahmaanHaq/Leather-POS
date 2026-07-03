/* =========================================================================
   Leather POS & Accounting System - Phase 1 Schema
   Modules: Security & Permissions, Customers, Items/UOM, Containers/Stock
   Convention: every table carries GroupID + standard audit columns
   (IsActive, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate)
   ========================================================================= */

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Security')     EXEC('CREATE SCHEMA Security');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Sales')        EXEC('CREATE SCHEMA Sales');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Inventory')    EXEC('CREATE SCHEMA Inventory');
GO

/* -------------------------------------------------------------------------
   SECURITY & PERMISSIONS  (FR-SEC)
   ------------------------------------------------------------------------- */

CREATE TABLE Security.Roles (
    RoleID          INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    RoleName        NVARCHAR(100) NOT NULL,
    Description     NVARCHAR(255) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT UQ_Roles_GroupName UNIQUE (GroupID, RoleName)
);
GO

CREATE TABLE Security.Users (
    UserID          INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    RoleID          INT NOT NULL REFERENCES Security.Roles(RoleID),
    Username        NVARCHAR(100) NOT NULL,
    Email           NVARCHAR(255) NULL,
    PasswordHash    NVARCHAR(255) NOT NULL,
    FullName        NVARCHAR(150) NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT UQ_Users_GroupUsername UNIQUE (GroupID, Username)
);
GO

CREATE TABLE Security.Screens (
    ScreenID        INT IDENTITY(1,1) PRIMARY KEY,
    ScreenName      NVARCHAR(150) NOT NULL,
    RouteKey        NVARCHAR(150) NOT NULL UNIQUE,
    ParentScreenID  INT NULL REFERENCES Security.Screens(ScreenID),
    DisplayOrder    INT NOT NULL DEFAULT 0,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL
);
GO

CREATE TABLE Security.RolePermissions (
    RolePermissionID INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    RoleID          INT NOT NULL REFERENCES Security.Roles(RoleID),
    ScreenID        INT NOT NULL REFERENCES Security.Screens(ScreenID),
    CanView         BIT NOT NULL DEFAULT 0,
    CanAdd          BIT NOT NULL DEFAULT 0,
    CanEdit         BIT NOT NULL DEFAULT 0,
    CanDelete       BIT NOT NULL DEFAULT 0,
    CanExport       BIT NOT NULL DEFAULT 0,
    CanApprove      BIT NOT NULL DEFAULT 0,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT UQ_RolePermissions UNIQUE (RoleID, ScreenID)
);
GO

CREATE TABLE Security.UserPermissions (
    UserPermissionID INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    UserID          INT NOT NULL REFERENCES Security.Users(UserID),
    ScreenID        INT NOT NULL REFERENCES Security.Screens(ScreenID),
    CanView         BIT NULL,   -- NULL = inherit from role, 0/1 = explicit override
    CanAdd          BIT NULL,
    CanEdit         BIT NULL,
    CanDelete       BIT NULL,
    CanExport       BIT NULL,
    CanApprove      BIT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT UQ_UserPermissions UNIQUE (UserID, ScreenID)
);
GO

CREATE TABLE Security.ActivityLog (
    ActivityLogID   BIGINT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    UserID          INT NOT NULL,
    Action          NVARCHAR(100) NOT NULL,      -- Login, PermissionChange, PriceOverride, InvoiceCancel, ManualJournal, etc.
    EntityName      NVARCHAR(100) NULL,
    EntityID        INT NULL,
    BeforeValue     NVARCHAR(MAX) NULL,
    AfterValue      NVARCHAR(MAX) NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* -------------------------------------------------------------------------
   CUSTOMER MANAGEMENT (FR-CUS)
   ------------------------------------------------------------------------- */

CREATE TABLE Sales.Customers (
    CustomerID      INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    CustomerType    TINYINT NOT NULL,             -- 1 = Regular (credit), 2 = Walk-in
    Name            NVARCHAR(150) NOT NULL,
    Phone           NVARCHAR(30) NULL,
    Address         NVARCHAR(255) NULL,
    CreditLimit     DECIMAL(18,2) NULL,
    CreditDays      INT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT CK_Customers_Type CHECK (CustomerType IN (1,2)),
    -- Walk-in customers cannot carry credit terms
    CONSTRAINT CK_Customers_WalkinNoCredit CHECK (
        CustomerType = 1 OR (CreditLimit IS NULL AND CreditDays IS NULL)
    )
);
GO

CREATE TABLE Sales.CustomerLedger (
    LedgerID        BIGINT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    CustomerID      INT NOT NULL REFERENCES Sales.Customers(CustomerID),
    InvoiceID       INT NULL,      -- FK to Invoices, added in Phase 2
    PaymentID       INT NULL,      -- FK to Payments, added in Phase 2
    DebitAmount     DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreditAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    Balance         DECIMAL(18,2) NOT NULL DEFAULT 0,
    TransactionDate DATETIME NOT NULL DEFAULT GETDATE(),
    Narration       NVARCHAR(255) NULL,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* -------------------------------------------------------------------------
   ITEM / UOM / INVENTORY MANAGEMENT (FR-ITM)
   ------------------------------------------------------------------------- */

CREATE TABLE Inventory.UOM (
    UOMID           INT IDENTITY(1,1) PRIMARY KEY,
    UOMCode         NVARCHAR(10) NOT NULL UNIQUE,   -- m, cm, mm, in, kg, g, pcs
    UOMName         NVARCHAR(50) NOT NULL,
    UOMType         TINYINT NOT NULL,                -- 1=Length, 2=Weight, 3=Count
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL
);
GO

CREATE TABLE Inventory.Categories (
    CategoryID      INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    CategoryName    NVARCHAR(100) NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL
);
GO

CREATE TABLE Inventory.Items (
    ItemID          INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    ItemCode        NVARCHAR(50) NOT NULL,
    ItemName        NVARCHAR(150) NOT NULL,
    CategoryID      INT NULL REFERENCES Inventory.Categories(CategoryID),
    BaseUOMID       INT NOT NULL REFERENCES Inventory.UOM(UOMID),
    Barcode         NVARCHAR(50) NULL,
    Description     NVARCHAR(255) NULL,
    CostPrice       DECIMAL(18,2) NOT NULL DEFAULT 0,
    SellingPrice    DECIMAL(18,2) NOT NULL DEFAULT 0,
    ReorderLevel    DECIMAL(18,3) NOT NULL DEFAULT 0,
    ImagePath       NVARCHAR(255) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL,
    CONSTRAINT UQ_Items_GroupCode UNIQUE (GroupID, ItemCode)
);
GO

CREATE TABLE Inventory.Suppliers (
    SupplierID      INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    Name            NVARCHAR(150) NOT NULL,
    ContactInfo     NVARCHAR(255) NULL,
    PaymentTerms    NVARCHAR(100) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL
);
GO

CREATE TABLE Inventory.Containers (
    ContainerID     INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    SupplierID      INT NOT NULL REFERENCES Inventory.Suppliers(SupplierID),
    ReferenceNo     NVARCHAR(50) NOT NULL,
    ReceivedDate    DATETIME NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy      INT NULL,
    ModifiedDate    DATETIME NULL
);
GO

CREATE TABLE Inventory.ContainerItems (
    ContainerItemID INT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    ContainerID     INT NOT NULL REFERENCES Inventory.Containers(ContainerID),
    ItemID          INT NOT NULL REFERENCES Inventory.Items(ItemID),
    Quantity        DECIMAL(18,3) NOT NULL,
    UnitCost        DECIMAL(18,2) NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE Inventory.StockLedger (
    StockLedgerID   BIGINT IDENTITY(1,1) PRIMARY KEY,
    GroupID         INT NOT NULL,
    ItemID          INT NOT NULL REFERENCES Inventory.Items(ItemID),
    TransactionType TINYINT NOT NULL,      -- 1=In, 2=Out, 3=Adjust
    Quantity        DECIMAL(18,3) NOT NULL,
    RefTable        NVARCHAR(50) NOT NULL, -- e.g. 'ContainerItems', 'InvoiceLines'
    RefID           INT NOT NULL,
    TransactionDate DATETIME NOT NULL DEFAULT GETDATE(),
    CreatedBy       INT NOT NULL,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Seed base UOM list (FR-ITM-03)
INSERT INTO Inventory.UOM (UOMCode, UOMName, UOMType, CreatedBy) VALUES
('m','Metre',1,1), ('cm','Centimetre',1,1), ('mm','Millimetre',1,1), ('in','Inch',1,1),
('kg','Kilogram',2,1), ('g','Gram',2,1), ('pcs','Piece',3,1);
GO
