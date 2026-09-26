# Configurar el aviso automático de 24 hs (sin Firebase Blaze)

Este mecanismo corre en **GitHub Actions**, no en Firebase, así que **no
necesitás activar el plan Blaze ni cargar tarjeta en ningún lado**. Todos
los días a las 09:00 (hora Argentina) GitHub va a ejecutar
`automation/aviso24hs.js`, que lee tu Firestore y manda el WhatsApp por
CallMeBot — exactamente igual que la app, pero sin que tengas que abrirla.

Solo falta un paso de configuración (10 minutos, una sola vez):

## 1. Generar la cuenta de servicio de Firebase

1. Andá a la [consola de Firebase](https://console.firebase.google.com/project/gen-lang-client-0657155208/settings/serviceaccounts/adminsdk).
2. Pestaña **Cuentas de servicio** → botón **Generar nueva clave privada**.
3. Se descarga un archivo `.json` (algo como
   `gen-lang-client-0657155208-firebase-adminsdk-xxxxx.json`). **Guardalo
   en un lugar seguro y no lo subas nunca al repositorio** — le da acceso
   total a tu base de datos.

Esto es gratis y no requiere el plan Blaze; es distinto de las Cloud
Functions.

## 2. Convertirlo a Base64

GitHub Secrets solo acepta texto plano, así que hay que codificar el
JSON. Elegí el comando según tu sistema:

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\a\tu-archivo.json")) | Set-Clipboard
```
(esto copia el resultado directo al portapapeles)

**Mac / Linux:**
```bash
base64 -i tu-archivo.json | pbcopy   # Mac
base64 -w0 tu-archivo.json | xclip -selection clipboard   # Linux
```

## 3. Cargarlo como secreto en GitHub

1. Andá a `https://github.com/djtrocco/mardeltuyu/settings/secrets/actions`
2. **New repository secret**
3. Nombre: `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`
4. Valor: pegá el Base64 que copiaste en el paso 2.
5. **Add secret**.

## 4. Borrar el archivo .json local

Una vez cargado el secreto, borrá el archivo `.json` que descargaste en
el paso 1 de tu computadora (o guardalo fuera del repo, nunca dentro).

## 5. Probarlo

1. Andá a la pestaña **Actions** del repo:
   `https://github.com/djtrocco/mardeltuyu/actions/workflows/aviso-24hs.yml`
2. Botón **Run workflow** → **Run workflow** (esto lo dispara manualmente,
   sin esperar a las 9 AM).
3. Esperá ~30 segundos y hacé clic en la corrida para ver los logs.
   Si todo está bien vas a ver algo como:
   ```
   Resultado del despacho diario: { "despachado": true, "detalle": "WhatsApp enviado a +549..." }
   ```
   y te va a llegar el WhatsApp al celular en segundos.
4. Si no hay ingresos/egresos para mañana vas a ver
   `"motivo": "sin_movimientos_24hs"` — es normal, no es un error.

A partir de ahí corre solo, todos los días a las 09:00 hora Argentina,
sin que abras la app ni GitHub. Podés ver el historial de corridas en
cualquier momento en esa misma pestaña **Actions**.

## Cambiar el horario

Editá esta línea en `.github/workflows/aviso-24hs.yml`:

```yaml
- cron: '0 12 * * *'   # 12:00 UTC = 09:00 Argentina
```

El cron de GitHub Actions siempre es en UTC. Argentina está en UTC-3 todo
el año (no tiene horario de verano), así que restale 3 horas a la hora
que quieras en Argentina para calcular el valor UTC.
