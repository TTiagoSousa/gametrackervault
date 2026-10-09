Installer picks a release instead of a branch

### Features
- **deploy**: the installer's Version step offers the latest release (the newest vX.Y.Z, by default) or, for testing, the staging and develop branches; a fresh install starts from the same release that updates follow

### Improvements
- **deploy**: installing PostgreSQL no longer prints "pg_lsclusters: not found"
