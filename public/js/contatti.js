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
            messaggioInviato: false,
            loading: false,
            errore: ''
        }
    },
    methods: {
        async inviaRichiesta() {
            this.loading = true;
            this.errore = '';

            try {
                const res = await fetch('/api/contatti', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    this.messaggioInviato = true;
                    this.form = { nome: '', email: '', oggetto: '', messaggio: '' };
                    setTimeout(() => { this.messaggioInviato = false; }, 5000);
                } else {
                    this.errore = data.error || 'Errore durante l\'invio. Riprova più tardi.';
                }
            } catch (error) {
                this.errore = 'Errore di connessione al server.';
            } finally {
                this.loading = false;
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');