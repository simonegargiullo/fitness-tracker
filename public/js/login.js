// =============================================================
// login.js  —  Logica della pagina di accesso
// =============================================================
// API chiamata: POST /api/login
// Dopo il login il server risponde con il ruolo dell'utente,
// e questa pagina reindirizza alla dashboard corretta.
// =============================================================

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            form: {
                email: '',
                password: ''
            },
            loading: false  // Gestisce lo spinner sul bottone durante la chiamata al server
        }
    },
    methods: {
        async eseguiLogin() {
            this.loading = true;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                const data = await res.json();

                if (res.ok) {
                    mostraNotifica("Accesso consentito! Reindirizzamento in corso...", "success");

                    // Breve pausa (800ms) per permettere all'utente di vedere la notifica verde
                    // prima di cambiare pagina
                    setTimeout(() => {
                        // Il server restituisce il ruolo: lo usiamo per mandare l'utente
                        // alla dashboard giusta (manager / allenatore / sportivo)
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
                    // Credenziali errate: notifica rossa
                    mostraNotifica(data.message || 'Credenziali non valide.', 'danger');
                    this.loading = false;
                }

            } catch (error) {
                // Errore di rete o server offline
                console.error("Errore di login:", error);
                mostraNotifica('Errore di connessione al server. Riprova più tardi.', 'danger');
                this.loading = false;
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');
