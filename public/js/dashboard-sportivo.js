// =============================================================
// dashboard-sportivo.js  —  Logica della Dashboard Sportivo
// =============================================================
// Questa pagina cambia aspetto in base allo "stato" dell'atleta:
//   'nessuna'   → mostra la lista dei coach disponibili per scegliere
//   'in_attesa' → mostra un messaggio di attesa (il coach deve accettare)
//   'accettata' → mostra schede allenamento e piani alimentari assegnati
//
// API usate:
//   GET  /api/sessione                     → verifica login e ruolo
//   GET  /api/sportivo/stato               → stato richiesta e nome coach
//   GET  /api/allenatori                   → lista coach (solo se stato = 'nessuna')
//   POST /api/sportivo/scegli-allenatore   → invia richiesta al coach
//   GET  /api/sportivo/profilo             → dati profilo (per il modal modifica)
//   PUT  /api/sportivo/profilo             → salva le modifiche al profilo
//   GET  /api/sportivo/mie-schede          → schede allenamento ricevute
//   GET  /api/sportivo/mie-diete           → piani alimentari ricevuti
// =============================================================

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            utente: { nome: '' },

            // Stato della relazione con l'allenatore: 'caricamento' → 'nessuna' / 'in_attesa' / 'accettata'
            // Il template HTML usa v-if per mostrare la sezione corretta
            statoRichiesta: 'caricamento',
            nomeAllenatore: '',
            listaAllenatori: [],

            // Scelta coach: id temporaneo usato dal modal di conferma
            idCoachSelezionato: null,
            loadingScelta: false,

            // Profilo sportivo: usato nel modal "Modifica Profilo"
            profilo: {
                nome: '', email: '', sesso: '',
                data_nascita: '',  // Formato YYYY-MM-DD per <input type="date">
                peso: '', altezza: '', obiettivo: '',
                attitudini: '', esperienza_pregressa: ''
            },
            loadingProfilo: false,

            // Storico schede allenamento (ogni scheda ha un array di esercizi)
            storicoSchede: [],
            schedaSelezionata: { titolo: '', esercizi: [] },
            loadingPdf: false,

            // Storico piani alimentari (ogni dieta ha un array di alimenti)
            storicoDiete: [],
            dietaSelezionata: { titolo: '', alimenti: [] },
            loadingPdfDieta: false
        }
    },
    mounted() {
        // Al caricamento della pagina verifica subito che l'utente sia loggato come sportivo
        this.inizializzaDashboard();
    },
    methods: {

        // ==========================================================
        // INIZIALIZZAZIONE — Verifica sessione e carica i dati
        // ==========================================================
        async inizializzaDashboard() {
            try {
                const resSessione = await fetch('/api/sessione');
                const datiSessione = await resSessione.json();

                // Se non loggato o ruolo sbagliato → redirect al login
                if (!datiSessione.loggato || datiSessione.utente.ruolo !== 'sportivo') {
                    window.location.href = 'login.html';
                    return;
                }

                this.utente = datiSessione.utente;
                await this.caricaStatoSportivo();

            } catch (error) {
                // Errore di rete → andiamo al login per sicurezza
                window.location.href = 'login.html';
            }
        },

        // ==========================================================
        // PROFILO — Lettura e modifica
        // ==========================================================

        // Apre il modal caricando prima i dati aggiornati dal server
        async apriModaleProfilo() {
            try {
                const res = await fetch('/api/sportivo/profilo');
                if (res.ok) {
                    this.profilo = await res.json();
                    new bootstrap.Modal(document.getElementById('modaleProfilo')).show();
                } else {
                    mostraNotifica("Errore nel recupero dei dati del profilo.", "danger");
                }
            } catch (error) {
                mostraNotifica("Errore di connessione.", "danger");
            }
        },

        // Invia le modifiche al server tramite PUT
        async salvaProfilo() {
            this.loadingProfilo = true;
            try {
                const res = await fetch('/api/sportivo/profilo', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.profilo)
                });
                const data = await res.json();

                if (res.ok) {
                    mostraNotifica(data.message, "success");
                    // Aggiorna anche il nome nella navbar senza ricaricare la pagina
                    this.utente.nome = this.profilo.nome;
                    bootstrap.Modal.getInstance(document.getElementById('modaleProfilo')).hide();
                } else {
                    mostraNotifica(data.error || "Errore durante il salvataggio.", "danger");
                }
            } catch (error) {
                mostraNotifica("Errore di connessione. Riprova più tardi.", "danger");
            } finally {
                this.loadingProfilo = false;
            }
        },

        // ==========================================================
        // GESTIONE COACH — Stato, scelta, conferma
        // ==========================================================

        // Carica lo stato attuale e decide cosa mostrare nella dashboard
        async caricaStatoSportivo() {
            try {
                const res = await fetch('/api/sportivo/stato');
                const dati = await res.json();

                this.statoRichiesta = dati.stato_richiesta;
                this.nomeAllenatore = dati.nome_allenatore;

                if (this.statoRichiesta === 'nessuna') {
                    // Nessun coach scelto → mostra la lista per scegliere
                    this.caricaListaAllenatori();
                } else if (this.statoRichiesta === 'accettata') {
                    // Coach assegnato → carica le schede e le diete
                    this.caricaStoricoSchede();
                    this.caricaStoricoDiete();
                }
                // Se 'in_attesa': non serve caricare altro, il template mostra il messaggio di attesa
            } catch (error) {
                console.error(error);
            }
        },

        async caricaListaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) this.listaAllenatori = await res.json();
            } catch (error) {
                console.error(error);
            }
        },

        // Apre il modal di conferma prima di inviare la richiesta al coach
        chiediConfermaCoach(idCoach) {
            this.idCoachSelezionato = idCoach;
            new bootstrap.Modal(document.getElementById('modalConfermaCoach')).show();
        },

        // Invia effettivamente la richiesta dopo che l'utente ha confermato nel modal
        async confermaSceltaAllenatore() {
            if (!this.idCoachSelezionato) return;
            this.loadingScelta = true;

            try {
                const res = await fetch('/api/sportivo/scegli-allenatore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_allenatore: this.idCoachSelezionato })
                });

                if (res.ok) {
                    mostraNotifica("Richiesta inviata con successo!", "success");
                    bootstrap.Modal.getInstance(document.getElementById('modalConfermaCoach')).hide();
                    // Ricarica lo stato → la dashboard mostrerà ora "in attesa"
                    this.caricaStatoSportivo();
                } else {
                    mostraNotifica("Errore nell'invio della richiesta.", "danger");
                }
            } catch (error) {
                mostraNotifica("Errore di connessione al server.", "danger");
            } finally {
                this.loadingScelta = false;
            }
        },

        // ==========================================================
        // SCHEDE ALLENAMENTO E PIANI ALIMENTARI
        // ==========================================================

        async caricaStoricoSchede() {
            try {
                const res = await fetch('/api/sportivo/mie-schede');
                if (res.ok) this.storicoSchede = await res.json();
            } catch (error) {
                console.error("Errore recupero schede:", error);
            }
        },

        async caricaStoricoDiete() {
            try {
                const res = await fetch('/api/sportivo/mie-diete');
                if (res.ok) this.storicoDiete = await res.json();
            } catch (error) {
                console.error("Errore recupero diete:", error);
            }
        },

        // Apre il modal con il dettaglio della scheda selezionata
        mostraModaleScheda(scheda) {
            this.schedaSelezionata = scheda;
            new bootstrap.Modal(document.getElementById('modaleMiaScheda')).show();
        },

        // Apre il modal con il dettaglio della dieta selezionata
        mostraModaleDieta(dieta) {
            this.dietaSelezionata = dieta;
            new bootstrap.Modal(document.getElementById('modaleMiaDieta')).show();
        },

        // ==========================================================
        // EXPORT PDF — usa la libreria html2pdf.js (CDN)
        // ==========================================================

        // Genera il PDF della scheda allenamento.
        // this.$refs.areaPdf è il riferimento al div HTML da convertire in PDF.
        scaricaPDF() {
            this.loadingPdf = true;
            const elemento = this.$refs.areaPdf;
            const nomeFile = this.schedaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = {
                margin: 10,
                filename: nomeFile,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(elemento).save()
                .then(() => {
                    this.loadingPdf = false;
                    mostraNotifica("Download della scheda avviato!", "success");
                })
                .catch(err => {
                    console.error(err);
                    this.loadingPdf = false;
                    mostraNotifica("Errore nella generazione del PDF.", "danger");
                });
        },

        // Stessa logica di scaricaPDF(), ma per il piano alimentare
        scaricaPDFDieta() {
            this.loadingPdfDieta = true;
            const elemento = this.$refs.areaPdfDieta;
            const nomeFile = this.dietaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = {
                margin: 10,
                filename: nomeFile,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(elemento).save()
                .then(() => {
                    this.loadingPdfDieta = false;
                    mostraNotifica("Download della dieta avviato!", "success");
                })
                .catch(err => {
                    console.error(err);
                    this.loadingPdfDieta = false;
                    mostraNotifica("Errore nella generazione del PDF.", "danger");
                });
        },

        // ==========================================================
        // UTILITY
        // ==========================================================

        // Formatta una data ISO (es. "2025-05-15") in formato italiano (es. "15 mag 2025")
        formattaData(dataStr) {
            if (!dataStr) return '';
            return new Date(dataStr).toLocaleDateString('it-IT', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');
