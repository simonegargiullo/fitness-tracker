// public/js/dashboard-sportivo.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            utente: { nome: '' },
            statoRichiesta: 'caricamento', 
            nomeAllenatore: '',
            listaAllenatori: [],
            
            // Variabili per la scelta del coach
            idCoachSelezionato: null,
            loadingScelta: false,
            
            // Dati Profilo Sportivo
            profilo: {
                nome: '', email: '', sesso: '', eta: '', peso: '', altezza: '', obiettivo: '', attitudini: '', esperienza_pregressa: ''
            },
            loadingProfilo: false,

            // Dati Storico Schede Allenamento
            storicoSchede: [],
            schedaSelezionata: { titolo: '', esercizi: [] },
            loadingPdf: false,

            // Dati Storico Piani Alimentari
            storicoDiete: [],
            dietaSelezionata: { titolo: '', alimenti: [] },
            loadingPdfDieta: false
        }
    },
    mounted() {
        this.inizializzaDashboard();
    },
    methods: {
        async inizializzaDashboard() {
            try {
                const resSessione = await fetch('/api/sessione');
                const datiSessione = await resSessione.json();

                if (!datiSessione.loggato || datiSessione.utente.ruolo !== 'sportivo') {
                    window.location.href = 'login.html';
                    return;
                }
                
                this.utente = datiSessione.utente;
                await this.caricaStatoSportivo();

            } catch (error) {
                window.location.href = 'login.html';
            }
        },

        // --- GESTIONE PROFILO SPORTIVO ---
        async apriModaleProfilo() {
            try {
                const res = await fetch('/api/sportivo/profilo');
                if (res.ok) {
                    this.profilo = await res.json();
                    const modale = new bootstrap.Modal(document.getElementById('modaleProfilo'));
                    modale.show();
                } else {
                    mostraNotifica("Errore nel recupero dei dati del profilo.", "danger");
                }
            } catch (error) {
                console.error("Errore profilo:", error);
                mostraNotifica("Errore di connessione.", "danger");
            }
        },

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
                    this.utente.nome = this.profilo.nome;
                    bootstrap.Modal.getInstance(document.getElementById('modaleProfilo')).hide();
                } else {
                    mostraNotifica(data.error || "Errore durante il salvataggio.", "danger");
                }
            } catch (error) {
                console.error("Errore salvataggio profilo:", error);
                mostraNotifica("Errore di connessione. Riprova più tardi.", "danger");
            } finally {
                this.loadingProfilo = false;
            }
        },

        // --- GESTIONE COACH ---
        async caricaStatoSportivo() {
            try {
                const res = await fetch('/api/sportivo/stato');
                const dati = await res.json();
                
                this.statoRichiesta = dati.stato_richiesta;
                this.nomeAllenatore = dati.nome_allenatore;

                if (this.statoRichiesta === 'nessuna') {
                    this.caricaListaAllenatori();
                } else if (this.statoRichiesta === 'accettata') {
                    this.caricaStoricoSchede();
                    this.caricaStoricoDiete(); 
                }
            } catch (error) { console.error(error); }
        },

        async caricaListaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) this.listaAllenatori = await res.json();
            } catch (error) { console.error(error); }
        },

        // Nuova logica con il modale per la scelta
        chiediConfermaCoach(idCoach) {
            this.idCoachSelezionato = idCoach;
            new bootstrap.Modal(document.getElementById('modalConfermaCoach')).show();
        },

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
                    this.caricaStatoSportivo();
                } else {
                    mostraNotifica("Errore nell'invio della richiesta.", "danger");
                }
            } catch (error) { 
                console.error(error); 
                mostraNotifica("Errore di connessione al server.", "danger");
            } finally {
                this.loadingScelta = false;
            }
        },

        // --- GESTIONE SCHEDE E DIETE ---
        async caricaStoricoSchede() {
            try {
                const res = await fetch('/api/sportivo/mie-schede');
                if (res.ok) this.storicoSchede = await res.json();
            } catch (error) { console.error("Errore recupero schede:", error); }
        },

        async caricaStoricoDiete() {
            try {
                const res = await fetch('/api/sportivo/mie-diete');
                if (res.ok) this.storicoDiete = await res.json();
            } catch (error) { console.error("Errore recupero diete:", error); }
        },

        formattaData(dataStr) {
            if (!dataStr) return '';
            const data = new Date(dataStr);
            return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        mostraModaleScheda(scheda) {
            this.schedaSelezionata = scheda;
            new bootstrap.Modal(document.getElementById('modaleMiaScheda')).show();
        },

        scaricaPDF() {
            this.loadingPdf = true;
            const elemento = this.$refs.areaPdf;
            const nomeFile = this.schedaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = { margin: 10, filename: nomeFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
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

        mostraModaleDieta(dieta) {
            this.dietaSelezionata = dieta;
            new bootstrap.Modal(document.getElementById('modaleMiaDieta')).show();
        },

        scaricaPDFDieta() {
            this.loadingPdfDieta = true;
            const elemento = this.$refs.areaPdfDieta;
            const nomeFile = this.dietaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = { margin: 10, filename: nomeFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
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
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');