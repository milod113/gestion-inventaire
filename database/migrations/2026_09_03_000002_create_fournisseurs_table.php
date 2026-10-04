<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fournisseurs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('appellation');
            $table->text('adresse')->nullable();
            $table->text('rc_autres')->nullable();
            $table->text('cb_autres')->nullable();
            $table->string('telephone')->nullable();
            $table->string('telex')->nullable();
            $table->text('artv')->nullable();
            $table->text('observation')->nullable();
            $table->timestamps();

            $table->index('appellation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fournisseurs');
    }
};
