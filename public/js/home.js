// =============================================================
// home.js  —  Logica della Home page (index.html)
// =============================================================
// La home non ha logica propria: tutta l'interattività è gestita
// dai componenti globali (Navbar con verifica sessione, Footer).
// Se in futuro servono animazioni o dati da caricare nella home,
// aggiungere il metodo mounted() e le variabili in data().
// =============================================================

const { createApp } = Vue;

const app = createApp({
    // Nessun dato specifico per la home page
});

// Registra i componenti globali: Navbar (con verifica login) e Footer
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

app.mount('#app');
