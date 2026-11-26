# Calendario de Adviento

## Estructura

```
index.html
css/style.css
js/config.js     <- aquí se rellena el contenido de cada día
js/app.js        <- lógica (no hace falta tocarla)
media/audio/     <- mp3 (02.mp3, 07.mp3, 12.mp3, 21.mp3)
media/video/     <- mp4 (06.mp4, 13.mp4, 19.mp4)
media/img/       <- jpg (03.jpg, 10.jpg, 15.jpg, 18.jpg)
```

## Cómo se añade un día

1. Copia el archivo a su carpeta con el número del día (`media/audio/02.mp3`).
2. Abre `js/config.js`, busca el día y cambia los textos `TODO`.

## Publicar en GitHub Pages

1. Crea un repositorio y sube todo el contenido de esta carpeta.
2. Settings > Pages > Deploy from a branch > `main` / `(root)`.
3. La web queda en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

Si subes archivos desde el navegador, el límite es 25 MB por archivo. Con
GitHub Desktop o git el límite es 100 MB, pero conviene comprimir.

## Probar antes de enviarlo

| Enlace | Qué hace |
|---|---|
| `...?dia=15` | Simula que hoy es el día 15 (abre todo hasta ese día) |
| `...?dia=24` | Todo desbloqueado |
| `...?reset` | Borra lo abierto y la bienvenida guardados en ese móvil |

No uses `?reset` en el enlace que le mandes: borraría su progreso en cada visita.

## Preparar los archivos (ffmpeg)

```
# Vídeo compatible con iPhone, 720p, ligero
ffmpeg -i entrada.mov -c:v libx264 -crf 28 -preset slow -vf scale=-2:720 -c:a aac -b:a 128k -movflags +faststart 06.mp4

# Audio
ffmpeg -i entrada.m4a -b:a 192k 02.mp3

# Foto: lado largo 1600 px, calidad alta
ffmpeg -i entrada.heic -vf scale='min(1600,iw)':-2 -q:v 3 03.jpg
```

## Tipos de día

`message`, `song`, `photo`, `video`, `riddle`, `cropped`, `voice`, `ragebait`
y `pending` (mapa y minijuegos, que se programan después). Los detalles de cada
campo están comentados al principio de `js/config.js`.
