# Login + CRUD + Load Balancer Demo

Este laboratorio desarrolla una aplicacion web con `login`, `registro`, `CRUD de tareas` y `balanceo de carga`, primero en entorno local y luego en AWS.

## Tecnologias utilizadas

- `Node.js`
- `Express`
- `PostgreSQL`
- `JWT`
- `HTML`
- `CSS`
- `JavaScript`
- `Docker`
- `Docker Compose`
- `Nginx`

## Servicios de AWS utilizados

- `Amazon VPC`
- `Amazon EC2`
- `Amazon RDS PostgreSQL`
- `Application Load Balancer`
- `Target Group`
- `Security Groups`
- `Internet Gateway`
- `Route Tables`
- `Subnets`

## Arquitectura

### Entorno local

```text
Cliente -> Nginx:80 -> backend1/backend2/backend3 -> PostgreSQL
```

### Entorno nube

```text
Internet -> Application Load Balancer -> EC2 web-server-1 / web-server-2 -> RDS PostgreSQL
```

## Ejecucion Local

### Guia paso a paso

1. Ubicarse en la carpeta del proyecto.
2. Verificar que `Docker Desktop` este iniciado.
3. Ejecutar:

```bash
docker compose up --build
```

4. Abrir en el navegador:

```text
http://localhost
```

5. Registrar un usuario.
6. Iniciar sesion.
7. Crear, editar o eliminar tareas.
8. Presionar `Refrescar` para ver como cambia la instancia que responde.

### Comandos utiles en local

Levantar contenedores:

```bash
docker compose up --build
```

Levantar en segundo plano:

```bash
docker compose up --build -d
```

Detener sin eliminar:

```bash
docker compose stop
```

Volver a iniciar:

```bash
docker compose start
```

Apagar y eliminar contenedores:

```bash
docker compose down
```

Apagar y eliminar tambien volumenes:

```bash
docker compose down -v
```

### Balanceo en local

En local se usan:

- `Nginx` como balanceador
- `3 instancias` del backend:
  - `backend-1`
  - `backend-2`
  - `backend-3`
- `1 base de datos PostgreSQL` compartida

Esto permite que el login y el CRUD funcionen correctamente aunque cada solicitud llegue a una instancia diferente.

## Ejecucion Nube

### Guia paso a paso

#### 1. Crear la red

1. Crear una `VPC` propia:
   - Nombre: `semana07-vpc-vpc`
   - CIDR: `10.0.0.0/16`
2. Crear `2 subredes publicas`:
   - `semana07-public-subnet-1` en `us-east-1a`
   - `semana07-public-subnet-2` en `us-east-1b`
3. Habilitar `Auto-assign public IPv4` en ambas subredes.
4. Crear y asociar una `Internet Gateway`.
5. Crear una `Route Table` publica.
6. Agregar la ruta:

```text
0.0.0.0/0 -> Internet Gateway
```

7. Asociar la route table a las dos subredes publicas.

#### 2. Crear los Security Groups

Crear `alb-security-group`:

- Inbound:
  - `HTTP 80` desde `0.0.0.0/0`

Crear `ec2-security-group`:

- Inbound:
  - `SSH 22` desde `My IP`
  - `HTTP 80` desde `alb-security-group`
- Outbound:
  - `All traffic` hacia `0.0.0.0/0`

Crear `rds-postgres-sg`:

- Inbound:
  - `PostgreSQL 5432` desde `ec2-security-group`

#### 3. Crear las instancias EC2

Crear dos instancias:

- `web-server-1`
- `web-server-2`

Configuracion usada:

- AMI: `Amazon Linux 2023`
- Tipo: `t3.micro`
- VPC: `semana07-vpc-vpc`
- Subredes:
  - `web-server-1` -> `semana07-public-subnet-1`
  - `web-server-2` -> `semana07-public-subnet-2`
- IP publica habilitada
- Security group: `ec2-security-group`
- Key pair: `semana07-key.pem`

#### 4. Preparar las EC2

