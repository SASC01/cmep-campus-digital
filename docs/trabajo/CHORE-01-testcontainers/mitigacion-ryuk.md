# Mitigación de Ryuk en el equipo del desarrollador — CHORE-01

Preparado por el orquestador el 2026-09-24 a pedido del humano. **No lo ejecuta ningún agente: lo aplica el humano en su equipo.** Nada de esto cambia el repositorio.

## Por qué
Durante cada corrida del backend, Testcontainers levanta Ryuk (`testcontainers/ryuk:0.14.0`), el contenedor que borra los contenedores de la corrida al terminar. Ryuk publica su puerto sin `HostIp`, es decir, en todas las interfaces (`0.0.0.0` y `[::]`), tiene acceso a Docker, no pide autenticación y borra contenedores por etiqueta. Testcontainers 12.1 no permite ligarlo a `127.0.0.1` desde el código (revisión del Manager, M-01). El PostgreSQL de pruebas sí se liga a `127.0.0.1` desde el código (CHORE-01).

Estado del equipo leído el 2026-09-24 (solo lectura):
- Docker Desktop 4.48.0; `com.docker.backend.exe` en `C:\Program Files\Docker\Docker\resources\`.
- Dos reglas del firewall de Windows, `Docker Desktop Backend`, entrantes, **Allow**, perfil **Public**, habilitadas.
- Red activa `uacam5 2` en la categoría **Pública**.
- Sin pruebas corriendo, `com.docker.backend` escucha solo en `127.0.0.1` (5433, 7880, 7881, 9000, 9001).
- `%USERPROFILE%\.docker\daemon.json` contiene solo `builder` y `experimental`.

## Opción 1 (preferida): Docker Desktop publica en 127.0.0.1 por defecto
Hace que cualquier puerto publicado **sin IP explícita** (Ryuk incluido) se ligue a `127.0.0.1`. No afecta a los puertos que ya declaran IP (los de `infra/` ya usan `127.0.0.1`). Efecto secundario: ningún contenedor de ningún proyecto será alcanzable desde otra máquina de la red salvo que declare `0.0.0.0` a propósito.

1. Abre Docker Desktop → **Settings** (engrane) → **Docker Engine**.
2. En el JSON, agrega la clave `"ip": "127.0.0.1"` al nivel superior. Con el contenido actual queda así:
   ```json
   {
     "builder": {
       "gc": {
         "defaultKeepStorage": "20GB",
         "enabled": true
       }
     },
     "experimental": false,
     "ip": "127.0.0.1"
   }
   ```
3. Pulsa **Apply & restart**. Docker Desktop se reinicia y los contenedores de `campus-dev` se detienen (no tienen política de reinicio, DEC-09 de INFRA-01). Los datos se conservan en los volúmenes. Vuelve a levantarlos:
   ```powershell
   Set-Location infra
   docker compose up -d
   docker compose ps
   ```
4. Verifica durante una corrida (sección "Verificación"). Si Ryuk sigue apareciendo en `0.0.0.0` o `[::]`, esta opción **no aplica** en tu versión de Docker Desktop: quita la línea `"ip"`, pulsa **Apply & restart** y usa la opción 2.

Para revertir: quita la línea `"ip": "127.0.0.1"` y pulsa **Apply & restart**.

## Opción 2 (si la 1 no aplica): el firewall de Windows bloquea la entrada a Docker en el perfil Público
No cambia dónde escucha Ryuk; impide que otra máquina de una red **Pública** llegue a él. Las conexiones locales (`127.0.0.1` y las del propio equipo) no pasan por el firewall, así que las pruebas y el desarrollo no se ven afectados. Una regla **Block** tiene prioridad sobre las **Allow** existentes.

En **PowerShell como administrador**:
1. Revisa las reglas actuales:
   ```powershell
   Get-NetFirewallApplicationFilter -Program "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe" |
     Get-NetFirewallRule |
     Format-Table DisplayName, Direction, Profile, Action, Enabled -AutoSize
   ```
2. Agrega el bloqueo:
   ```powershell
   New-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas" `
     -Direction Inbound -Action Block -Profile Public `
     -Program "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
   ```
3. Comprueba que quedó activa:
   ```powershell
   Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas" |
     Format-Table DisplayName, Direction, Profile, Action, Enabled -AutoSize
   ```
Para revertir:
```powershell
Remove-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"
```
Nota: si alguna vez clasificas una red como **Privada** o de dominio, esta regla no la cubre (solo el perfil Público). Si reinstalas Docker Desktop en otra ruta, ajusta `-Program`.

## Verificación durante una corrida
Necesitas dos terminales de PowerShell.

**Terminal 1** (desde `backend/`), con infra levantado y Docker Desktop encendido:
```powershell
npm test
```

