<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            $table->string('service_reference_normalisee')->nullable()->after('service_reference')->index();
        });
    }

    public function down(): void
    {
        Schema::table('factures', function (Blueprint $table) { $table->dropIndex(['service_reference_normalisee']); $table->dropColumn('service_reference_normalisee'); });
    }
};
