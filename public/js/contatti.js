// =============================================================
// contatti.js  —  Logica della pagina Contatti (contatti.html)
// =============================================================
// Gestisce l'invio del form di contatto.
// Il messaggio viene salvato nel database e poi letto dal manager
// nella sua dashboard (sezione "Messaggi").
// API chiamata: POST /api/contatti
// =============================================================

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            form: {
                nome: '',
                email: '',
                oggetto: '',
                messaggio: ''
            },
            loading: false  // Spinner sul bottone durante l'invio
        }
    },
    methods: {
        // Invia il messaggio al server tramite fetch.
        // In caso di successo svuota il form e mostra la notifica verde.
        async inviaRichiesta() {
            this.loading = true;

            try {
                const res = await fetch('/api/contatti', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    mostraNotifica("Messaggio inviato con successo! Ti risponderemo presto.", "success");
                    // Svuota il form dopo l'invio andato a buon fine
                    this.form = { nome: '', email: '', oggetto: '', messaggio: '' };
                } else {
                    mostraNotifica(data.error || "Errore durante l'invio. Riprova più tardi.", "danger");
                }

            } catch (error) {
                mostraNotifica("Errore di connessione al server.", "danger");
            } finally {
                this.loading = false;
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');
