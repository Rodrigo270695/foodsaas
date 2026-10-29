<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Roles de plataforma (`superadmin`, tenant_id null) requieren tenant_id null
 * en los pivots Spatie. El stub del paquete crea la columna NOT NULL y PK compuesta.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $this->relaxPivot('model_has_roles', 'model_has_roles_role_model_type_primary');
        $this->relaxPivot(
            'model_has_permissions',
            'model_has_permissions_permission_model_type_primary',
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $this->restorePivot(
            'model_has_roles',
            'model_has_roles_role_model_type_primary',
            'model_has_roles_tenant_role_model_unique',
            'role_id',
        );
        $this->restorePivot(
            'model_has_permissions',
            'model_has_permissions_permission_model_type_primary',
            'model_has_permissions_tenant_permission_model_unique',
            'permission_id',
        );
    }

    private function relaxPivot(string $table, string $primaryConstraint): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
            return;
        }

        $uniqueIndex = $table === 'model_has_roles'
            ? 'model_has_roles_tenant_role_model_unique'
            : 'model_has_permissions_tenant_permission_model_unique';

        $pivotColumn = $table === 'model_has_roles' ? 'role_id' : 'permission_id';

        $primaryName = $this->primaryConstraintName($table) ?? $primaryConstraint;

        DB::statement(sprintf(
            'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
            $this->quoteIdent($table),
            $this->quoteIdent($primaryName),
        ));

        DB::statement(sprintf(
            'ALTER TABLE %s ALTER COLUMN tenant_id DROP NOT NULL',
            $this->quoteIdent($table),
        ));

        DB::statement(sprintf(
            'CREATE UNIQUE INDEX IF NOT EXISTS %s ON %s (COALESCE(tenant_id::text, \'__central__\'), %s, model_id, model_type)',
            $this->quoteIdent($uniqueIndex),
            $this->quoteIdent($table),
            $this->quoteIdent($pivotColumn),
        ));
    }

    private function primaryConstraintName(string $table): ?string
    {
        $row = DB::selectOne(
            'select conname from pg_constraint where conrelid = ?::regclass and contype = ? limit 1',
            [$table, 'p'],
        );

        return $row?->conname;
    }

    private function restorePivot(
        string $table,
        string $primaryConstraint,
        string $uniqueIndex,
        string $pivotColumn,
    ): void {
        if (! Schema::hasTable($table)) {
            return;
        }

        DB::statement(sprintf(
            'DROP INDEX IF EXISTS %s',
            $this->quoteIdent($uniqueIndex),
        ));

        DB::table($table)->whereNull('tenant_id')->delete();

        DB::statement(sprintf(
            'ALTER TABLE %s ALTER COLUMN tenant_id SET NOT NULL',
            $this->quoteIdent($table),
        ));

        if ($this->primaryConstraintName($table) === null) {
            DB::statement(sprintf(
                'ALTER TABLE %s ADD CONSTRAINT %s PRIMARY KEY (tenant_id, %s, model_id, model_type)',
                $this->quoteIdent($table),
                $this->quoteIdent($primaryConstraint),
                $this->quoteIdent($pivotColumn),
            ));
        }
    }

    private function quoteIdent(string $ident): string
    {
        return '"'.str_replace('"', '""', $ident).'"';
    }
};
