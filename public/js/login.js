// public/js/login.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            form: {
                email: '',
                password: ''
            },
            loading: false, // Gestisce lo spinner sul bottone
            msg: { testo: '', tipo: '' } // Gestisce i messaggi di errore
        }
    },
    methods: {
        async eseguiLogin() {
            this.loading = true;
            this.msg = { testo: '', tipo: '' }; // Resetta messaggi precedenti

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    // Login avvenuto con successo: smistamento in base al ruolo
                    if (data.ruolo === 'manager') {
                        window.location.href = 'dashboard-manager.html';
                    } else if (data.ruolo === 'allenatore') {
                        window.location.href = 'dashboard-allenatore.html';
                    } else if (data.ruolo === 'sportivo') {
                        window.location.href = 'dashboard-sportivo.html';
                    } else {
                        // Fallback di sicurezza
                        window.location.href = 'index.html';
                    }
                } else {
                    // Errore restituito dal server (es. password errata)
                    this.msg = { testo: data.message || 'Credenziali non valide.', tipo: 'danger' };
                }
            } catch (error) {
                // Errore di rete / Server offline
                console.error("Errore di login:", error);
                this.msg = { testo: 'Errore di connessione al server. Riprova più tardi.', tipo: 'danger' };
            } finally {
                this.loading = false;
            }
        }
    }
});

// Registriamo i componenti globali (Navbar e Footer) prima di montare l'app
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Montiamo l'applicazione
app.mount('#app');