// public/js/dashboard-allenatore.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            utente: { nome: '' },
            richieste: [],
            sportiviAttivi: [],
            
            // Cataloghi
            catalogoEsercizi: [],
            catalogoAlimenti: [],
            
            // Dati Modale Allenamento
            schedaCorrente: {
                id_sportivo: null,
                nome_sportivo: '',
                titolo: '',
                listaEsercizi: []
            },
            esercizioTemp: {
                id_esercizio: '',
                serie: 3,
                ripetizioni: 10,
                recupero: '90s',
                note: ''
            },

            // Dati Modale Dieta
            dietaCorrente: {
                id_sportivo: null,
                nome_sportivo: '',
                titolo: '',
                listaAlimenti: []
            },
            alimentoTemp: {
                id_alimento: '',
                quantita_grammi: 100,
                note_pasto: 'Pranzo'
            },
            
            loading: false
        }
    },
    computed: {
        // Raggruppa gli esercizi per il menu a tendina
        eserciziRaggruppati() {
            const raggruppati = {};
            this.catalogoEsercizi.forEach(ex => {
                if (!raggruppati[ex.gruppo_muscolare]) raggruppati[ex.gruppo_muscolare] = [];
                raggruppati[ex.gruppo_muscolare].push(ex);
            });
            return raggruppati;
        }
    },
    mounted() {
        this.inizializzaDashboard();
    },
    methods: {
        async inizializzaDashboard() {
            try {
                const res = await fetch('/api/sessione');
                const dati = await res.json();
                
                if (!dati.loggato || dati.utente.ruolo !== 'allenatore') {
                    window.location.href = 'login.html';
                } else {
                    this.utente = dati.utente;
                    this.caricaDati();
                    this.caricaCataloghi();
                }
            } catch (error) {
                window.location.href = 'login.html';
            }
        },

        async caricaDati() {
            const resRichieste = await fetch('/api/allenatore/richieste');
            this.richieste = await resRichieste.json();

            const resAttivi = await fetch('/api/allenatore/miei-sportivi');
            this.sportiviAttivi = await resAttivi.json();
        },

        async caricaCataloghi() {
            // Scarica sia esercizi che alimenti dal database
            const resEs = await fetch('/api/esercizi');
            this.catalogoEsercizi = await resEs.json();

            const resAl = await fetch('/api/alimenti');
            this.catalogoAlimenti = await resAl.json();
        },

        async accettaRichiesta(idSportivo) {
            await fetch('/api/allenatore/accetta-richiesta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_sportivo: idSportivo })
            });
            this.caricaDati(); // Aggiorna le liste
        },

        // ==========================================
        // LOGICA SCHEDE ALLENAMENTO
        // ==========================================
        apriModaleScheda(sportivo) {
            this.schedaCorrente = {
                id_sportivo: sportivo.id_utente,
                nome_sportivo: sportivo.nome,
                titolo: `Scheda Massa - ${sportivo.nome}`,
                listaEsercizi: []
            };
            new bootstrap.Modal(document.getElementById('modalScheda')).show();
        },

        aggiungiEsercizio() {
            if (!this.esercizioTemp.id_esercizio) return alert("Scegli un esercizio dal catalogo!");
            const exTrovato = this.catalogoEsercizi.find(e => e.id === this.esercizioTemp.id_esercizio);

            this.schedaCorrente.listaEsercizi.push({
                id_esercizio: exTrovato.id,
                nome_esercizio: exTrovato.nome,
                gruppo_muscolare: exTrovato.gruppo_muscolare,
                serie: this.esercizioTemp.serie,
                ripetizioni: this.esercizioTemp.ripetizioni,
                recupero: this.esercizioTemp.recupero,
                note: this.esercizioTemp.note
            });
            
            this.esercizioTemp.id_esercizio = ''; 
            this.esercizioTemp.note = '';
        },

        rimuoviEsercizio(index) {
            this.schedaCorrente.listaEsercizi.splice(index, 1);
        },

        async salvaSchedaDefinitiva() {
            if (this.schedaCorrente.listaEsercizi.length === 0) return alert("La scheda è vuota!");
            this.loading = true;
            try {
                const res = await fetch('/api/allenatore/crea-scheda', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.schedaCorrente)
                });
                const data = await res.json();
                alert(data.message);
                bootstrap.Modal.getInstance(document.getElementById('modalScheda')).hide();
            } catch (err) { alert("Errore salvataggio scheda."); }
            this.loading = false;
        },

        // ==========================================
        // LOGICA PIANI ALIMENTARI
        // ==========================================
        apriModaleDieta(sportivo) {
            this.dietaCorrente = {
                id_sportivo: sportivo.id_utente,
                nome_sportivo: sportivo.nome,
                titolo: `Piano Nutrizionale - ${sportivo.nome}`,
                listaAlimenti: []
            };
            new bootstrap.Modal(document.getElementById('modalDieta')).show();
        },

        aggiungiAlimento() {
            if (!this.alimentoTemp.id_alimento) return alert("Scegli un alimento dal catalogo!");
            const alimTrovato = this.catalogoAlimenti.find(a => a.id === this.alimentoTemp.id_alimento);

            this.dietaCorrente.listaAlimenti.push({
                id_alimento: alimTrovato.id,
                nome_alimento: alimTrovato.nome,
                quantita_grammi: this.alimentoTemp.quantita_grammi,
                note_pasto: this.alimentoTemp.note_pasto,
                // Calcoliamo i macros per la visualizzazione istantanea per l'allenatore
                kcal_calc: Math.round((alimTrovato.calorie * this.alimentoTemp.quantita_grammi) / 100)
            });
            
            this.alimentoTemp.id_alimento = ''; 
        },

        rimuoviAlimento(index) {
            this.dietaCorrente.listaAlimenti.splice(index, 1);
        },

        async salvaDietaDefinitiva() {
            if (this.dietaCorrente.listaAlimenti.length === 0) return alert("La dieta è vuota!");
            this.loading = true;
            try {
                const res = await fetch('/api/allenatore/crea-dieta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.dietaCorrente)
                });
                const data = await res.json();
                alert(data.message);
                bootstrap.Modal.getInstance(document.getElementById('modalDieta')).hide();
            } catch (err) { alert("Errore salvataggio dieta."); }
            this.loading = false;
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');