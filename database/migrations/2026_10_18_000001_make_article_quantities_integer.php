<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->unsignedInteger('quantite_entree')->nullable()->change();
            $table->unsignedInteger('quantite_sortie')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->decimal('quantite_entree', 15, 3)->nullable()->change();
            $table->decimal('quantite_sortie', 15, 3)->nullable()->change();
        });
    }
};
