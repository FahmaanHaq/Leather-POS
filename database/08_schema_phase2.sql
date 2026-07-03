/* =========================================================================
   Phase 2 Schema: Billing/POS (FR-POS), Payment Handling (FR-PAY)
   ========================================================================= */

/* -------------------------------------------------------------------------
   Invoice status: 1 = Held (draft, no stock/ledger effect yet)
                   2 = Completed (stock decremented, ledger posted)
                   3 = Reversed (fully returned)
                   4 = PartiallyReversed (some lines returned)
   ------------------------------------------------------------------------- */
CREATE TABLE Sales.Invoices (
    InvoiceID           INT IDENTITY(1,1) PRIMARY KEY,
    GroupID              INT NOT NULL,
    InvoiceNo            NVARCHAR(50) NULL,          -- assigned only when Status moves to Completed
    CustomerID           INT NULL REFERENCES Sales.Customers(CustomerID),  -- NULL = walk-in, no customer picked
    InvoiceDate          DATETIME NOT NULL DEFAULT GETDATE(),
    Status               TINYINT NOT NULL DEFAULT 1, -- 1=Held, 2=Completed, 3=Reversed, 4=PartiallyReversed
    SubTotal             DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountTotal        DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount          DECIMAL(18,2) NOT NULL DEFAULT 0,
    PassToAccounting     BIT NOT NULL DEFAULT 1,     -- FR-POS-05
    ReversedFromInvoiceID INT NULL REFERENCES Sales.Invoices(InvoiceID), -- set on the reversal record itself
    IsActive             BIT NOT NULL DEFAULT 1,
    CreatedBy            INT NOT NULL,
    CreatedDate          DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedBy           INT NULL,
    ModifiedDate         DATETIME NULL,
    CONSTRAINT UQ_Invoices_GroupInvoiceNo UNIQUE (GroupID, InvoiceNo)
);
GO

CREATE TABLE Sales.InvoiceLines (
    InvoiceLineID        INT IDENTITY(1,1) PRIMARY KEY,
    GroupID              INT NOT NULL,
    InvoiceID            INT NOT NULL REFERENCES Sales.Invoices(InvoiceID),
    ItemID               INT NOT NULL REFERENCES Inventory.Items(ItemID),
    UOMID                INT NOT NULL REFERENCES Inventory.UOM(UOMID),
    Quantity             DECIMAL(18,3) NOT NULL,
    UnitPrice            DECIMAL(18,2) NOT NULL,
    Discount             DECIMAL(18,2) NOT NULL DEFAULT 0,
    LineTotal            DECIMAL(18,2) NOT NULL,
    QuantityReturned     DECIMAL(18,3) NOT NULL DEFAULT 0,   -- running total across partial returns
    CreatedDate          DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* Parent payment record. One invoice can have multiple Payment rows
   (split across Cash/Card/Cheque/Credit). A Payment with InvoiceID = NULL
   is a pure debt settlement (FR-POS-04), not tied to a new sale. */
CREATE TABLE Sales.Payments (
    PaymentID            INT IDENTITY(1,1) PRIMARY KEY,
    GroupID              INT NOT NULL,
    InvoiceID            INT NULL REFERENCES Sales.Invoices(InvoiceID),
    CustomerID           INT NULL REFERENCES Sales.Customers(CustomerID),
    PaymentMode          TINYINT NOT NULL,            -- 1=Cash, 2=Card, 3=Cheque, 4=Credit
    Amount               DECIMAL(18,2) NOT NULL,
    TenderedAmount       DECIMAL(18,2) NULL,           -- cash only
    ChangeGiven          DECIMAL(18,2) NULL,           -- cash only
    IsDebtSettlement     BIT NOT NULL DEFAULT 0,        -- FR-POS-04
    IsVoided             BIT NOT NULL DEFAULT 0,        -- set when the parent invoice is reversed
    CreatedBy            INT NOT NULL,
    CreatedDate          DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_Payments_Mode CHECK (PaymentMode BETWEEN 1 AND 4)
);
GO

CREATE TABLE Sales.ChequeDetails (
    ChequeDetailID       INT IDENTITY(1,1) PRIMARY KEY,
    GroupID              INT NOT NULL,
    PaymentID            INT NOT NULL REFERENCES Sales.Payments(PaymentID),
    ChequeNo             NVARCHAR(50) NOT NULL,
    Bank                 NVARCHAR(100) NOT NULL,
    Branch               NVARCHAR(100) NULL,
    ChequeDate           DATE NOT NULL,
    Status               TINYINT NOT NULL DEFAULT 1,   -- 1=Pending,2=Deposited,3=Cleared,4=Bounced,5=Cancelled
    StatusChangedDate    DATETIME NULL,
    StatusChangedBy      INT NULL,
    CONSTRAINT CK_ChequeDetails_Status CHECK (Status BETWEEN 1 AND 5)
);
GO

CREATE TABLE Sales.CardDetails (
    CardDetailID         INT IDENTITY(1,1) PRIMARY KEY,
    GroupID              INT NOT NULL,
    PaymentID            INT NOT NULL REFERENCES Sales.Payments(PaymentID),
    CardType             NVARCHAR(30) NOT NULL,         -- Visa/Master/Amex/etc.
    Last4Digits          CHAR(4) NOT NULL,
    ApprovalCode         NVARCHAR(50) NULL,
    TerminalID           NVARCHAR(50) NULL
);
GO

/* Per-Group, per-financial-year sequential invoice numbering (FR-POS-09).
   FinancialYearStartMonth is configurable per Group (SRS 4.7 open question)
   - defaulting to January (1) here; change per Group as needed. */
CREATE TABLE Administration.InvoiceSequence (
    GroupID              INT NOT NULL,
    FinancialYear        INT NOT NULL,           -- e.g. 2026
    LastSequence         INT NOT NULL DEFAULT 0,
    NumberFormat         NVARCHAR(50) NOT NULL DEFAULT 'INV-{YYYY}-{SEQ:6}',
    CONSTRAINT PK_InvoiceSequence PRIMARY KEY (GroupID, FinancialYear)
);
GO

ALTER TABLE Administration.Groups ADD FinancialYearStartMonth TINYINT NOT NULL DEFAULT 1;
GO
ALTER TABLE Administration.Groups ADD CurrencyCode NVARCHAR(3) NOT NULL DEFAULT 'LKR';
GO
