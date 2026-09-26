# Cómo desplegar el aviso automático de 24 hs (servidor)

Este es el fix real al problema: "el aviso solo me llega si abro la app".
La función `avisoDiarioAvisos24hs` corre en los servidores de Google
(Cloud Scheduler + Cloud Functions), no en tu celular, así que te va a
avisar todos los días a las 09:00 (hora Argentina) sin que tengas que
abrir nada.

## 0. Requisito: plan Blaze (pago por uso)

Las funciones programadas (Cloud Scheduler) requieren el plan **Blaze**
de Firebase (el plan gratuito Spark no las permite). Para este uso
—una función que corre 1 vez por día y hace 1-2 lecturas de Firestore—
el costo mensual es, en la práctica, **$0** (muy por debajo de la capa
gratuita del plan Blaze).

1. Andá a https://console.firebase.google.com/project/gen-lang-client-0657155208/usage/details
2. "Modificar plan" → elegí **Blaze**.

## 1. Instalar Firebase CLI (si no la tenés)

```bash
npm install -g firebase-tools
```

## 2. Login

```bash
firebase login
```

Esto abre el navegador para que inicies sesión con la cuenta de Google
dueña del proyecto `gen-lang-client-0657155208`.

## 3. Ubicarte en la raíz del repo y desplegar

Desde la carpeta raíz del proyecto (donde está `firebase.json`, que ya
viene incluido):

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Vas a ver algo como:

```
✔  functions[avisoDiario24hs(us-central1)] Successful create operation.
✔  functions[testAvisoManual(us-central1)] Successful create operation.
Function URL (testAvisoManual): https://us-central1-gen-lang-client-0657155208.cloudfunctions.net/testAvisoManual
```

## 4. Probarla sin esperar a las 9 AM

Abrí en el navegador la URL de `testAvisoManual` que te mostró el
deploy. Te va a devolver un JSON como:

```json
{ "despachado": true, "detalle": "WhatsApp enviado a +5491130078272" }
```

o, si no hay movimientos mañana:

```json
{ "despachado": false, "motivo": "sin_movimientos_24hs" }
```

Si `despachado` es `true`, deberías recibir el WhatsApp en tu celular
en segundos (usa la misma API Key de CallMeBot que ya tenías cargada
en la app).

## 5. Qué hace exactamente

- Todos los días a las 09:00 (hora Argentina) lee `configuracion/dueno`
  y toda la colección `reservas` de tu misma base de Firestore.
- Si `envioAutomaticoWhatsapp` está en `false` en la config, no hace nada.
- Si ya se envió un aviso hoy (`ultimoAvisoEnviadoFecha === hoy`), no
  duplica el envío — misma lógica anti-spam que ya tenía la app.
- Si hay ingresos o egresos programados para mañana, arma el mismo
  mensaje que ves en la app y lo manda por WhatsApp vía CallMeBot,
  usando el teléfono y la API Key guardados en `configuracion/dueno`.
- Actualiza `ultimoAvisoEnviadoFecha` / `Hora` en Firestore, así la app
  (cuando la abras) ve que el aviso de hoy ya salió y no lo repite.

## 6. Cambiar el horario

Si preferís otro horario en vez de las 9 AM, editá esta línea en
`functions/index.js`:

```js
exports.avisoDiario24hs = onSchedule(
  {
    schedule: '0 9 * * *', // <- cron: minuto hora * * * (hora Argentina)
    ...
```

y volvé a correr `firebase deploy --only functions`.

## 7. Logs

Para ver si corrió y qué encontró cada día:

```bash
firebase functions:log --only avisoDiario24hs
```

o desde la consola: https://console.firebase.google.com/project/gen-lang-client-0657155208/functions/logs
