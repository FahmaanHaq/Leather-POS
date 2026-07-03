# tSQLt install files (manual step required)

This folder needs two files before `database-tests.yml` will actually run:

1. Go to https://tsqlt.org/downloads/ and download the latest tSQLt release zip.
2. Extract it and copy these two files into this folder:
   - `tSQLt.class.sql`
   - `SetClrEnabled.sql`
3. Commit them to the repo.

Why this isn't automated: a CI workflow that silently downloads a third-party
SQL install script from a hardcoded URL is fragile (the URL can change, and a
failed silent download produces a confusing downstream error rather than a
clear one). Committing the files directly is more reliable and means the CI
behavior doesn't depend on an external site being up during your pipeline run.

You'll also need to add a GitHub Actions secret:
- Name: `CI_SQL_SA_PASSWORD`
- Value: any strong password (this is only used inside the disposable CI
  container, not your real Azure SQL database - it's not the same password
  as anything else in this project)

Until both files are added, `database-tests.yml` will fail at the
"Install tSQLt" step with a clear file-not-found error, rather than doing
anything silently wrong.
