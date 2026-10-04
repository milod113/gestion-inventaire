<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('advanced_import_scans', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('files_count')->default(0);
            $table->unsignedInteger('ready_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->timestamps();
        });

        Schema::create('advanced_import_scan_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advanced_import_scan_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('name');
            $table->string('type')->default('inconnu');
            $table->string('status')->default('detecte');
            $table->string('file_hash', 64)->nullable()->index();
            $table->unsignedInteger('records')->default(0);
            $table->json('fields')->nullable();
            $table->string('error')->nullable();
            $table->timestamps();
            $table->unique(['advanced_import_scan_id', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('advanced_import_scan_files');
        Schema::dropIfExists('advanced_import_scans');
    }
};
