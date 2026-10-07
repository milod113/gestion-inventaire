<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = ['articles', 'factures', 'fournisseurs', 'services'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->string('source', 10)->default('saisie')->index();
            });
            // Tout ce qui existe au moment de cette migration provient de l'import initial.
            DB::table($table)->update(['source' => 'import']);
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('source');
            });
        }
    }
};
