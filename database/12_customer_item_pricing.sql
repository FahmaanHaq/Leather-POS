/* =========================================================================
   Customer-specific item pricing memory (not in the original SRS - added
   per request): when a returning customer buys an item they've bought
   before, default the unit price to what they paid last time rather than
   the catalogue SellingPrice. Sourced directly from real invoice history,
   not a separate cache table, so it's always accurate and never drifts.
   ========================================================================= */

CREATE OR ALTER PROCEDURE Sales.GetCustomerItemLastPrice
    @CustomerID INT,
    @ItemID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Only completed/partially-returned invoices count as real purchase
    -- history (Status 2 or 4) - held (1) and fully-reversed (3) bills don't.
    SELECT TOP 1
        il.UnitPrice,
        il.Discount,
        i.InvoiceDate AS LastPurchaseDate,
        i.InvoiceNo AS LastInvoiceNo
    FROM Sales.InvoiceLines il
    JOIN Sales.Invoices i ON i.InvoiceID = il.InvoiceID
    WHERE i.CustomerID = @CustomerID
      AND il.ItemID = @ItemID
      AND i.Status IN (2, 4)
    ORDER BY i.InvoiceDate DESC, il.InvoiceLineID DESC;
END
GO
