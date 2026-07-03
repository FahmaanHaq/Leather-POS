/* =========================================================================
   Phase 2 screens + permission grandfather clause (same pattern as Phase 1's
   07_gap_closure.sql - safe to re-run, only inserts missing rows)
   ========================================================================= */

INSERT INTO Security.Screens (ScreenName, RouteKey, DisplayOrder, CreatedBy)
SELECT v.ScreenName, v.RouteKey, v.DisplayOrder, 1
FROM (VALUES
    ('Billing',        'billing',       9),
    ('Invoices',       'invoices',      10),
    ('Cheque Register','chequeregister',11),
    ('Cash Register',  'cashregister',  12),
    ('Card Settlement','cardsettlement',13)
) AS v(ScreenName, RouteKey, DisplayOrder)
WHERE NOT EXISTS (SELECT 1 FROM Security.Screens s WHERE s.RouteKey = v.RouteKey);
GO

INSERT INTO Security.RolePermissions (GroupID, RoleID, ScreenID, CanView, CanAdd, CanEdit, CanDelete, CanExport, CanApprove, CreatedBy, CreatedDate)
SELECT r.GroupID, r.RoleID, s.ScreenID, 1, 1, 1, 1, 1, 1, 1, GETDATE()
FROM Security.Roles r
CROSS JOIN Security.Screens s
WHERE NOT EXISTS (
    SELECT 1 FROM Security.RolePermissions rp WHERE rp.RoleID = r.RoleID AND rp.ScreenID = s.ScreenID
);
GO
