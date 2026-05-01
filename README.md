# Aula Escolar Infantil

Plataforma educativa escolar hecha con Angular y Express.

## Que incluye

- Registro e inicio de sesion
- 4 asignaturas con lecciones digitales
- Evaluaciones editables
- Videos por asignatura con bloqueo por progreso
- Panel para estudiante, docente y gerente
- Guardado local de usuarios, videos y evaluaciones

## Ejecutar en tu computadora

```bash
npm install
npm start
```

## Publicar en Render con link permanente

Este proyecto ya incluye [render.yaml](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/render.yaml) para desplegarlo como servicio web con disco persistente.

### Lo que ya deje preparado

- Script de produccion en [package.json](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/package.json):
  - `npm run start:prod`
- Ruta de almacenamiento configurable en [server.ts](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/src/server.ts)
- Archivo [render.yaml](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/render.yaml) con:
  - build del proyecto
  - inicio del servidor
  - disco persistente para usuarios, videos y evaluaciones

### Pasos

1. Sube este proyecto a GitHub.
2. Crea una cuenta en [Render](https://render.com/).
3. En Render, elige `New +` y luego `Blueprint`.
4. Conecta tu repositorio de GitHub.
5. Render detectara el archivo `render.yaml`.
6. Confirma la creacion del servicio.
7. Espera a que termine el deploy.
8. Render te dara un link publico, por ejemplo:

```text
https://aula-escolar-infantil.onrender.com
```

### Importante

- Para que los datos no se borren, el servicio usa un disco persistente.
- En Render, el disco persistente requiere un plan de pago.
- Sin disco persistente, usuarios, videos y evaluaciones se perderian cuando el servicio se reinicie.

## Archivos importantes

- [app.ts](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/src/app/app.ts)
- [app.html](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/src/app/app.html)
- [app.css](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/src/app/app.css)
- [server.ts](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/src/server.ts)
- [render.yaml](/C:/Users/PC1/Desktop/proyecto%20de%20grado/proyecto/render.yaml)
