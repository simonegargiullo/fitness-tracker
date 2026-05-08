// public/js/contatti.js

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
            loading: false
            // rimosse le vecchie variabili "messaggioInviato" ed "errore"
        }
    },
    methods: {
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
                    // Chiamiamo il nostro nuovo pop-up globale
                    mostraNotifica("Messaggio inviato con successo! Ti risponderemo presto.", "success");
                    // Svuotiamo il form
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