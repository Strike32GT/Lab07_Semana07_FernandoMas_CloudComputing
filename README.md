# Login + CRUD + Load Balancer Demo

Este proyecto demuestra:

- Login y registro con `JWT`
- CRUD de tareas
- `Nginx` como balanceador `round robin`
- 3 instancias del backend
- Base de datos compartida `PostgreSQL`

## 1. Ejecutar localmente

```bash
docker compose up --build
```

Luego abre:

```text
http://localhost
```

## 2. Arquitectura local

```text
Cliente -> Nginx:80 -> backend1/backend2/backend3 -> PostgreSQL
```

La base compartida es importante para que el login y el CRUD funcionen igual aunque la solicitud
caiga en diferentes instancias.

## 3. Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/health`

## 4. Como demostrar el balanceo

1. Inicia sesion.
2. Crea varias tareas.
3. Usa el boton `Refrescar`.
4. Observa el campo `Instancia actual` o el `instance` del JSON de respuesta.

Veras alternarse `backend-1`, `backend-2` y `backend-3`.

## 5. Paso a AWS

La traduccion del entorno local al diagrama de AWS es:

- `Nginx` local se reemplaza por `Application Load Balancer`
- `backend1/backend2/backend3` se reemplaza por instancias `EC2`
- La base compartida debe mantenerse como una sola BD, idealmente `RDS PostgreSQL`
- El health check del balanceador debe apuntar a `GET /api/health`

## 6. Despliegue sugerido en AWS

1. Crear una `VPC`
2. Crear dos subredes publicas en distintas zonas
3. Crear un `Security Group` para el `ALB` permitiendo `HTTP 80`
4. Crear un `Security Group` para EC2 permitiendo trafico solo desde el `ALB`
5. Lanzar dos instancias `EC2`
6. Instalar Docker en ambas
7. Ejecutar solo la app en EC2
8. Usar una BD compartida, preferiblemente `RDS`
9. Crear un `Target Group` con health check a `/api/health`
10. Crear el `Application Load Balancer` y asociarlo al `Target Group`

## 7. Idea para la exposicion

Puedes explicarlo asi:

"La aplicacion usa autenticacion JWT para no depender de sesiones locales. Eso permite que
cualquier peticion pueda ser atendida por cualquier instancia. El CRUD funciona de forma
consistente porque todas las instancias comparten una misma base de datos. En local usamos Nginx
como balanceador round robin y en AWS usamos un Application Load Balancer."
