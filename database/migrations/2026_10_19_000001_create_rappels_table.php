<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rappels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // auteur
            $table->foreignId('assigne_a')->constrained('users')->cascadeOnDelete();
            $table->text('texte');
            $table->date('echeance');
            $table->time('heure')->nullable();
            // Fiche liee (facture, article ou fournisseur), facultative.
            $table->nullableMorphs('rappelable');
            $table->timestamp('termine_at')->nullable();
            $table->foreignId('termine_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['assigne_a', 'termine_at', 'echeance']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rappels');
    }
};
