const { createApp } = Vue; // Importa la funzione createApp da Vue.js

const app = createApp({
    // Nessun dato specifico per la home page
});

// Registra i componenti globali: Navbar (con verifica login) e Footer
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Monta l'app Vue sull'elemento con id "app" (presente in index.html)
app.mount('#app');