**Terminal 2**, en cuanto empiece la corrida (dura unos 20 s):
```powershell
$ids = (Get-Process com.docker.backend).Id
for ($i = 0; $i -lt 25; $i++) {
  docker ps --filter "label=org.testcontainers=true" --format "{{.Image}}  {{.Ports}}"
  Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $ids -contains $_.OwningProcess -and $_.LocalAddress -notin @('127.0.0.1', '::1') } |
    Format-Table LocalAddress, LocalPort -AutoSize
  Start-Sleep -Seconds 1
}
```

Resultado esperado:
- **Con la opción 1:** `docker ps` muestra `testcontainers/ryuk:0.14.0  127.0.0.1:NNNNN->8080/tcp` y `postgres:17.11-trixie  127.0.0.1:NNNNN->5432/tcp`, y la consulta de `Get-NetTCPConnection` no imprime nada (hoy, sin pruebas, tampoco imprime nada).
- **Con la opción 2:** `docker ps` muestra Ryuk en `0.0.0.0:NNNNN` (el PostgreSQL de pruebas, en `127.0.0.1`), y `Get-NetTCPConnection` muestra ese puerto de Ryuk fuera de loopback: es lo esperado, porque el bloqueo es del firewall. Para comprobar el bloqueo hace falta **otro equipo** en la misma red: `Test-NetConnection -ComputerName <IP de tu equipo> -Port <puerto de Ryuk>` debe dar `TcpTestSucceeded : False`. Desde tu propio equipo la prueba no sirve, porque las conexiones locales no pasan por el firewall.

Si con cualquiera de las dos opciones aparece un puerto de pruebas escuchando fuera de `127.0.0.1` y alcanzable desde otro equipo, la mitigación no está aplicada: no corras la suite en esa red.

## Resultado de la verificación del orquestador — 2026-09-24
Antes de correr la suite, el orquestador comprobó (solo lectura, salvo una sonda) el estado que el humano reportó como aplicado:
- **Opción 1:** `daemon.json` contiene `"ip": "127.0.0.1"`, pero **no aplica en Docker Desktop 4.48.0**. Sonda inofensiva: `docker run -d --rm -p 5432 postgres:17.11-trixie sleep 20` (sin ningún servicio escuchando dentro, borrado a los ~3 s). `docker port` mostró `0.0.0.0:49189` y `[::]:49189`, y `com.docker.backend` escuchó en `:::49189` fuera de loopback. Es decir, Docker Desktop ignora la IP por defecto del motor y Ryuk seguiría en todas las interfaces.
- **Opción 2:** **no está aplicada.** No existe la regla "Campus: bloquear entrada a Docker en redes publicas" ni ninguna regla de bloqueo sobre `com.docker.backend.exe`, ni en el almacén persistente ni en el activo. Solo están las dos reglas `Docker Desktop Backend` (entrantes, **Allow**, perfil **Public**). Causa probable: `New-NetFirewallRule` se ejecutó en una sesión de PowerShell sin privilegios de administrador.
- La red activa sigue siendo `uacam5 2`, categoría **Pública**, que el humano declaró no confiable.

**Consecuencia:** no se corre la suite. Se retoma cuando la regla de bloqueo exista y el orquestador la vea con `Get-NetFirewallRule`.

## Mitigación aplicada — 2026-09-24
El humano creó la regla en una PowerShell de administrador y quitó la línea `"ip"` de Docker Engine. El orquestador comprobó con `Get-NetFirewallRule` que la regla "Campus: bloquear entrada a Docker en redes publicas" existe (almacén persistente y activo), está **habilitada**, es **Inbound / Block / Public** y apunta a `C:\Program Files\Docker\Docker\resources\com.docker.backend.exe`. `daemon.json` ya no tiene `"ip"`. El humano da la mitigación por aplicada **sin prueba desde otro equipo**. Con esto se retoma la suite.

## Verificación durante una corrida — 2026-09-24 (orquestador)
Corrida de `npm test` en `backend/` (proceso propio, salida a `backend/tmp/orq-verificacion.log`), observando cada segundo `docker ps` y las escuchas de `com.docker.backend` fuera de loopback:
- **PostgreSQL de pruebas:** `postgres:17.11-trixie  127.0.0.1:32769->5432/tcp`: solo en `127.0.0.1` (ajuste M-01 del programador verificado en ejecución).
- **Ryuk:** `testcontainers/ryuk:0.14.0  0.0.0.0:32768->8080/tcp, [::]:32768->8080/tcp`; la única escucha fuera de loopback fue `:::32768`. Es lo esperado con la opción 2: el bloqueo lo hace la regla del firewall en el perfil Público.
- Resultado de la suite: 31 archivos, 330 pruebas en verde (19,7 s). A los 20 s de terminar, 0 contenedores de Testcontainers.
