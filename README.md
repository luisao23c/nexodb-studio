# NexoDB Studio

MVP funcional para construir módulos de datos, tablas físicas, formularios y vistas CRUD desde una interfaz web.

## Qué incluye

- Creación de módulos y tablas MySQL reales con prefijo protegido `nx_`.
- Campos de texto, texto largo, entero, decimal, booleano, fecha, fecha/hora y relación.
- Componentes configurables: input, email, textarea, número, fecha, checkbox, select y autocomplete.
- Relaciones entre módulos; el formulario carga las opciones del módulo relacionado.
- Selección de campos visibles en tabla, formulario y búsqueda.
- CRUD dinámico con validación generada desde los metadatos.
- Búsqueda, paginación, orden predeterminado, edición y eliminación con confirmación.
- Clave administrativa mediante el encabezado `X-Builder-Key`.

## Estructura

```text
nexodb-studio/
├── backend/    API Laravel 12 + MySQL
└── frontend/   React 19 + TypeScript + Vite
```

## Requisitos

- PHP 8.2 o superior con extensiones PDO MySQL, Mbstring y OpenSSL.
- Composer 2.
- Node.js 20 o superior.
- MySQL 8; opcionalmente Docker para levantarlo.

## Arranque

### 1. Base de datos

```bash
docker compose up -d mysql
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Si usas el `docker-compose.yml`, configura en `backend/.env`:

```env
DB_PORT=3307
DB_DATABASE=nexodb
DB_USERNAME=nexodb
DB_PASSWORD=nexodb_secret
BUILDER_ADMIN_KEY=una-clave-privada
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

En `frontend/.env`, `VITE_BUILDER_KEY` debe ser igual a `BUILDER_ADMIN_KEY`.

## Prueba recomendada

1. Crea el módulo **Roles** y agrega el campo `nombre` como texto obligatorio, visible y buscable.
2. Captura algunos roles desde la pestaña **Datos**.
3. Crea el módulo **Usuarios**.
4. Agrega `nombre`, `correo`, `activo` y una relación `id_rol` hacia **Roles**.
5. El formulario de Usuarios mostrará automáticamente el selector con los registros de Roles.

## Decisiones de seguridad

- El navegador nunca envía SQL.
- Los nombres físicos son normalizados y validados en Laravel.
- Sólo se permiten tipos de columna incluidos en una lista blanca.
- Todas las tablas generadas llevan el prefijo `nx_`.
- No se incluyó eliminación de tablas o columnas en el MVP para evitar pérdida accidental de datos.
- Para producción debe colocarse detrás de autenticación, HTTPS y permisos por usuario; la clave incluida es una barrera administrativa inicial, no sustituye un sistema completo de identidad.

## Límites actuales del MVP

- Una relación representa `belongsTo` mediante un campo ID. Las relaciones muchos-a-muchos serán la siguiente ampliación.
- Cambiar el tipo físico o nombre de una columna ya creada no está permitido desde la interfaz.
- El autocomplete inicial carga hasta 100 opciones. Para catálogos grandes conviene agregar búsqueda remota.
- La definición física y los metadatos se crean juntos, pero en MySQL las operaciones DDL pueden confirmar transacciones automáticamente; usa respaldos antes de evolucionar esquemas con datos reales.
