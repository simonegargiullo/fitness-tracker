const { createApp } = Vue;

const app = createApp({
    // Se in futuro ci serviranno dati specifici SOLO per la Home, li metteremo qui
});

// Registriamo i componenti globali creati in components.js
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Montiamo l'app
app.mount('#app');