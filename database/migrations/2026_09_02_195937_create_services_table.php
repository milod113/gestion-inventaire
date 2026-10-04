<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('code')->unique();
            $table->string('name')->unique();
            $table->timestamps();
        });

        DB::table('services')->insert([
            ['code' => 1, 'name' => 'DIRECTION GENERALE', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 2, 'name' => 'STUDIO 1/2/3/4/ Sce PSYCHIATRIE', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 3, 'name' => 'S:DIRECTION DES FINANCES/COMPTABILI', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 4, 'name' => 'S:DIRECTION DU PERSONNEL', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 5, 'name' => 'RECETTE HOPITAL', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 6, 'name' => 'BUREAU DES ENTREES', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
