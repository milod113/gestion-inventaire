<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('n_bon')->nullable();
            $table->string('service_reference')->nullable();
            $table->string('imputation')->nullable();
            $table->string('n_journal')->nullable();
            $table->string('numero_facture')->nullable();
            $table->string('date_facture')->nullable();
            $table->decimal('montant', 15, 2)->nullable();
            $table->string('code_fournisseur')->nullable();
            $table->string('n_inventaire')->nullable();
            $table->string('cfac')->nullable();
            $table->string('n_mandat')->nullable();
            $table->string('date_mandat')->nullable();
            $table->timestamps();

            $table->index('service_id');
            $table->index('n_bon');
            $table->index('numero_facture');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factures');
    }
};
