<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropUnique(['source_row']);
            $table->index('source_row');
            $table->foreignId('import_batch_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('source_hash', 64)->nullable()->after('source_row')->unique();
        });
    }

    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropForeign(['import_batch_id']);
            $table->dropUnique(['source_hash']);
            $table->dropIndex(['source_row']);
            $table->dropColumn(['import_batch_id', 'source_hash']);
            $table->unique('source_row');
        });
    }
};