Conectarse por `SSH` a cada instancia y ejecutar:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
```

Luego salir y volver a entrar por SSH.

#### 5. Clonar el proyecto en cada EC2

```bash
git clone https://github.com/Strike32GT/Lab07_Semana07_FernandoMas_CloudComputing.git
cd Lab07_Semana07_FernandoMas_CloudComputing
```

#### 6. Crear la base de datos en RDS

Crear una instancia `RDS PostgreSQL` con esta idea general:

- DB identifier: `semana07-db`
- Usuario: `appuser`
- Base de datos inicial: `appdb`
- VPC: `semana07-vpc-vpc`
- Public access: `No`
- Security group: `rds-postgres-sg`

Endpoint usado:

```text
semana07-db.cwlcwmywsi8h.us-east-1.rds.amazonaws.com
```

Puerto:

```text
5432
```

#### 7. Configurar el archivo .env en las EC2

En `web-server-1`:

```env
PORT=8080
JWT_SECRET=super-secreto-cambiar
DB_HOST=semana07-db.cwlcwmywsi8h.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=TU_PASSWORD
DB_SSL=true
INSTANCE_NAME=web-server-1
```

En `web-server-2`:

```env
PORT=8080
JWT_SECRET=super-secreto-cambiar
DB_HOST=semana07-db.cwlcwmywsi8h.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=TU_PASSWORD
DB_SSL=true
INSTANCE_NAME=web-server-2
```

#### 8. Inicializar la base de datos

Desde `web-server-1`, ejecutar:

```bash
docker run --rm -it \
  -v "$PWD/sql:/sql" \
  postgres:16-alpine \
  psql "host=semana07-db.cwlcwmywsi8h.us-east-1.rds.amazonaws.com port=5432 dbname=appdb user=appuser password=TU_PASSWORD sslmode=require" \
  -f /sql/init.sql
```

#### 9. Construir y ejecutar la aplicacion en ambas EC2

En cada servidor:

```bash
docker build -t semana07-app .
docker run -d --name semana07-web --env-file .env -p 80:8080 semana07-app
```

Verificacion de salud:

```bash
curl http://localhost/api/health
```

Respuesta esperada:

```json
{"ok":true,"instance":"web-server-1"}
```

o

```json
{"ok":true,"instance":"web-server-2"}
```

#### 10. Crear el Target Group

Configuracion usada:

- Nombre: `semana07-tg`
- Tipo: `Instances`
- Protocolo: `HTTP`
- Puerto: `80`
- VPC: `semana07-vpc-vpc`
- Health check path: `/api/health`

Registrar:

- `web-server-1`
- `web-server-2`

#### 11. Crear el Application Load Balancer

Configuracion usada:

- Nombre: `semana07-alb`
- Tipo: `Application Load Balancer`
- Scheme: `Internet-facing`
- IP type: `IPv4`
- VPC: `semana07-vpc-vpc`
- Subredes:
  - `semana07-public-subnet-1`
  - `semana07-public-subnet-2`
- Security group: `alb-security-group`
- Listener: `HTTP 80`
- Target group por defecto: `semana07-tg`

#### 12. Probar la aplicacion balanceada

Cuando el ALB este activo y los targets salgan `Healthy`, abrir el DNS del balanceador:

```text
http://semana07-alb-2019606729.us-east-1.elb.amazonaws.com
```

Luego probar:

1. Registro
2. Login
3. CRUD de tareas
4. Boton `Refrescar`

Deberia alternarse entre:

- `web-server-1`
- `web-server-2`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/health`

## Resumen final

En entorno local se uso `Nginx` para balancear entre tres instancias del backend con una sola base de datos `PostgreSQL`.

En AWS se reemplazo esa arquitectura por:

- `Application Load Balancer`
- `2 instancias EC2`
- `1 base de datos compartida en RDS PostgreSQL`

Con esto se logro mantener el login y el CRUD funcionando correctamente aun cuando las solicitudes se distribuyen entre distintas instancias.
