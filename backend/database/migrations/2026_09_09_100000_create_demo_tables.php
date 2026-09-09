<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // nx_usuarios — Usuarios del sistema
        Schema::create('nx_usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('email', 150)->unique();
            $table->string('password');
            $table->string('telefono', 20)->nullable();
            $table->string('avatar_url')->nullable();
            $table->enum('rol', ['admin', 'editor', 'viewer'])->default('viewer');
            $table->boolean('activo')->default(true);
            $table->timestamp('ultimo_login')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // nx_clientes — Clientes
        Schema::create('nx_clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            $table->string('email', 150)->unique();
            $table->string('rfc', 13)->nullable()->unique();
            $table->string('telefono', 20)->nullable();
            $table->string('direccion')->nullable();
            $table->string('ciudad', 80)->nullable();
            $table->string('estado', 80)->nullable();
            $table->string('cp', 10)->nullable();
            $table->decimal('limite_credito', 12, 2)->default(0);
            $table->enum('tipo', ['regular', 'vip', 'mayorista'])->default('regular');
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // nx_proveedores
        Schema::create('nx_proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            $table->string('contacto', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('sitio_web')->nullable();
            $table->decimal('calificacion', 3, 1)->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        // nx_categorias — Categorías de productos
        Schema::create('nx_categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 80);
            $table->string('slug', 100)->unique();
            $table->text('descripcion')->nullable();
            $table->unsignedBigInteger('categoria_padre_id')->nullable();
            $table->foreign('categoria_padre_id')->references('id')->on('nx_categorias')->nullOnDelete();
            $table->integer('orden')->default(0);
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });

        // nx_productos — Productos con todos los tipos de campo
        Schema::create('nx_productos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 200);
            $table->string('sku', 50)->unique();
            $table->text('descripcion')->nullable();
            $table->decimal('precio', 10, 2);
            $table->decimal('precio_costo', 10, 2)->nullable();
            $table->integer('stock')->default(0);
            $table->integer('stock_minimo')->default(5);
            $table->decimal('peso_kg', 8, 3)->nullable();
            $table->decimal('impuesto', 5, 2)->default(16.00);
            $table->boolean('disponible')->default(true);
            $table->boolean('destacado')->default(false);
            $table->date('fecha_lanzamiento')->nullable();
            $table->datetime('fecha_actualizacion')->nullable();
            $table->json('metadatos')->nullable();
            $table->json('etiquetas')->nullable();
            $table->unsignedBigInteger('categoria_id');
            $table->unsignedBigInteger('proveedor_id')->nullable();
            $table->foreign('categoria_id')->references('id')->on('nx_categorias');
            $table->foreign('proveedor_id')->references('id')->on('nx_proveedores')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('destacado');
            $table->index(['categoria_id', 'disponible']);
        });

        // nx_inventario — Movimientos de inventario
        Schema::create('nx_inventario', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('producto_id');
            $table->enum('tipo_movimiento', ['entrada', 'salida', 'ajuste', 'devolucion']);
            $table->integer('cantidad');
            $table->decimal('costo_unitario', 10, 2)->nullable();
            $table->text('observaciones')->nullable();
            $table->unsignedBigInteger('usuario_id');
            $table->foreign('producto_id')->references('id')->on('nx_productos');
            $table->foreign('usuario_id')->references('id')->on('nx_usuarios');
            $table->timestamps();

            $table->index(['producto_id', 'created_at']);
        });

        // nx_ordenes — Órdenes de compra
        Schema::create('nx_ordenes', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 30)->unique();
            $table->unsignedBigInteger('cliente_id');
            $table->unsignedBigInteger('vendedor_id')->nullable();
            $table->enum('estado', ['pendiente', 'procesando', 'enviada', 'entregada', 'cancelada'])->default('pendiente');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('impuestos', 12, 2)->default(0);
            $table->decimal('descuento', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('moneda', 3)->default('MXN');
            $table->text('notas')->nullable();
            $table->date('fecha_entrega_estimada')->nullable();
            $table->unsignedBigInteger('factura_id')->nullable();
            $table->foreign('cliente_id')->references('id')->on('nx_clientes');
            $table->foreign('vendedor_id')->references('id')->on('nx_usuarios')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('estado');
            $table->index(['cliente_id', 'created_at']);
        });

        // nx_ordenes_items — Detalle de órdenes
        Schema::create('nx_ordenes_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('orden_id');
            $table->unsignedBigInteger('producto_id');
            $table->integer('cantidad');
            $table->decimal('precio_unitario', 10, 2);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();

            $table->foreign('orden_id')->references('id')->on('nx_ordenes')->cascadeOnDelete();
            $table->foreign('producto_id')->references('id')->on('nx_productos');

            $table->unique(['orden_id', 'producto_id']);
        });

        // nx_facturas
        Schema::create('nx_facturas', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 36)->unique();
            $table->string('folio', 30)->unique();
            $table->unsignedBigInteger('cliente_id');
            $table->unsignedBigInteger('orden_id');
            $table->enum('estado', ['borrador', 'emitida', 'pagada', 'cancelada'])->default('borrador');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('impuestos', 12, 2);
            $table->decimal('total', 12, 2);
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento');
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('cliente_id')->references('id')->on('nx_clientes');
            $table->foreign('orden_id')->references('id')->on('nx_ordenes');

            $table->index('estado');
        });

        // nx_pagos
        Schema::create('nx_pagos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('factura_id');
            $table->unsignedBigInteger('cliente_id');
            $table->decimal('monto', 12, 2);
            $table->enum('metodo', ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque']);
            $table->string('referencia', 100)->nullable();
            $table->date('fecha_pago');
            $table->text('notas')->nullable();
            $table->unsignedBigInteger('registrado_por');
            $table->timestamps();

            $table->foreign('factura_id')->references('id')->on('nx_facturas');
            $table->foreign('cliente_id')->references('id')->on('nx_clientes');
            $table->foreign('registrado_por')->references('id')->on('nx_usuarios');

            $table->index(['factura_id', 'fecha_pago']);
        });

        // nx_configuracion — Configuración del sistema
        Schema::create('nx_configuracion', function (Blueprint $table) {
            $table->id();
            $table->string('grupo', 50);
            $table->string('clave', 100);
            $table->text('valor')->nullable();
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->unique(['grupo', 'clave']);
        });

        // nx_bitacora — Bitácora de auditoría
        Schema::create('nx_bitacora', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id')->nullable();
            $table->string('accion', 50);
            $table->string('modelo', 100);
            $table->unsignedBigInteger('modelo_id')->nullable();
            $table->json('datos_antes')->nullable();
            $table->json('datos_despues')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('usuario_id')->references('id')->on('nx_usuarios')->nullOnDelete();

            $table->index(['modelo', 'modelo_id']);
            $table->index('created_at');
        });

        // Vincular factura_id en órdenes (FK pendiente)
        Schema::table('nx_ordenes', function (Blueprint $table) {
            $table->foreign('factura_id')->references('id')->on('nx_facturas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nx_bitacora');
        Schema::dropIfExists('nx_configuracion');
        Schema::dropIfExists('nx_pagos');
        Schema::dropIfExists('nx_facturas');
        Schema::dropIfExists('nx_ordenes_items');
        Schema::dropIfExists('nx_ordenes');
        Schema::dropIfExists('nx_inventario');
        Schema::dropIfExists('nx_productos');
        Schema::dropIfExists('nx_categorias');
        Schema::dropIfExists('nx_proveedores');
        Schema::dropIfExists('nx_clientes');
        Schema::dropIfExists('nx_usuarios');
    }
};
