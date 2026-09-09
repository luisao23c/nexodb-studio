# NexoDB Studio

Workbench visual para administrar bases MySQL desde React y Laravel, con operaciones protegidas para tablas con prefijo `nx_`.

## Funciones

- Resumen de tamaño, filas, actividad y tablas.
- Creación, renombrado, vaciado y eliminación confirmada de tablas.
- Gestión de columnas, índices y llaves foráneas.
- Alta, edición, búsqueda, paginación y eliminación de registros.
- Importación CSV y exportación CSV, JSON o SQL.
- Consola SQL de sólo lectura con autocompletado.
- Diagrama ER generado desde las llaves foráneas reales de MySQL.
- Roles y permisos por tabla física.
- Gráficas conectadas directamente a columnas de tablas.
- Menús, rutas y páginas personalizadas.
- Auditoría de operaciones administrativas.

La capa anterior de “Módulos y datos” fue retirada. Las tablas físicas son ahora la única fuente de verdad.

## Estructura

```text
nexodb-studio/
├── backend/    API Laravel 12 + MySQL
└── frontend/   React 19 + TypeScript + Vite
```

## Requisitos

- PHP 8.2 o superior con PDO MySQL, Mbstring y OpenSSL.
- Composer 2.
- Node.js 20 o superior.
- MySQL 8.

## Arranque

```bash
cp .env.example .env
docker compose up -d mysql

cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

`VITE_BUILDER_KEY` debe coincidir con `BUILDER_ADMIN_KEY`.

## Seguridad

- Las mutaciones de esquema y datos sólo aceptan tablas `nx_` existentes.
- Los identificadores se validan antes de usarse en DDL.
- La consola sólo permite `SELECT`, `SHOW`, `DESCRIBE` y `EXPLAIN`.
- Las operaciones sensibles quedan registradas en auditoría.
- La clave administrativa es una barrera inicial; producción debe usar autenticación, HTTPS y autorización por usuario.
