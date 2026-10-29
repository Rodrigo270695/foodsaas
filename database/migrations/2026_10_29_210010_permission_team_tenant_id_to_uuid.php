<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * tenants.id es UUID; Spatie teams usaba bigint en tenant_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (['model_has_roles', 'model_has_permissions'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }

            DB::statement('DROP INDEX IF EXISTS "'.($table === 'model_has_roles'
                ? 'model_has_roles_tenant_role_model_unique'
                : 'model_has_permissions_tenant_permission_model_unique').'"');

            DB::statement('ALTER TABLE "'.$table.'" ALTER COLUMN tenant_id DROP NOT NULL');
            DB::statement('ALTER TABLE "'.$table.'" ALTER COLUMN tenant_id TYPE uuid USING NULL');
        }

        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'tenant_id')) {
            DB::statement('DROP INDEX IF EXISTS roles_team_foreign_key_index');
            // unique (tenant_id, name, guard_name) — nombre puede variar
            DB::statement("
                DO $$
                DECLARE r record;
                BEGIN
                    FOR r IN
                        SELECT conname FROM pg_constraint
                        WHERE conrelid = 'roles'::regclass AND contype = 'u'
                    LOOP
                        EXECUTE format('ALTER TABLE roles DROP CONSTRAINT IF EXISTS %I', r.conname);
                    END LOOP;
                END $$;
            ");

            DB::statement('ALTER TABLE roles ALTER COLUMN tenant_id TYPE uuid USING NULL');

            DB::statement('CREATE UNIQUE INDEX roles_tenant_name_guard_unique ON roles (tenant_id, name, guard_name)');
        }

        if (Schema::hasTable('model_has_roles')) {
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS model_has_roles_tenant_role_model_unique '
                ."ON model_has_roles (COALESCE(tenant_id::text, '__central__'), role_id, model_id, model_type)",
            );
        }

        if (Schema::hasTable('model_has_permissions')) {
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS model_has_permissions_tenant_permission_model_unique '
                ."ON model_has_permissions (COALESCE(tenant_id::text, '__central__'), permission_id, model_id, model_type)",
            );
        }
    }

    public function down(): void
    {
        // No revertir: perdería coherencia con tenants UUID.
    }
};
