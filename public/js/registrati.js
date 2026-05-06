// public/js/registrati.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            form: {
                nome: '',
                email: '',
                password: '',
                sesso: '',
                eta: '',
                peso: '',
                altezza: '',
                obiettivo: '',
                attitudini: '',
                esperienza_pregressa: ''
            },
            loading: false, // Per lo spinner del bottone
            msg: { testo: '', tipo: '' } // Per il banner di avviso
        }
    },
    methods: {
        async eseguiRegistrazione() {
            this.loading = true;
            this.msg = { testo: '', tipo: '' };

            try {
                const res = await fetch('/api/registrati', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    // Successo
                    this.msg = { testo: data.message + ' Reindirizzamento al login...', tipo: 'success' };
                    
                    // Svuota il form
                    for(let key in this.form) {
                        this.form[key] = '';
                    }

                    // Rimanda alla pagina di login dopo 2 secondi
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    // Errore dal server (es. email già esistente)
                    this.msg = { testo: data.message || data.error || 'Errore durante la registrazione.', tipo: 'danger' };
                }
            } catch (error) {
                console.error("Errore registrazione:", error);
                this.msg = { testo: 'Errore di connessione al server. Riprova più tardi.', tipo: 'danger' };
            } finally {
                this.loading = false;
            }
        }
    }
});

// Registriamo i componenti globali prima del mount
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

app.mount('#app');