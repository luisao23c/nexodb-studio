<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Usuarios
        $usuarios = [
            ['nombre' => 'Admin Sistema', 'email' => 'admin@nexo.com', 'password' => Hash::make('password'), 'rol' => 'admin', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'María García', 'email' => 'maria@nexo.com', 'password' => Hash::make('password'), 'rol' => 'editor', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Carlos López', 'email' => 'carlos@nexo.com', 'password' => Hash::make('password'), 'rol' => 'viewer', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Ana Martínez', 'email' => 'ana@nexo.com', 'password' => Hash::make('password'), 'rol' => 'editor', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_usuarios')->insert($usuarios);

        // Clientes
        $clientes = [
            ['nombre' => 'Empresa Tech SA', 'email' => 'contacto@tech.com', 'rfc' => 'TEC010101AA1', 'telefono' => '5551234567', 'ciudad' => 'CDMX', 'estado' => 'Ciudad de México', 'limite_credito' => 500000, 'tipo' => 'vip', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Distribuidora Norte', 'email' => 'ventas@norte.com', 'rfc' => 'DIS020202BB2', 'telefono' => '5559876543', 'ciudad' => 'Monterrey', 'estado' => 'Nuevo León', 'limite_credito' => 200000, 'tipo' => 'mayorista', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Comercializadora Sur', 'email' => 'info@sur.com', 'rfc' => 'COM030303CC3', 'telefono' => '5550001122', 'ciudad' => 'Guadalajara', 'estado' => 'Jalisco', 'limite_credito' => 100000, 'tipo' => 'regular', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Mayorista Central', 'email' => 'mayor@central.com', 'rfc' => 'MAY040404DD4', 'telefono' => '5553334455', 'ciudad' => 'Puebla', 'estado' => 'Puebla', 'limite_credito' => 350000, 'tipo' => 'mayorista', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Tienda Online Express', 'email' => 'web@express.com', 'rfc' => null, 'telefono' => '5556667788', 'ciudad' => 'CDMX', 'estado' => null, 'limite_credito' => 0, 'tipo' => 'regular', 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_clientes')->insert($clientes);

        // Proveedores
        $proveedores = [
            ['nombre' => 'Samsung Electronics', 'contacto' => 'Juan Pérez', 'email' => 'juan@samsung.com', 'telefono' => '5551112233', 'sitio_web' => null, 'calificacion' => 4.8, 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Apple Distribution', 'contacto' => 'Laura Díaz', 'email' => 'laura@apple.com', 'telefono' => '5552223344', 'sitio_web' => null, 'calificacion' => 4.9, 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Xiaomi LATAM', 'contacto' => 'Pedro Ruiz', 'email' => 'pedro@xiaomi.com', 'telefono' => '5554445566', 'sitio_web' => null, 'calificacion' => 4.3, 'activo' => true, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_proveedores')->insert($proveedores);

        // Categorías (self-referencing FK)
        $cats = [
            ['nombre' => 'Electrónica', 'slug' => 'electronica', 'categoria_padre_id' => null, 'orden' => 1, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Smartphones', 'slug' => 'smartphones', 'categoria_padre_id' => 1, 'orden' => 1, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Laptops', 'slug' => 'laptops', 'categoria_padre_id' => 1, 'orden' => 2, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Accesorios', 'slug' => 'accesorios', 'categoria_padre_id' => 1, 'orden' => 3, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Hogar', 'slug' => 'hogar', 'categoria_padre_id' => null, 'orden' => 2, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Audio', 'slug' => 'audio', 'categoria_padre_id' => 5, 'orden' => 1, 'activa' => true, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_categorias')->insert($cats);

        // Productos
        $productos = [
            ['nombre' => 'iPhone 15 Pro Max', 'sku' => 'APL-IP15PM-256', 'descripcion' => null, 'precio' => 29999, 'precio_costo' => 18500, 'stock' => 45, 'stock_minimo' => 10, 'peso_kg' => 0.221, 'impuesto' => 16, 'disponible' => true, 'destacado' => true, 'fecha_lanzamiento' => '2024-09-20', 'fecha_actualizacion' => null, 'metadatos' => '{"color":"Titanium","ram":"8GB"}', 'etiquetas' => null, 'categoria_id' => 2, 'proveedor_id' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Samsung Galaxy S24 Ultra', 'sku' => 'SAM-GS24U-256', 'descripcion' => null, 'precio' => 27999, 'precio_costo' => 16800, 'stock' => 62, 'stock_minimo' => 15, 'peso_kg' => 0.232, 'impuesto' => 16, 'disponible' => true, 'destacado' => true, 'fecha_lanzamiento' => '2024-01-25', 'fecha_actualizacion' => null, 'metadatos' => '{"color":"Negro","ram":"12GB"}', 'etiquetas' => null, 'categoria_id' => 2, 'proveedor_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'MacBook Pro 14"', 'sku' => 'APL-MBP14-M3', 'descripcion' => null, 'precio' => 44999, 'precio_costo' => 28000, 'stock' => 18, 'stock_minimo' => 5, 'peso_kg' => 1.55, 'impuesto' => 16, 'disponible' => true, 'destacado' => false, 'fecha_lanzamiento' => '2024-01-01', 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 3, 'proveedor_id' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Xiaomi Redmi Note 13', 'sku' => 'XIA-RN13-128', 'descripcion' => null, 'precio' => 5499, 'precio_costo' => 3200, 'stock' => 120, 'stock_minimo' => 30, 'peso_kg' => 0.188, 'impuesto' => 16, 'disponible' => true, 'destacado' => false, 'fecha_lanzamiento' => '2024-02-01', 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 2, 'proveedor_id' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Audífonos Sony WH-1000XM5', 'sku' => 'SONY-WH1000', 'descripcion' => null, 'precio' => 7999, 'precio_costo' => 4500, 'stock' => 35, 'stock_minimo' => 10, 'peso_kg' => 0.250, 'impuesto' => 16, 'disponible' => true, 'destacado' => true, 'fecha_lanzamiento' => '2023-05-01', 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 6, 'proveedor_id' => null, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Cable USB-C a Lightning', 'sku' => 'ACC-USBC-LTN', 'descripcion' => null, 'precio' => 299, 'precio_costo' => 85, 'stock' => 500, 'stock_minimo' => 100, 'peso_kg' => 0.035, 'impuesto' => 16, 'disponible' => true, 'destacado' => false, 'fecha_lanzamiento' => null, 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 4, 'proveedor_id' => null, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Funda iPhone 15 Pro', 'sku' => 'ACC-FUND-IP15', 'descripcion' => null, 'precio' => 499, 'precio_costo' => 120, 'stock' => 200, 'stock_minimo' => 50, 'peso_kg' => 0.050, 'impuesto' => 16, 'disponible' => true, 'destacado' => false, 'fecha_lanzamiento' => null, 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 4, 'proveedor_id' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['nombre' => 'Parlante JBL Flip 6', 'sku' => 'JBL-FLIP6', 'descripcion' => null, 'precio' => 2499, 'precio_costo' => 1400, 'stock' => 40, 'stock_minimo' => 10, 'peso_kg' => 0.550, 'impuesto' => 16, 'disponible' => true, 'destacado' => false, 'fecha_lanzamiento' => '2023-06-01', 'fecha_actualizacion' => null, 'metadatos' => null, 'etiquetas' => null, 'categoria_id' => 6, 'proveedor_id' => null, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_productos')->insert($productos);

        // Órdenes
        $ordenes = [
            ['folio' => 'ORD-2024-001', 'cliente_id' => 1, 'vendedor_id' => 2, 'estado' => 'entregada', 'subtotal' => 57998, 'impuestos' => 9279.68, 'descuento' => 0, 'total' => 67277.68, 'moneda' => 'MXN', 'notas' => null, 'fecha_entrega_estimada' => '2024-10-15', 'factura_id' => null, 'created_at' => $now, 'updated_at' => $now],
            ['folio' => 'ORD-2024-002', 'cliente_id' => 2, 'vendedor_id' => 4, 'estado' => 'procesando', 'subtotal' => 15999, 'impuestos' => 2559.84, 'descuento' => 0, 'total' => 18558.84, 'moneda' => 'MXN', 'notas' => null, 'fecha_entrega_estimada' => '2024-11-01', 'factura_id' => null, 'created_at' => $now, 'updated_at' => $now],
            ['folio' => 'ORD-2024-003', 'cliente_id' => 3, 'vendedor_id' => 2, 'estado' => 'pendiente', 'subtotal' => 44999, 'impuestos' => 7199.84, 'descuento' => 0, 'total' => 52198.84, 'moneda' => 'MXN', 'notas' => null, 'fecha_entrega_estimada' => null, 'factura_id' => null, 'created_at' => $now, 'updated_at' => $now],
            ['folio' => 'ORD-2024-004', 'cliente_id' => 1, 'vendedor_id' => null, 'estado' => 'enviada', 'subtotal' => 8297, 'impuestos' => 1327.52, 'descuento' => 0, 'total' => 9624.52, 'moneda' => 'MXN', 'notas' => null, 'fecha_entrega_estimada' => null, 'factura_id' => null, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_ordenes')->insert($ordenes);

        // Items de órdenes
        $items = [
            ['orden_id' => 1, 'producto_id' => 1, 'cantidad' => 1, 'precio_unitario' => 29999, 'subtotal' => 29999, 'created_at' => $now, 'updated_at' => $now],
            ['orden_id' => 1, 'producto_id' => 6, 'cantidad' => 2, 'precio_unitario' => 299, 'subtotal' => 598, 'created_at' => $now, 'updated_at' => $now],
            ['orden_id' => 2, 'producto_id' => 2, 'cantidad' => 1, 'precio_unitario' => 27999, 'subtotal' => 27999, 'created_at' => $now, 'updated_at' => $now],
            ['orden_id' => 3, 'producto_id' => 3, 'cantidad' => 1, 'precio_unitario' => 44999, 'subtotal' => 44999, 'created_at' => $now, 'updated_at' => $now],
            ['orden_id' => 4, 'producto_id' => 5, 'cantidad' => 1, 'precio_unitario' => 7999, 'subtotal' => 7999, 'created_at' => $now, 'updated_at' => $now],
            ['orden_id' => 4, 'producto_id' => 7, 'cantidad' => 1, 'precio_unitario' => 499, 'subtotal' => 499, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_ordenes_items')->insert($items);

        // Facturas
        $facturas = [
            ['uuid' => '550e8400-e29b-41d4-a716-446655440001', 'folio' => 'FAC-2024-001', 'cliente_id' => 1, 'orden_id' => 1, 'estado' => 'pagada', 'subtotal' => 57998, 'impuestos' => 9279.68, 'total' => 67277.68, 'fecha_emision' => '2024-10-10', 'fecha_vencimiento' => '2024-11-10', 'observaciones' => null, 'created_at' => $now, 'updated_at' => $now],
            ['uuid' => '550e8400-e29b-41d4-a716-446655440002', 'folio' => 'FAC-2024-002', 'cliente_id' => 2, 'orden_id' => 2, 'estado' => 'emitida', 'subtotal' => 15999, 'impuestos' => 2559.84, 'total' => 18558.84, 'fecha_emision' => '2024-10-25', 'fecha_vencimiento' => '2024-11-25', 'observaciones' => null, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_facturas')->insert($facturas);

        // Pagos
        $pagos = [
            ['factura_id' => 1, 'cliente_id' => 1, 'monto' => 67277.68, 'metodo' => 'transferencia', 'referencia' => 'TRF-887123', 'fecha_pago' => '2024-10-12', 'notas' => null, 'registrado_por' => 1, 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_pagos')->insert($pagos);

        // Configuración
        $configs = [
            ['grupo' => 'general', 'clave' => 'nombre_empresa', 'valor' => 'NexoDB Store', 'created_at' => $now, 'updated_at' => $now],
            ['grupo' => 'general', 'clave' => 'moneda_default', 'valor' => 'MXN', 'created_at' => $now, 'updated_at' => $now],
            ['grupo' => 'facturacion', 'clave' => 'iva_porcentaje', 'valor' => '16', 'created_at' => $now, 'updated_at' => $now],
            ['grupo' => 'inventario', 'clave' => 'alerta_stock_minimo', 'valor' => 'true', 'created_at' => $now, 'updated_at' => $now],
        ];
        DB::table('nx_configuracion')->insert($configs);

        // Bitácora
        $bitacora = [
            ['usuario_id' => 1, 'accion' => 'create', 'modelo' => 'Producto', 'modelo_id' => 1, 'datos_antes' => null, 'datos_despues' => null, 'ip' => '192.168.1.1', 'user_agent' => null, 'created_at' => $now],
            ['usuario_id' => 2, 'accion' => 'update', 'modelo' => 'Orden', 'modelo_id' => 1, 'datos_antes' => '{"estado":"pendiente"}', 'datos_despues' => '{"estado":"procesando"}', 'ip' => '192.168.1.2', 'user_agent' => null, 'created_at' => $now],
            ['usuario_id' => 1, 'accion' => 'create', 'modelo' => 'Cliente', 'modelo_id' => 1, 'datos_antes' => null, 'datos_despues' => null, 'ip' => '192.168.1.1', 'user_agent' => null, 'created_at' => $now],
        ];
        DB::table('nx_bitacora')->insert($bitacora);
    }
}
