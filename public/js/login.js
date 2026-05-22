
// Dopo il login il server risponde con il ruolo dell'utente, e questa pagina reindirizza alla dashboard corretta.

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
    // Il metodo eseguiLogin viene chiamato al submit del form (v-submit.prevent="eseguiLogin" in login.html).
    methods: {
        async eseguiLogin() { // async perché usiamo await per la fetch
            this.loading = true;

            try {
                const res = await fetch('/api/login', { // Endpoint del server per il login
                    method: 'POST', // Metodo POST per inviare le credenziali
                    headers: { 'Content-Type': 'application/json' }, // Indica che stiamo inviando JSON
                    body: JSON.stringify(this.form) // Converte l'oggetto form (email e password) in una stringa JSON da inviare al server
                });

                const data = await res.json();
                // Il server risponde con un JSON che contiene almeno un campo "ruolo" (manager, allenatore, sportivo) e opzionalmente un "message" in caso di errore

                // Se res.ok è true, significa che il login è riuscito (status 200-299). Altrimenti, il login è fallito (es. 401 Unauthorized).
                if (res.ok) {
                    mostraNotifica("Accesso consentito! Reindirizzamento in corso...", "success");

                    // Breve pausa (800ms) per permettere all'utente di vedere la notifica verde prima di cambiare pagina
                    setTimeout(() => {
                        // Il server restituisce il ruolo: lo usiamo per mandare l'utente alla dashboard giusta (manager / allenatore / sportivo)
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
                    this.loading = false; // Rendi di nuovo cliccabile il bottone per permettere un nuovo tentativo di login
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
