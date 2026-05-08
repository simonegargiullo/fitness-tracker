// public/js/login.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            form: {
                email: '',
                password: ''
            },
            loading: false // Gestisce lo spinner sul bottone
        }
    },
    methods: {
        async eseguiLogin() {
            this.loading = true;

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
                    mostraNotifica("Accesso consentito! Reindirizzamento in corso...", "success");
                    
                    // Piccolo ritardo per permettere all'utente di vedere il popup verde prima di cambiare pagina
                    setTimeout(() => {
                        if (data.ruolo === 'manager') {
                            window.location.href = 'dashboard-manager.html';
                        } else if (data.ruolo === 'allenatore') {
                            window.location.href = 'dashboard-allenatore.html';
                        } else if (data.ruolo === 'sportivo') {
                            window.location.href = 'dashboard-sportivo.html';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 800);
                    
                } else {
                    // Errore restituito dal server (es. password errata)
                    mostraNotifica(data.message || 'Credenziali non valide.', 'danger');
                    this.loading = false;
                }
            } catch (error) {
                // Errore di rete / Server offline
                console.error("Errore di login:", error);
                mostraNotifica('Errore di connessione al server. Riprova più tardi.', 'danger');
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