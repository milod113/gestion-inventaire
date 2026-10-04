<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void { Schema::table('fournisseurs', function (Blueprint $table) { $table->string('source_hash', 64)->nullable()->unique()->after('code'); $table->foreignId('import_batch_id')->nullable()->after('id')->constrained()->nullOnDelete(); }); }
    public function down(): void { Schema::table('fournisseurs', function (Blueprint $table) { $table->dropForeign(['import_batch_id']); $table->dropUnique(['source_hash']); $table->dropColumn(['source_hash', 'import_batch_id']); }); }
};
