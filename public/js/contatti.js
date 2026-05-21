// Crea l'app Vue e definisce i dati e i metodi per il form di contatto.
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
            this.loading = true; // Mostra lo spinner sul bottone

            try {
                const res = await fetch('/api/contatti', {
                    method: 'POST', // Assicurati che l'endpoint sia corretto
                    headers: { 'Content-Type': 'application/json' }, // Imposta l'header per il JSON
                    body: JSON.stringify(this.form) // Invia i dati del form come JSON al server
                });

                const data = await res.json(); // Legge la risposta del server come JSON

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
                this.loading = false; // Nasconde lo spinner sul bottone
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');
