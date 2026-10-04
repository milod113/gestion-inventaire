<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->string('date_facture_source')->nullable()->after('date_facture');
            $table->string('date_mandat_source')->nullable()->after('date_mandat');
            $table->unsignedInteger('source_row')->nullable()->unique()->after('date_mandat_source');
        });
    }

    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->dropUnique(['source_row']);
            $table->dropColumn(['date_facture_source', 'date_mandat_source', 'source_row']);
        });
    }
};
