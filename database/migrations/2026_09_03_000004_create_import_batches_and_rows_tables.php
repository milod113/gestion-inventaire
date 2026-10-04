<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('status')->default('previewed');
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('ready_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('conflict_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->unsignedInteger('imported_rows')->default(0);
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->timestamps();
        });

        Schema::create('import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('source_row');
            $table->string('source_hash', 64)->nullable()->index();
            $table->string('status');
            $table->json('payload')->nullable();
            $table->json('errors')->nullable();
            $table->timestamps();

            $table->unique(['import_batch_id', 'source_row']);
            $table->index(['import_batch_id', 'status']);
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->dropUnique(['source_row']);
            $table->index('source_row');
            $table->foreignId('import_batch_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('source_hash', 64)->nullable()->after('source_row')->unique();
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropForeign(['import_batch_id']);
            $table->dropUnique(['source_hash']);
            $table->dropIndex(['source_row']);
            $table->dropColumn(['import_batch_id', 'source_hash']);
            $table->unique('source_row');
        });

        Schema::dropIfExists('import_rows');
        Schema::dropIfExists('import_batches');
    }
};
