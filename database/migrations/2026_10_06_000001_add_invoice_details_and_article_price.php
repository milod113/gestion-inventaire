<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->decimal('prix_unitaire', 15, 2)->nullable();
        });

        Schema::create('details_factures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facture_id')->constrained('factures')->restrictOnDelete();
            $table->foreignId('article_id')->unique()->constrained('articles')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('details_factures');
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('prix_unitaire');
        });
    }
};
