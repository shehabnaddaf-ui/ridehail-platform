# Database Migrations

This directory contains database migration files that should be run in order after the main schema files.

## Migration Order

1. Run main schemas first:
   ```bash
   psql -U postgres -d ridehail -f database/schema.sql
   psql -U postgres -d ridehail -f database/schema_nextgen.sql
   psql -U postgres -d ridehail -f database/schema_syria.sql
   psql -U postgres -d ridehail -f database/schema_vip.sql
   ```

2. Run migrations in order:
   ```bash
   psql -U postgres -d ridehail -f database/migrations/001_update_driver_rating_trigger.sql
   psql -U postgres -d ridehail -f database/migrations/002_add_request_id_tracking.sql
   psql -U postgres -d ridehail -f database/migrations/003_add_soft_delete.sql
   psql -U postgres -d ridehail -f database/migrations/004_add_pagination_support.sql
   ```

## Creating New Migrations

1. Create a new file with format: `XXX_description.sql`
2. Include both UP and DOWN migrations if possible
3. Test on development database first
4. Document any breaking changes

## Migration Tool (Future)

Consider using a migration tool like:
- node-pg-migrate
- Knex.js migrations
- Flyway
- Liquibase

This will provide:
- Automatic versioning
- Rollback support
- Migration history tracking
- Team collaboration
