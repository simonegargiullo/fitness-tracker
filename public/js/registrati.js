// =============================================================
// registrati.js  —  Logica della pagina di registrazione
// =============================================================
// Framework: Vue.js 3 (CDN, senza build tool)
// Componenti usati: NavbarComponent, FooterComponent (da components.js)
// API chiamata: POST /api/registrati
// =============================================================

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Tutti i campi del form di registrazione sono legati a queste variabili
            // tramite v-model in registrati.html. Ogni campo si aggiorna in tempo reale.
            form: {
                nome: '',
                email: '',
                password: '',
                sesso: '',
                data_nascita: '',  // Formato restituito da <input type="date">: YYYY-MM-DD
                peso: '',
                altezza: '',
                obiettivo: '',
                attitudini: '',
                esperienza_pregressa: ''
            },
            loading: false  // true durante la chiamata API → disabilita il bottone e mostra lo spinner
        }
    },
    methods: {
        // Chiamata quando l'utente clicca "Registrati e Inizia"
        // Il form HTML usa @submit.prevent per bloccare il comportamento nativo del browser
        async eseguiRegistrazione() {
            this.loading = true;

            try {
                // Invia tutti i dati del form in formato JSON al backend
                const res = await fetch('/api/registrati', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    // Registrazione riuscita: notifica verde + svuota form + redirect dopo 2 secondi
                    mostraNotifica(data.message + ' Reindirizzamento in corso...', 'success');

                    // Svuota tutti i campi del form
                    for (let key in this.form) {
                        this.form[key] = '';
                    }

                    // Aspetta 2 secondi così l'utente vede la notifica, poi va al login
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);

                } else {
                    // Errore dal server (es. email già registrata): notifica rossa
                    mostraNotifica(data.message || data.error || 'Errore durante la registrazione.', 'danger');
                }

            } catch (error) {
                // Errore di rete (server offline, timeout, ecc.)
                console.error("Errore registrazione:", error);
                mostraNotifica('Errore di connessione al server. Riprova più tardi.', 'danger');

            } finally {
                // Riabilita sempre il bottone, sia in caso di successo che di errore
                this.loading = false;
            }
        }
    }
});

// Registra i componenti globali definiti in components.js
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Monta l'app Vue sull'elemento con id="app" in registrati.html
app.mount('#app');
