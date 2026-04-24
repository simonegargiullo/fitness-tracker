// public/js/contatti.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Vue tiene in memoria ciò che l'utente scrive in tempo reale
            form: {
                nome: '',
                email: '',
                oggetto: '',
                messaggio: ''
            },
            messaggioInviato: false // Controlla se mostrare il banner di successo
        }
    },
    methods: {
        inviaRichiesta() {
            // In un progetto reale, qui faresti una fetch('/api/contatti', ...)
            console.log("Dati pronti per essere inviati al server:", this.form);
            
            // Mostriamo il messaggio di successo
            this.messaggioInviato = true;
            
            // Svuotiamo il form
            this.form = { nome: '', email: '', oggetto: '', messaggio: '' };
            
            // Facciamo sparire il messaggio di successo dopo 5 secondi
            setTimeout(() => {
                this.messaggioInviato = false;
            }, 5000);
        }
    }
});

// Registriamo i componenti globali (Navbar e Footer)
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Montiamo l'app
app.mount('#app');