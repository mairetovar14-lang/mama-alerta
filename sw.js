// Service worker de Mamá Alerta.
// Objetivo: que la página (HTML/CSS/JS y el SDK de Firebase) se pueda
// abrir sin conexión después de haberla visitado al menos una vez con
// internet. Los datos (Firestore) se sincronizan aparte, de forma
// automática, gracias a la persistencia offline habilitada en la app —
// este archivo solo se encarga de que la "cáscara" de la app cargue.

const CACHE_NAME = "mama-alerta-v2";

// Recursos que sabemos de antemano que hacen falta para que la app
// arranque (el SDK de Firebase, el manifest y los íconos de la app
// instalada). La propia página HTML se agrega a la caché automáticamente
// la primera vez que se visita (ver "fetch" abajo).
const PRECARGA = [
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js",
  "./index.html",
  "./firebase-config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECARGA))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia: intenta la red primero (para que las pacientes siempre vean
// la versión más reciente cuando hay conexión); si la red falla —porque
// están sin internet— responde con lo que haya en caché de una visita
// anterior. Cada respuesta buena de red se guarda en caché para la
// próxima vez que no haya señal.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        if (respuesta && respuesta.status === 200) {
          const copia = respuesta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});
