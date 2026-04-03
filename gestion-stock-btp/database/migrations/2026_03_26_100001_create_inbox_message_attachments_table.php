<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inbox_message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inbox_message_id')->constrained()->onDelete('cascade');
            $table->string('filename');      // nom d'origine
            $table->string('path');           // chemin stockage (ex: inbox_attachments/xxx.pdf)
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0); // en octets
            $table->timestamps();

            $table->index('inbox_message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_message_attachments');
    }
};
