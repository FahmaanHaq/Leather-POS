# tSQLt install files

`tSQLt.class.sql` and `PrepareServer.sql` are the official pre-built tSQLt
V1.0.8083.3529 distributable (from tsqlt.org), committed here so the
`database-tests.yml` CI workflow doesn't depend on fetching anything from an
external site at run time.

Note the actual filename is `PrepareServer.sql` (not `SetClrEnabled.sql` as
an earlier version of this README incorrectly assumed before the real
package was available to check).

If you ever need to upgrade tSQLt, download the new release from
https://tsqlt.org/downloads/ and replace both files here.
