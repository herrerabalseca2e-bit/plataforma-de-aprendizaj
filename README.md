# Aula Escolar Infantil

Frontend Angular de la plataforma educativa escolar.

El backend Express fue separado en:

```text
C:\Users\PC1\Desktop\proyecto de grado\backend
```

## Ejecutar en local

En la carpeta del backend:

```bash
npm install
npm run dev
```

En esta carpeta del frontend:

```bash
npm install
npm start
```

Cuando el frontend corre en `localhost:4200`, consume automaticamente la API en `http://localhost:4000`.

## Desplegar en Vercel

1. Despliega primero la carpeta `backend` como un proyecto de Vercel.
2. Copia la URL publica del backend.
3. En el proyecto Vercel del frontend configura esta variable:

```text
NG_APP_API_URL=https://backend-plataforma-abi.vercel.app
```

4. En el proyecto Vercel del backend configura esta variable:

```text
FRONTEND_URL=https://aula-de-abi.vercel.app
```

5. Despliega esta carpeta `proyecto` como el frontend.

## Scripts

```bash
npm run build
```

Antes del build se genera `src/environments/environment.generated.ts` con la URL del backend.

## Importante

Vercel no ofrece almacenamiento persistente en el filesystem de las funciones serverless. El backend funciona con `/tmp` en Vercel, pero usuarios, videos y evaluaciones pueden perderse entre reinicios. Para produccion real conviene conectar una base de datos o storage externo.
