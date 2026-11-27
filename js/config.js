/* ============================================================
   CONFIGURACIÓN DEL CALENDARIO
   Aquí se rellena todo el contenido. No hace falta tocar app.js.

   Tipos de día disponibles:
     message   -> texto (modo: 'lines' | 'type' | 'plain')
     song      -> audio mp3 con reproductor minimalista
     photo     -> foto con pie opcional
     video     -> vídeo mp4
     riddle    -> acertijo con respuesta
     cropped   -> foto recortada que hay que reconocer
     voice     -> nota de voz (mp3 / m4a)
     ragebait  -> día en blanco camuflado (variant: 'video' | 'song' | 'photo')
     pending   -> pendiente (map, juegos, interactivos... se programan después)

   Archivos:  media/audio/NN.mp3 · media/img/NN.jpg · media/video/NN.mp4
   ============================================================ */

window.ADV = {
  // Primer día del calendario (día 1). Mes: 1 = enero ... 12 = diciembre.
  start: { year: 2026, month: 12, day: 1 },

  titulo: 'ein little surprise',

  // Pantalla de bienvenida (solo se ve la primera vez que entra).
  intro: {
    titulo: 'For Emilia ⭒',
    texto: '',
    boton: 'Enter'
  },

  days: {
    1: {
      type: 'message',
      mode: 'lines',
      title: '',
      text: ['TODO: bienvenida con tus palabras.']
    },

    2: {
      type: 'song',
      file: 'media/audio/02.mp3',
      title: 'TODO: título de la canción',
      artist: 'TODO: artista',
      note: ''
    },

    3: {
      type: 'photo',
      file: 'media/img/03.jpg',
      caption: ''
    },

    4: {
      type: 'riddle',
      question: 'TODO: acertijo',
      answer: ['respuesta'],
      hint: 'TODO: pista (sale tras 2 fallos)',
      success: 'TODO: frase al acertar',
      wrong: 'Esa no.'
    },

    // Día en blanco camuflado: parece un vídeo, carga hasta el 99 % y se queda ahí.
    5: {
      type: 'ragebait',
      variant: 'video',
      carga: 6,      // segundos hasta llegar al 99 %
      espera: 4,     // segundos parado en 99 % antes de la frase final
      final: 'TODO: frase final'
    },

    6: {
      type: 'video',
      file: 'media/video/06.mp4',
      poster: '',
      note: ''
    },

    7: {
      type: 'song',
      file: 'media/audio/07.mp3',
      title: 'TODO: título de la canción',
      artist: 'TODO: artista',
      note: ''
    },

    8: {
      type: 'message',
      mode: 'lines',
      text: ['TODO: mensaje 1.']
    },

    9: { type: 'pending', nota: 'Minijuego o interactivo a decidir' },

    10: {
      type: 'photo',
      file: 'media/img/10.jpg',
      caption: ''
    },

    11: { type: 'pending', nota: 'Mapa con lugares especiales' },

    12: {
      type: 'song',
      file: 'media/audio/12.mp3',
      title: 'TODO: título de la canción',
      artist: 'TODO: artista',
      note: ''
    },

    13: {
      type: 'video',
      file: 'media/video/13.mp4',
      poster: '',
      note: ''
    },

    // Segundo día en blanco, con otra apariencia para que no se repita el truco.
    14: {
      type: 'ragebait',
      variant: 'song',
      title: 'TODO: título creíble',
      artist: 'TODO: artista creíble',
      duracion: '3:24',
      carga: 7,
      espera: 4,
      final: 'TODO: frase final'
    },

    // Foto recortada: zoom y punto (x, y en %) de la zona que se ve al principio.
    15: {
      type: 'cropped',
      file: 'media/img/15.jpg',
      zoom: 6,
      x: 50,
      y: 50,
      question: '¿Qué es?',
      answer: ['respuesta'],
      success: 'TODO: frase al acertar'
    },

    16: { type: 'pending', nota: 'Minijuego a acertar' },

    17: {
      type: 'message',
      mode: 'type',
      text: ['TODO: mensaje 2.']
    },

    18: {
      type: 'photo',
      file: 'media/img/18.jpg',
      caption: ''
    },

    19: {
      type: 'video',
      file: 'media/video/19.mp4',
      poster: '',
      note: ''
    },

    20: { type: 'pending', nota: 'Interactivo a pensar' },

    21: {
      type: 'voice',
      file: 'media/audio/21.mp3',
      title: '',
      note: ''
    },

    22: { type: 'pending', nota: 'Por pensar' },

    23: { type: 'pending', nota: 'Día especial' },

    24: {
      type: 'message',
      mode: 'type',
      title: '',
      text: ['TODO: despedida.']
    }
  }
};
