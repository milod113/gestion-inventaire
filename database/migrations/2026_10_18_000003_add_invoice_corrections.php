<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('factures', function (Blueprint $table) {
            // Valeurs importees d'origine des champs corriges, conservees a la premiere correction.
            $table->json('valeurs_origine')->nullable();
            $table->timestamp('corrigee_at')->nullable()->index();
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->string('motif', 600)->nullable()->after('new_values');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('motif');
        });

        Schema::table('factures', function (Blueprint $table) {
            $table->dropIndex(['corrigee_at']);
            $table->dropColumn(['valeurs_origine', 'corrigee_at']);
        });
    }
};
