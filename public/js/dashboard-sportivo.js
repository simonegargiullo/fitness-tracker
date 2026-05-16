// public/js/dashboard-sportivo.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            utente: { nome: '' },
            statoRichiesta: 'caricamento', 
            nomeAllenatore: '',
            listaAllenatori: [],
            
            // Variabili per la scelta del coach (collegate al modale di conferma)
            idCoachSelezionato: null,
            loadingScelta: false,
            
            // Dati Profilo Sportivo
            profilo: {
                nome: '',
                email: '',
                sesso: '',
                eta: '',
                peso: '',
                altezza: '',
                obiettivo: '',
                attitudini: '',
                esperienza_pregressa: ''
            },
            loadingProfilo: false,

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
                mostraNotifica("Errore di connessione al server.", "danger");
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
                    this.utente.nome = this.profilo.nome; // Aggiorna il nome in tempo reale nell'header blu
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

        // --- GESTIONE STATO E RICHIESTE ALLENATORE ---
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
            } catch (error) { 
                console.error("Errore caricamento stato:", error); 
            }
        },

        async caricaListaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) this.listaAllenatori = await res.json();
            } catch (error) { 
                console.error("Errore caricamento lista coach:", error); 
            }
        },

        // Apre il modale di conferma Bootstrap anziché usare l'alert confirm() nativo
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
                    mostraNotifica("Errore nell'invio della richiesta all'allenatore.", "danger");
                }
            } catch (error) { 
                console.error("Errore scelta allenatore:", error);
                mostraNotifica("Errore di connessione al server.", "danger");
            } finally {
                this.idCoachSelezionato = null;
                this.loadingScelta = false;
            }
        },

        // --- STORICO PROGRAMMI ---
        async caricaStoricoSchede() {
            try {
                const res = await fetch('/api/sportivo/mie-schede');
                if (res.ok) this.storicoSchede = await res.json();
            } catch (error) { 
                console.error("Errore recupero storico schede:", error); 
            }
        },

        async caricaStoricoDiete() {
            try {
                const res = await fetch('/api/sportivo/mie-diete');
                if (res.ok) this.storicoDiete = await res.json();
            } catch (error) { 
                console.error("Errore recupero storico diete:", error); 
            }
        },

        formattaData(dataStr) {
            if (!dataStr) return '';
            const data = new Date(dataStr);
            return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        mostraModaleScheda(scheda) {
            this.schedaSelezionata = { ...scheda };
            new bootstrap.Modal(document.getElementById('modaleMiaScheda')).show();
        },

        mostraModaleDieta(dieta) {
            this.dietaSelezionata = { ...dieta };
            new bootstrap.Modal(document.getElementById('modaleMiaDieta')).show();
        },

        // ==========================================
        // DOWNLOAD PDF REALI DAL SERVER (PDFKit)
        // ==========================================
        async scaricaPDF() {
            this.loadingPdf = true;
            // Legge l'ID raggruppato o l'id record dipendente dal mapping SQL
            const idScheda = this.schedaSelezionata.id || this.schedaSelezionata.scheda_id; 

            try {
                const res = await fetch(`/api/scarica-scheda/${idScheda}`);
                if (!res.ok) throw new Error('Errore download');
                
                // Converte lo stream binario in blob pronto al download locale indipendente dal display
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.schedaSelezionata.titolo.replace(/ /g, "_")}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                
                mostraNotifica("Download della scheda avviato con successo!", "success");
            } catch (err) {
                console.error(err);
                mostraNotifica("Errore durante il download del PDF dal server.", "danger");
            } finally {
                this.loadingPdf = false;
            }
        },

        async scaricaPDFDieta() {
            this.loadingPdfDieta = true;
            const idDieta = this.dietaSelezionata.id || this.dietaSelezionata.dieta_id;

            try {
                const res = await fetch(`/api/scarica-dieta/${idDieta}`);
                if (!res.ok) throw new Error('Errore download');
                
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.dietaSelezionata.titolo.replace(/ /g, "_")}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                
                mostraNotifica("Download del piano alimentare avviato!", "success");
            } catch (err) {
                console.error(err);
                mostraNotifica("Errore durante il download del PDF dal server.", "danger");
            } finally {
                this.loadingPdfDieta = false;
            }
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');