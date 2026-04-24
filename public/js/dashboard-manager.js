// public/js/dashboard-manager.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Dati per il nuovo Coach
            coach: {
                nome: '', cognome: '', email: '', password: '', 
                specialita: '', telefono: '', descrizione: ''
            },
            fotoCoach: null, // Conterrà il file fisico
            loadingCoach: false,
            msgCoach: { testo: '', tipo: '' },

            // Dati per l'Esercizio
            esercizio: { nome: '', gruppo_muscolare: '' },
            fotoEsercizio: null,
            loadingEsercizio: false,
            msgEsercizio: { testo: '', tipo: '' },

            // Dati per l'Alimento
            alimento: { nome: '', calorie: '', proteine: '', carboidrati: '', grassi: '' },
            loadingAlimento: false,
            msgAlimento: { testo: '', tipo: '' }
        }
    },
    mounted() {
        this.verificaAccesso();
    },
    methods: {
        // Controllo Sicurezza: Verifica che sia loggato un manager
        async verificaAccesso() {
            try {
                const res = await fetch('/api/sessione');
                const dati = await res.json();
                if (!dati.loggato || dati.utente.ruolo !== 'manager') {
                    window.location.href = 'index.html'; // Cacciamo i non autorizzati
                }
            } catch (error) {
                window.location.href = 'index.html';
            }
        },

        // --- GESTIONE FILE UPLOAD ---
        selezionaFotoCoach(event) {
            this.fotoCoach = event.target.files[0];
        },
        selezionaFotoEsercizio(event) {
            this.fotoEsercizio = event.target.files[0];
        },

        // --- INVIO DATI ALLENATORE ---
        async creaAllenatore() {
            this.loadingCoach = true;
            this.msgCoach = { testo: '', tipo: '' };

            // Usiamo FormData perché dobbiamo inviare un File insieme al testo
            let formData = new FormData();
            for (let key in this.coach) {
                formData.append(key, this.coach[key]);
            }
            if (this.fotoCoach) {
                formData.append('foto', this.fotoCoach); // Il nome 'foto' deve combaciare con upload.single('foto') nel server
            }

            try {
                const res = await fetch('/api/manager/allenatori', {
                    method: 'POST',
                    body: formData // Niente headers JSON se usiamo FormData!
                });
                
                const data = await res.json();
                if (res.ok) {
                    this.msgCoach = { testo: 'Allenatore creato con successo!', tipo: 'success' };
                    // Resettiamo il form
                    this.coach = { nome: '', cognome: '', email: '', password: '', specialita: '', telefono: '', descrizione: '' };
                    this.fotoCoach = null;
                    document.getElementById('file-coach').value = ''; // Svuota l'input file HTML
                } else {
                    this.msgCoach = { testo: data.message || data.error, tipo: 'danger' };
                }
            } catch (error) {
                this.msgCoach = { testo: 'Errore di rete.', tipo: 'danger' };
            } finally {
                this.loadingCoach = false;
            }
        },

        // --- INVIO DATI ESERCIZIO ---
        async aggiungiEsercizio() {
            this.loadingEsercizio = true;
            this.msgEsercizio = { testo: '', tipo: '' };

            let formData = new FormData();
            formData.append('nome', this.esercizio.nome);
            formData.append('gruppo_muscolare', this.esercizio.gruppo_muscolare);
            if (this.fotoEsercizio) {
                formData.append('immagine_file', this.fotoEsercizio); 
            }

            try {
                const res = await fetch('/api/manager/esercizi', { method: 'POST', body: formData });
                const data = await res.json();
                
                if (res.ok) {
                    this.msgEsercizio = { testo: 'Esercizio aggiunto!', tipo: 'success' };
                    this.esercizio = { nome: '', gruppo_muscolare: '' };
                    this.fotoEsercizio = null;
                    document.getElementById('file-esercizio').value = '';
                } else {
                    this.msgEsercizio = { testo: data.message || data.error, tipo: 'danger' };
                }
            } catch (error) {
                this.msgEsercizio = { testo: 'Errore di rete.', tipo: 'danger' };
            } finally {
                this.loadingEsercizio = false;
            }
        },

        // --- INVIO DATI ALIMENTO ---
        async aggiungiAlimento() {
            this.loadingAlimento = true;
            this.msgAlimento = { testo: '', tipo: '' };

            try {
                // Per l'alimento non ci sono file, quindi possiamo usare un semplice JSON
                const res = await fetch('/api/manager/alimenti', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.alimento)
                });
                
                const data = await res.json();
                if (res.ok) {
                    this.msgAlimento = { testo: 'Alimento aggiunto!', tipo: 'success' };
                    this.alimento = { nome: '', calorie: '', proteine: '', carboidrati: '', grassi: '' };
                } else {
                    this.msgAlimento = { testo: data.message || data.error, tipo: 'danger' };
                }
            } catch (error) {
                this.msgAlimento = { testo: 'Errore di rete.', tipo: 'danger' };
            } finally {
                this.loadingAlimento = false;
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');