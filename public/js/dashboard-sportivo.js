const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            utente: { nome: '' },
            statoRichiesta: 'caricamento', 
            nomeAllenatore: '',
            listaAllenatori: [],
            
            // Dati Storico Schede Allenamento
            storicoSchede: [],
            schedaSelezionata: {
                titolo: '',
                esercizi: []
            },
            loadingPdf: false,

            // Dati Storico Piani Alimentari
            storicoDiete: [],
            dietaSelezionata: {
                titolo: '',
                alimenti: []
            },
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
                    this.caricaStoricoDiete(); // Carichiamo anche le diete!
                }
            } catch (error) { console.error(error); }
        },

        async caricaListaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) this.listaAllenatori = await res.json();
            } catch (error) { console.error(error); }
        },

        async scegliAllenatore(idCoach) {
            if (!confirm("Inviare la richiesta a questo allenatore?")) return;
            try {
                const res = await fetch('/api/sportivo/scegli-allenatore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_allenatore: idCoach })
                });
                if (res.ok) this.caricaStatoSportivo();
                else alert("Errore nell'invio della richiesta.");
            } catch (error) { console.error(error); }
        },

        async caricaStoricoSchede() {
            try {
                const res = await fetch('/api/sportivo/mie-schede');
                if (res.ok) {
                    this.storicoSchede = await res.json();
                }
            } catch (error) { console.error("Errore recupero schede:", error); }
        },

        // --- NUOVA LOGICA: CARICA TUTTE LE DIETE ---
        async caricaStoricoDiete() {
            try {
                const res = await fetch('/api/sportivo/mie-diete');
                if (res.ok) {
                    this.storicoDiete = await res.json();
                }
            } catch (error) { console.error("Errore recupero diete:", error); }
        },

        formattaData(dataStr) {
            if (!dataStr) return '';
            const data = new Date(dataStr);
            return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        // Modale e PDF per Allenamento
        mostraModaleScheda(scheda) {
            this.schedaSelezionata = scheda;
            const modale = new bootstrap.Modal(document.getElementById('modaleMiaScheda'));
            modale.show();
        },

        scaricaPDF() {
            this.loadingPdf = true;
            const elemento = this.$refs.areaPdf;
            const nomeFile = this.schedaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = { margin: 10, filename: nomeFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            html2pdf().set(opt).from(elemento).save().then(() => { this.loadingPdf = false; }).catch(err => { console.error(err); this.loadingPdf = false; });
        },

        // Modale e PDF per Dieta
        mostraModaleDieta(dieta) {
            this.dietaSelezionata = dieta;
            const modale = new bootstrap.Modal(document.getElementById('modaleMiaDieta'));
            modale.show();
        },

        scaricaPDFDieta() {
            this.loadingPdfDieta = true;
            const elemento = this.$refs.areaPdfDieta;
            const nomeFile = this.dietaSelezionata.titolo.replace(/ /g, "_") + ".pdf";
            const opt = { margin: 10, filename: nomeFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            html2pdf().set(opt).from(elemento).save().then(() => { this.loadingPdfDieta = false; }).catch(err => { console.error(err); this.loadingPdfDieta = false; });
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');