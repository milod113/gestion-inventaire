<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('service_code_source')->nullable();
            $table->string('description');
            $table->string('mouvement', 10)->nullable();
            $table->date('date_mouvement')->nullable();
            $table->string('date_source')->nullable();
            $table->decimal('quantite_entree', 15, 3)->nullable();
            $table->decimal('quantite_sortie', 15, 3)->nullable();
            $table->string('numero_bon')->nullable();
            $table->text('observation')->nullable();
            $table->string('numero_inventaire')->nullable();
            $table->unsignedInteger('source_row')->nullable()->unique();
            $table->timestamps();

            $table->index('service_code_source');
            $table->index('description');
            $table->index('date_mouvement');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
