const { createApp } = Vue;

const app = createApp({
    data() {
        // Stato iniziale: utente vuoto, richiesta in caricamento, nessun allenatore selezionato, profilo e storico vuoti
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
    // Al montaggio del componente, verifica la sessione e carica lo stato dello sportivo
    mounted() {
        this.inizializzaDashboard();
    },
    methods: {
        async inizializzaDashboard() {
            try {
                // Verifica sessione utente e ruolo tramite API dedicata
                const resSessione = await fetch('/api/sessione');
                const datiSessione = await resSessione.json();

                // Controllo di sicurezza lato client: se l'utente non è loggato o non è uno sportivo, reindirizza alla pagina di login
                if (!datiSessione.loggato || datiSessione.utente.ruolo !== 'sportivo') {
                    window.location.href = 'login.html';
                    return;
                }
                
                this.utente = datiSessione.utente; // Salva i dati dell'utente (es. nome) per mostrarli nell'header
                await this.caricaStatoSportivo(); // Carica lo stato dello sportivo (richiesta, allenatore, storico) SOLO dopo aver verificato la sessione

            } catch (error) {
                window.location.href = 'login.html';
            }
        },

        // GESTIONE PROFILO SPORTIVO
        async apriModaleProfilo() {
            try {
                // Carica i dati del profilo dallo sportivo tramite API e mostra il modale di modifica. Se c'è un errore, mostra una notifica.
                const res = await fetch('/api/sportivo/profilo');
                if (res.ok) {
                    this.profilo = await res.json(); // Popola il form del modale con i dati correnti del profilo
                    const modale = new bootstrap.Modal(document.getElementById('modaleProfilo')); // Crea un'istanza del modale Bootstrap
                    modale.show(); // Mostra il modale di modifica del profilo
                } else {
                    mostraNotifica("Errore nel recupero dei dati del profilo.", "danger");
                }
            } catch (error) {
                console.error("Errore profilo:", error);
                mostraNotifica("Errore di connessione al server.", "danger");
            }
        },

        // Salva le modifiche al profilo inviando una richiesta PUT all'API. Gestisce lo stato di caricamento e mostra notifiche di successo o errore.
        async salvaProfilo() {
            this.loadingProfilo = true; // Disabilita il pulsante di salvataggio e mostra un indicatore di caricamento
            try {
                const res = await fetch('/api/sportivo/profilo', {
                    method: 'PUT', // Metodo PUT per aggiornare le informazioni esistenti
                    headers: { 'Content-Type': 'application/json' }, // Specifica che il corpo della richiesta è in formato JSON
                    body: JSON.stringify(this.profilo) // Converte l'oggetto profilo in una stringa JSON da inviare al server
                });
                const data = await res.json();  // Legge la risposta JSON dal server, che dovrebbe contenere un messaggio di successo o un errore
                
                // Se la risposta è positiva, mostra una notifica di successo, aggiorna il nome dell'utente nell'header e chiude il modale.
                // Altrimenti, mostra un messaggio di errore.
                if (res.ok) {
                    mostraNotifica(data.message, "success");
                    this.utente.nome = this.profilo.nome; // Aggiorna il nome in tempo reale nell'header
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

        // GESTIONE STATO E RICHIESTE ALLENATORE
        // Carica lo stato dello sportivo (richiesta in attesa, accettata, nessuna richiesta) e i dati associati (nome allenatore, storico) tramite API.
        // Gestisce eventuali errori di caricamento.
        async caricaStatoSportivo() {
            try {
                const res = await fetch('/api/sportivo/stato');
                // Endpoint API che restituisce lo stato della richiesta di allenatore e il nome dell'allenatore se la richiesta è accettata
                const dati = await res.json(); // { stato_richiesta: 'nessuna' | 'in_attesa' | 'accettata', nome_allenatore: '...' }
                
                this.statoRichiesta = dati.stato_richiesta; // Aggiorna lo stato della richiesta (caricamento, nessuna, in attesa, accettata)
                this.nomeAllenatore = dati.nome_allenatore; // Se la richiesta è accettata, mostra il nome dell'allenatore; altrimenti, rimane vuoto

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

        // Carica la lista degli allenatori disponibili tramite API per mostrarla nella sezione di scelta dell'allenatore. Gestisce eventuali errori di caricamento.
        async caricaListaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) this.listaAllenatori = await res.json();
                // La risposta è un array di allenatori con id e nome, ad esempio: [{ id: 1, nome: 'Mario Rossi' }, { id: 2, nome: 'Luigi Bianchi' }]
            } catch (error) { 
                console.error("Errore caricamento lista coach:", error); 
            }
        },

        // Apre il modale di conferma Bootstrap anziché usare l'alert confirm() nativo
        chiediConfermaCoach(idCoach) {
            this.idCoachSelezionato = idCoach;
            new bootstrap.Modal(document.getElementById('modalConfermaCoach')).show();
        },

        // Invia la richiesta di scelta dell'allenatore al server tramite API POST. Gestisce lo stato di caricamento, mostra notifiche di successo o
        // errore e aggiorna lo stato dello sportivo dopo la conferma.
        async confermaSceltaAllenatore() {
            if (!this.idCoachSelezionato) return; // Sicurezza: se per qualche motivo non c'è un coach selezionato, non fare nulla
            this.loadingScelta = true; // Disabilita il pulsante di conferma e mostra un indicatore di caricamento nel modale
            
            try {
                const res = await fetch('/api/sportivo/scegli-allenatore', {
                    method: 'POST', // Metodo POST per inviare la scelta dell'allenatore al server
                    headers: { 'Content-Type': 'application/json' }, // Specifica che il corpo della richiesta è in formato JSON
                    body: JSON.stringify({ id_allenatore: this.idCoachSelezionato })
                    // Invia l'ID dell'allenatore selezionato al server per elaborare la richiesta di scelta dell'allenatore
                });
                
                if (res.ok) {
                    mostraNotifica("Richiesta inviata con successo!", "success"); // Mostra una notifica di successo all'utente
                    bootstrap.Modal.getInstance(document.getElementById('modalConfermaCoach')).hide(); // Chiude il modale di conferma
                    this.caricaStatoSportivo();
                    // Ricarica lo stato dello sportivo per aggiornare la UI in base alla nuova richiesta
                    // (ad esempio, mostrare "in attesa" o il nome dell'allenatore se accettata)
                } else {
                    mostraNotifica("Errore nell'invio della richiesta all'allenatore.", "danger");
                }
            } catch (error) { 
                console.error("Errore scelta allenatore:", error);
                mostraNotifica("Errore di connessione al server.", "danger");
            } finally {
                // Reset dello stato di selezione e caricamento indipendentemente dal risultato per evitare blocchi dell'interfaccia
                this.idCoachSelezionato = null;
                this.loadingScelta = false;
            }
        },

        // STORICO PROGRAMMI
        // Carica lo storico delle schede di allenamento assegnate dallo staff tramite API. Gestisce eventuali errori di caricamento.
        async caricaStoricoSchede() {
            try {
                const res = await fetch('/api/sportivo/mie-schede');
                if (res.ok) this.storicoSchede = await res.json();
                // La risposta è un array di schede con id, titolo, data_assegnazione e lista di esercizi, ad esempio:
                // [{ id: 1, titolo: 'Scheda 1', data_assegnazione: '2024-06-01', esercizi: [...] }, ...]
            } catch (error) { 
                console.error("Errore recupero storico schede:", error); 
            }
        },

        // Carica lo storico dei piani alimentari assegnati dallo staff tramite API. Gestisce eventuali errori di caricamento.
        async caricaStoricoDiete() {
            try {
                const res = await fetch('/api/sportivo/mie-diete');
                if (res.ok) this.storicoDiete = await res.json(); // La risposta è un array di diete con id, titolo, data_assegnazione e lista di alimenti, ad esempio:
                // [{ id: 1, titolo: 'Dieta 1', data_assegnazione: '2024-06-01', alimenti: [...] }, ...]
            } catch (error) { 
                console.error("Errore recupero storico diete:", error); 
            }
        },

        // Funzione di utilità per formattare le date in formato italiano (es. "01 giu 2026"). Se la data è mancante, restituisce una stringa vuota.
        formattaData(dataStr) {
            if (!dataStr) return '';
            const data = new Date(dataStr);
            return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        },

        // Mostra il modale di dettaglio della scheda di allenamento selezionata.
        // Copia i dati della scheda per evitare mutazioni dirette e utilizza Bootstrap Modal per l'interfaccia.
        mostraModaleScheda(scheda) {
            this.schedaSelezionata = { ...scheda };
            new bootstrap.Modal(document.getElementById('modaleMiaScheda')).show();
        },

        // Mostra il modale di dettaglio del piano alimentare selezionato.
        // Copia i dati della dieta per evitare mutazioni dirette e utilizza Bootstrap Modal per l'interfaccia.
        mostraModaleDieta(dieta) {
            this.dietaSelezionata = { ...dieta };
            new bootstrap.Modal(document.getElementById('modaleMiaDieta')).show();
        },

        // DOWNLOAD PDF REALI DAL SERVER (PDFKit)
        // Queste funzioni inviano una richiesta al server per generare e scaricare un PDF reale della scheda o della dieta selezionata.
        // Gestiscono lo stato di caricamento, mostrano notifiche di successo o errore e utilizzano l'API Blob per scaricare il file in modo
        // indipendente dal display (non basato su html2pdf.js).
        async scaricaPDF() {
            this.loadingPdf = true;
            // Legge l'ID raggruppato o l'id record dipendente dal mapping SQL
            const idScheda = this.schedaSelezionata.id || this.schedaSelezionata.scheda_id; 
            // A seconda di come il backend restituisce i dati, potrebbe essere necessario accedere all'ID della scheda tramite un campo diverso
            // (es. scheda_id) se i dati sono stati mappati in modo diverso. Questo garantisce compatibilità con diverse strutture di dati restituite dal server.

            try {
                const res = await fetch(`/api/scarica-scheda/${idScheda}`); // Endpoint API che genera e restituisce il PDF della scheda di allenamento selezionata
                if (!res.ok) throw new Error('Errore download'); // Se la risposta non è OK, lancia un errore per essere catturato nel blocco catch
                
                // Converte lo stream binario in blob pronto al download locale indipendente dal display
                const blob = await res.blob(); // Il server restituisce il PDF come blob, che è un oggetto rappresentante dati binari (il file PDF generato)
                const url = window.URL.createObjectURL(blob); // Crea un URL temporaneo che punta al blob, necessario per avviare il download del file
                const a = document.createElement('a'); // Crea un elemento <a> dinamicamente, che sarà usato per simulare il click e avviare il download del file
                a.href = url; // Imposta l'attributo href del link all'URL del blob, che contiene il PDF da scaricare
                a.download = `${this.schedaSelezionata.titolo.replace(/ /g, "_")}.pdf`;// Imposta l'attributo download con un nome file basato sul titolo della scheda, sostituendo gli spazi con underscore per evitare problemi nei nomi dei file
                document.body.appendChild(a); // Aggiunge il link, necessario per poter simulare il click e avviare il download
                a.click(); // Simula un click sul link, che avvia il download del file PDF generato dal server
                a.remove(); // Rimuove il link dopo aver avviato il download per pulizia
                window.URL.revokeObjectURL(url); // Revoca l'URL temporaneo creato per il blob per liberare risorse dopo il download
                
                mostraNotifica("Download della scheda avviato con successo!", "success");
                // Mostra una notifica di successo all'utente per confermare che il download è stato avviato correttamente.
                // Il file PDF generato dal server dovrebbe ora essere in fase di download sul dispositivo dell'utente.
            } catch (err) {
                console.error(err);
                mostraNotifica("Errore durante il download del PDF dal server.", "danger");
            } finally {
                this.loadingPdf = false;
            }
        },

        // Funzione simile a scaricaPDF() ma per i piani alimentari. Invia una richiesta al server per generare e scaricare un PDF del piano alimentare selezionato.
        // Gestisce lo stato di caricamento, mostra notifiche di successo o errore e utilizza l'API Blob per scaricare il file in modo indipendente dal display.
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