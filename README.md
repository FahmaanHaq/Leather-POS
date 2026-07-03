# Leather POS & Accounting System — Phase 1 Scaffold

Phase 1 per the SRS (§10.2): **Groups** (reused as-is from your existing MasterGroup
module — not rebuilt here), **Security & Permissions**, **Customer Management**,
**Item/UOM Management**, **Containers/Stock Intake**. Automation testing is wired
in at every layer per the earlier test-strategy discussion.

## What's in here

```
database/
  01_schema_phase1.sql        Tables for Security, Sales/Customers, Inventory schemas
  02_sp_security.sql          Roles, Users, Screens, RolePermissions SPs
  03_sp_customers.sql         Customer CRUD, statement, receivables ageing SPs
  04_sp_items_uom.sql         Item/UOM CRUD, bulk-import validation (TVP), low-stock SPs
  05_sp_containers.sql        Supplier/Container CRUD, transactional stock-in SP
  tests/tSQLt_Phase1_GuardTests.sql   tSQLt tests for every guard rule below

backend/
  LeatherPOS.Models/          POCOs + shared response wrapper + repository contract stub
  LeatherPOS.Services/        Interfaces + Implementations, one pair per module
  LeatherPOS.API/             Thin controllers + Program.cs DI wiring
  LeatherPOS.UnitTests/       xUnit + Moq tests for every service's result-code mapping
  LeatherPOS.IntegrationTests/  WebApplicationFactory-based API test (Customers sample)

frontend/
  src/modules/Customers/      Services.js, Pages/Listing.js, Pages/AddEdit.js
  src/modules/Security/Roles/ …
  src/modules/Security/Users/ …
  src/modules/Items/          … + Pages/BulkImport.js (Excel upload + preview grid)
  src/modules/Containers/     … dynamic line-item form (Formik FieldArray)
  src/common/                 Shared CustomTable, HttpHelper, tokenDecoder stubs
  src/__tests__/              Jest + RTL tests for the two highest-risk forms

azure-pipelines.yml           5-stage pipeline: unit → tSQLt → integration → Jest → smoke,
                               with Playwright E2E on a nightly schedule
```

## Business rules encoded (and tested) at each layer

| Rule | SQL guard | Service test | Frontend test |
|---|---|---|---|
| Walk-in customers can't carry credit terms (FR-CUS-05) | `Sales.SaveCustomer` → `-4` | ✅ `CustomerServiceTests` | ✅ `CustomerAddEdit.test.js` |
| Can't deactivate a role with active users | `Security.UpdateRole` → `-2` | ✅ `RoleServiceTests` | — |
| Can't deactivate a customer with a balance | `Sales.UpdateCustomer` → `-2` | ✅ `CustomerServiceTests` | — |
| Duplicate item code within a group (FR-ITM) | `Inventory.SaveItem` → `-1` | ✅ `ItemServiceTests` | ✅ `ItemAddEdit.test.js` |
| Fractional quantity precision, 3dp (FR-ITM-04) | `DECIMAL(18,3)` columns | — | ✅ `ItemAddEdit.test.js` |
| Container must have ≥1 line, transactional stock-in (FR-ITM-05) | `Inventory.SaveContainer` → `-5`/`-6` | ✅ `ContainerServiceTests` | Yup `.min(1, ...)` on `lines` |

## What's a stub vs. what's real

- **Real, ready to run once wired up:** all SQL (schema + SPs + tSQLt), all service
  logic, all controllers, all xUnit/Jest tests.
- **Stubbed intentionally** (because they live in your existing solution, not this
  one): `ILeatherPOSUnitOfWork`/`ILeatherPOSRepository` (→ your `IAgriGenERPUnitOfWork`),
  `LeatherPOSResponse` (→ your `AgriGenERPResponse`), `CommonGet`/`CommonPost`,
  `tokenDecoder`. Delete the stub, point the `using`/`import` at your real one, done.
- **One real gap to flag:** table-valued parameters (used by bulk item import and
  container stock-in) need `SqlDbType.Structured`, which sits outside the
  `System.Data.DbType` enum your existing `Dictionary<string, Tuple<...>>` pattern
  uses. I added two extra repository methods
  (`ExecuteSPWithTableValuedParameterAsync` / `GetEntitiesBySPWithTableValuedParameterAsync`)
  as the cleanest way to keep the rest of the convention untouched — you'll need to
  implement these two against your actual ADO.NET repository.

## Next steps to actually run this

1. **Database:** point SSMS at a dev DB, run `01`→`05` in order, then install tSQLt
   and run the test file.
2. **Backend:** copy `backend/*` into your real solution, delete the two stub files
   in `LeatherPOS.Models/Common/`, fix the `using` statements to your real
   `IAgriGenERPUnitOfWork`/`AgriGenERPResponse`, implement the two TVP repository
   methods, `dotnet restore && dotnet test LeatherPOS.UnitTests`.
3. **Frontend:** copy `frontend/src/modules/*` into your app, delete the stub
   `common/HttpHelper.js` and `common/tokenDecoder.js` in favor of your real ones,
   `npm install && npm test`.
4. **CI:** drop `azure-pipelines.yml` in your repo root, adjust the SQL Server
   agent/connection details for your actual Azure DevOps environment.

Groups/MasterGroup, Billing/POS, Payments, and the Accounting ledgers are Phase 2/3
per the SRS — not included here.
