// Funzionalità principali:
//   1. Modifica del proprio profilo (foto, specialità, bio)
//   2. Visualizzazione e accettazione delle richieste degli sportivi
//   3. Creazione schede allenamento per gli atleti accettati
//   4. Creazione piani alimentari per gli atleti accettati

// API usate:
//   GET  /api/sessione: verifica login
//   GET  /api/allenatore/profilo: dati profilo allenatore
//   PUT  /api/allenatore/profilo: salva modifiche profilo
//   GET  /api/allenatore/richieste: sportivi che chiedono di essere seguiti
//   POST /api/allenatore/accetta-richiesta: accetta uno sportivo
//   GET  /api/allenatore/miei-sportivi: atleti già in carico
//   GET  /api/esercizi: catalogo esercizi
//   GET  /api/alimenti: catalogo alimenti
//   POST /api/allenatore/crea-scheda: crea scheda allenamento
//   POST /api/allenatore/crea-dieta: crea piano alimentare

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      utente: { nome: "" },
      richieste: [],
      sportiviAttivi: [],

      // Dati Profilo Allenatore
      profilo: {
        nome: "",
        cognome: "",
        email: "",
        specialita: "",
        descrizione: "",
        telefono: "",
        foto: null, // url della foto esistente per l'anteprima
      },
      nuovaFotoProfilo: null, // conterrà il file vero e proprio se ne carica uno nuovo
      loadingProfilo: false,

      // Cataloghi
      catalogoEsercizi: [],
      catalogoAlimenti: [],

      // Dati Modale Allenamento
      schedaCorrente: {
        id_sportivo: null,
        nome_sportivo: "",
        titolo: "",
        listaEsercizi: [],
      },
      esercizioTemp: {
        id_esercizio: "",
        serie: 3,
        ripetizioni: 10,
        recupero: "90s",
        note: "",
      },

      // Dati Modale Dieta
      dietaCorrente: {
        id_sportivo: null,
        nome_sportivo: "",
        titolo: "",
        listaAlimenti: [],
      },
      alimentoTemp: {
        id_alimento: "",
        quantita_grammi: 100,
        note_pasto: "",
      },

      loadingDati: true,    // spinner pagina principale
      loadingScheda: false, // spinner bottone salva scheda
      loadingDieta: false,  // spinner bottone salva dieta
    };
  },

  // Dati derivati (ricalcolati automaticamente da Vue)
  computed: {
    // Raggruppa il catalogo esercizi per gruppo muscolare.
    // Risultato: { "Petto": [{...}, {...}], "Gambe": [{...}], ... }
    // Usato nel <select> del modal scheda per mostrare i <optgroup>
    eserciziRaggruppati() {
      const raggruppati = {};
      this.catalogoEsercizi.forEach((ex) => {
        if (!raggruppati[ex.gruppo_muscolare])
          raggruppati[ex.gruppo_muscolare] = [];
        raggruppati[ex.gruppo_muscolare].push(ex);
      });
      return raggruppati;
    },
  },
  mounted() {
    this.inizializzaDashboard(); // Verifica sessione e carica dati al caricamento della pagina
  },
  methods: {
    // Verifica sessione e carica i dati
    async inizializzaDashboard() {
      try {
        const res = await fetch("/api/sessione"); // Verifica se l'utente è loggato e ha ruolo "allenatore"
        const dati = await res.json(); // { loggato: true/false, utente: { nome, ruolo, ... } }

        // Se non è loggato o non è un allenatore, reindirizza al login
        if (!dati.loggato || dati.utente.ruolo !== "allenatore") {
          window.location.href = "login.html";
        // Se è un allenatore, salva i dati utente e carica richieste/atleti/cataloghi
        } else {
          this.utente = dati.utente;
          this.caricaDati();
          this.caricaCataloghi();
        }
      } catch (error) {
        window.location.href = "login.html";
      }
    },

    // GESTIONE PROFILO ALLENATORE
    async apriModaleProfilo() {
      try {
        const res = await fetch("/api/allenatore/profilo"); // Ottiene i dati del profilo per precompilare il form del modale
        if (res.ok) {
          this.profilo = await res.json(); // { nome, cognome, email, specialita, descrizione, telefono, foto }
          this.nuovaFotoProfilo = null; // reset del file caricato (se si riapre il modale senza ricaricare la pagina)
          const modale = new bootstrap.Modal(
            document.getElementById("modaleProfilo"), // Inizializza il modale Bootstrap (assicurati che l'ID corrisponda a quello del modale nel tuo HTML)
          );
          modale.show(); // Mostra il modale
        } else {
          mostraNotifica("Errore nel recupero dei dati del profilo.", "danger");
        }
      } catch (error) {
        console.error("Errore profilo:", error);
        mostraNotifica("Errore di connessione al server.", "danger");
      }
    },

    selezionaFotoProfilo(event) {
      this.nuovaFotoProfilo = event.target.files[0]; // Salva il file caricato in una variabile temporanea
      if (this.nuovaFotoProfilo) {
        this.profilo.foto = URL.createObjectURL(this.nuovaFotoProfilo); // Aggiorna l'anteprima della foto nel modale usando un URL temporaneo creato da JavaScript
      }
    },

    // Salva le modifiche al profilo. Se è stata caricata una nuova foto, viene inviata insieme agli altri dati.
    async salvaProfilo() {
      this.loadingProfilo = true;

      // Crea un oggetto FormData per inviare i dati del profilo, inclusa la foto se è stata aggiornata.
      const formData = new FormData();
      formData.append("nome", this.profilo.nome);
      formData.append("email", this.profilo.email);
      formData.append("cognome", this.profilo.cognome || "");
      formData.append("specialita", this.profilo.specialita || "");
      formData.append("descrizione", this.profilo.descrizione || "");
      formData.append("telefono", this.profilo.telefono || "");

      if (this.nuovaFotoProfilo) {
        formData.append("foto", this.nuovaFotoProfilo);
      }

      // Invia la richiesta PUT al server con i dati del profilo.
      // Il server gestirà sia l'aggiornamento dei campi testuali che il salvataggio della nuova foto (se presente).
      try {
        const res = await fetch("/api/allenatore/profilo", { // fetch serve per inviare la richiesta al server. URL e metodo devono corrispondere a quelli definiti nel backend.
          method: "PUT",
          body: formData,
        });
        const data = await res.json(); // { success: true/false, message: "..." } o { success: false, error: "..." }

        // Se la risposta è positiva, mostra una notifica di successo e aggiorna il nome visualizzato nella navbar.
        // Altrimenti, mostra un messaggio di errore.
        if (res.ok) {
          mostraNotifica(data.message, "success");
          this.utente.nome = this.profilo.nome;
          bootstrap.Modal.getInstance(
            document.getElementById("modaleProfilo"),
          ).hide();
        } else {
          mostraNotifica(
            data.error || "Errore durante il salvataggio.",
            "danger",
          );
        }
      } catch (error) {
        console.error("Errore salvataggio profilo:", error);
        mostraNotifica("Errore di connessione. Impossibile salvare.", "danger");
      } finally {
        this.loadingProfilo = false;
      }
    },

    // Carica richieste in attesa e atleti già accettati (chiamate in parallelo)
    async caricaDati() {
      try {
        const resRichieste = await fetch("/api/allenatore/richieste");
        this.richieste = await resRichieste.json();

        const resAttivi = await fetch("/api/allenatore/miei-sportivi");
        this.sportiviAttivi = await resAttivi.json();
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingDati = false;
      }
    },

    // Carica esercizi e alimenti dal catalogo (servono nei modal scheda/dieta)
    async caricaCataloghi() {
      try {
        const resEs = await fetch("/api/esercizi");
        this.catalogoEsercizi = await resEs.json();

        const resAl = await fetch("/api/alimenti");
        this.catalogoAlimenti = await resAl.json();
      } catch (err) {
        console.error(err);
      }
    },

    // Formatta una data ISO in formato italiano leggibile (es. "15 mag 2025")
    formattaData(dataStr) {
      if (!dataStr) return ""; // Gestione caso data mancante o null
      const d = new Date(dataStr); // Crea un oggetto Date a partire dalla stringa ISO (es. "2025-05-15T00:00:00.000Z")
      return d.toLocaleDateString("it-IT", {
        day: "2-digit", // Giorno con due cifre (es. "01", "15")
        month: "short", // Mese in forma abbreviata (es. "mag" per maggio)
        year: "numeric", // Anno con quattro cifre (es. "2026")
      });
    },

    // Accetta la richiesta di uno sportivo: cambia stato_richiesta: 'accettata'
    // e sposta la card da "Richieste" a "I Miei Atleti"
    async accettaRichiesta(idSportivo) {
      try {
        const res = await fetch("/api/allenatore/accetta-richiesta", {
          method: "POST",
          // POST perché stiamo modificando lo stato di una risorsa (la richiesta), anche se non stiamo creando un nuovo record.
          // Il server interpreta questa chiamata come "accetta questa richiesta".
          headers: { "Content-Type": "application/json" }, // Specifica che stiamo inviando JSON nel corpo della richiesta
          body: JSON.stringify({ id_sportivo: idSportivo }),
          // Invia l'ID dello sportivo da accettare nel corpo della richiesta. Il server userà questo ID per identificare quale
          // richiesta accettare e aggiornare di conseguenza il database.
        });
        if (res.ok) {
          mostraNotifica("Richiesta accettata! Atleta aggiunto.", "success");
          this.caricaDati();
        } else {
          mostraNotifica("Impossibile accettare la richiesta.", "danger");
        }
      } catch (err) {
        mostraNotifica("Errore di rete.", "danger");
      }
    },

    // LOGICA SCHEDE ALLENAMENTO
    apriModaleScheda(sportivo) {
      this.schedaCorrente = {
        id_sportivo: sportivo.id_utente, // Salva l'ID dello sportivo destinatario della scheda
        nome_sportivo: sportivo.nome, // Salva il nome dello sportivo per mostrarlo nel titolo del modale
        titolo: `Scheda Massa - ${sportivo.nome}`, // Titolo precompilato con il nome dello sportivo (può essere modificato dall'allenatore)
        listaEsercizi: [],
      };
      new bootstrap.Modal(document.getElementById("modalScheda")).show();
    },

    // Aggiunge un esercizio alla lista TEMPORANEA della scheda corrente.
    // La scheda viene inviata al server solo quando si clicca "Salva e Invia".
    aggiungiEsercizio() {
      if (!this.esercizioTemp.id_esercizio) {
        return mostraNotifica("Scegli un esercizio dal catalogo!", "warning");
      }
      const exTrovato = this.catalogoEsercizi.find(
        (e) => e.id === this.esercizioTemp.id_esercizio,
        // Cerca i dettagli dell'esercizio selezionato nel catalogo per poterli salvare insieme a serie/ripetizioni/recupero/note
      );

      // Aggiunge alla lista degli esercizi della scheda corrente un nuovo oggetto con i dati dell'esercizio selezionato e i parametri inseriti dall'allenatore.
      this.schedaCorrente.listaEsercizi.push({
        id_esercizio: exTrovato.id,
        nome_esercizio: exTrovato.nome,
        gruppo_muscolare: exTrovato.gruppo_muscolare,
        serie: this.esercizioTemp.serie,
        ripetizioni: this.esercizioTemp.ripetizioni,
        recupero: this.esercizioTemp.recupero,
        note: this.esercizioTemp.note,
      });

      // Resetta i campi temporanei per il prossimo esercizio (mantiene solo serie/ripetizioni/recupero che spesso restano simili tra esercizi diversi)
      this.esercizioTemp.id_esercizio = "";
      this.esercizioTemp.note = "";
    },

    // Rimuove un esercizio dalla lista della scheda tramite il suo indice (posizione nell'array).
    rimuoviEsercizio(index) {
      this.schedaCorrente.listaEsercizi.splice(index, 1);
    },

    // Invia la scheda al server. Usa un unico POST con:
    //   - titolo della scheda
    //   - id dello sportivo destinatario
    //   - array di tutti gli esercizi aggiunti
    // Il server crea prima la scheda, poi inserisce gli esercizi in loop.
    async salvaSchedaDefinitiva() {
      if (this.schedaCorrente.listaEsercizi.length === 0) {
        return mostraNotifica("La scheda è vuota!", "warning");
      }
      this.loadingScheda = true;
      try {
        const res = await fetch("/api/allenatore/crea-scheda", {
          method: "POST", // POST perché stiamo creando una nuova scheda allenamento. Il server interpreterà questa chiamata come "crea una nuova scheda con questi dati".
          headers: { "Content-Type": "application/json" },
          // Specifica che stiamo inviando JSON nel corpo della richiesta. Il server si aspetta questo formato per poterlo processare correttamente.
          body: JSON.stringify(this.schedaCorrente),
          // Invia i dati della scheda corrente (titolo, id_sportivo, listaEsercizi) al server. Il server userà questi dati per creare una
          // nuova scheda allenamento associata allo sportivo specificato e popolare la tabella degli esercizi correlati.
        });
        const data = await res.json(); // { success: true/false, message: "..." } o { success: false, error: "..." }
        if (res.ok) {
          mostraNotifica(data.message, "success");
          bootstrap.Modal.getInstance(
            document.getElementById("modalScheda"), // Chiude il modale dopo il salvataggio. Assicurati che l'ID corrisponda a quello del modale nel tuo HTML.
          ).hide(); // Nasconde il modale usando l'API di Bootstrap. Il server ha già salvato la scheda, quindi possiamo chiudere il modale e tornare alla dashboard.
        } else {
          mostraNotifica(data.error || "Errore salvataggio scheda.", "danger");
        }
      } catch (err) {
        mostraNotifica("Errore di connessione.", "danger");
      } finally {
          this.loadingScheda = false;
      }
    },

    // LOGICA PIANI ALIMENTARI
    apriModaleDieta(sportivo) {
      this.dietaCorrente = {
        id_sportivo: sportivo.id_utente, // Salva l'ID dello sportivo destinatario del piano alimentare
        nome_sportivo: sportivo.nome, // Salva il nome dello sportivo per mostrarlo nel titolo del modale
        titolo: `Piano Nutrizionale - ${sportivo.nome}`, // Titolo precompilato con il nome dello sportivo (può essere modificato dall'allenatore)
        listaAlimenti: [],
      };
      new bootstrap.Modal(document.getElementById("modalDieta")).show(); // Mostra il modale dieta. Assicurati che l'ID corrisponda a quello del modale nel tuo HTML.
    },

    // Aggiunge un alimento alla lista temporanea con le kcal calcolate al momento:
    // kcal = (calorie_per_100g * grammi_inseriti) / 100
    aggiungiAlimento() {
      if (!this.alimentoTemp.id_alimento) {
        return mostraNotifica("Scegli un alimento dal catalogo!", "warning");
        // Validazione semplice per assicurarsi che l'allenatore abbia selezionato un alimento prima di aggiungerlo alla lista.
        // Se non è stato selezionato, mostra una notifica e interrompe l'esecuzione della funzione.
      }
      const alimTrovato = this.catalogoAlimenti.find(
        (a) => a.id === this.alimentoTemp.id_alimento, // Cerca i dettagli dell'alimento selezionato nel catalogo per poterli salvare insieme a quantità, note e kcal calcolate
      );

      // Aggiunge alla lista degli alimenti della dieta corrente un nuovo oggetto con i dati dell'alimento selezionato, la quantità inserita, le note e le kcal calcolate.
      this.dietaCorrente.listaAlimenti.push({
        id_alimento: alimTrovato.id,
        nome_alimento: alimTrovato.nome,
        quantita_grammi: this.alimentoTemp.quantita_grammi,
        note_pasto: this.alimentoTemp.note_pasto,
        kcal_calc: Math.round(
          (alimTrovato.calorie * this.alimentoTemp.quantita_grammi) / 100,
        ),
      });

      // Resetta i campi temporanei per il prossimo alimento (mantiene solo quantità e note che spesso restano simili tra alimenti diversi)
      this.alimentoTemp.id_alimento = "";
    },

    rimuoviAlimento(index) {
      this.dietaCorrente.listaAlimenti.splice(index, 1); // Rimuove un alimento dalla lista della dieta tramite il suo indice (posizione nell'array).
    },

    // Invia la dieta al server. Usa un unico POST con:
    //   - titolo della dieta
    //   - id dello sportivo destinatario
    //   - array di tutti gli alimenti aggiunti (con quantità e note)
    // Il server crea prima la dieta, poi inserisce gli alimenti in loop.
    async salvaDietaDefinitiva() {
      if (this.dietaCorrente.listaAlimenti.length === 0) {
        return mostraNotifica("La dieta è vuota!", "warning");
      }
      this.loadingDieta = true;
      try {
        const res = await fetch("/api/allenatore/crea-dieta", {
          method: "POST", // POST perché stiamo creando un nuovo piano alimentare. Il server interpreterà questa chiamata come "crea una nuova dieta con questi dati".
          headers: { "Content-Type": "application/json" },
          // Specifica che stiamo inviando JSON nel corpo della richiesta. Il server si aspetta questo formato per poterlo processare correttamente.
          body: JSON.stringify(this.dietaCorrente),
          // Invia i dati della dieta corrente (titolo, id_sportivo, listaAlimenti) al server.
          // Il server userà questi dati per creare una nuova dieta associata allo sportivo specificato e popolare la tabella degli alimenti correlati.
        });
        // La risposta del server dovrebbe indicare se la creazione della dieta è avvenuta con successo o se c'è stato un errore.
        const data = await res.json();
        if (res.ok) {
          mostraNotifica(data.message, "success");
          bootstrap.Modal.getInstance(
            document.getElementById("modalDieta"),
          ).hide();
        } else {
          mostraNotifica(data.error || "Errore salvataggio dieta.", "danger");
        }
      } catch (err) {
        mostraNotifica("Errore di connessione.", "danger");
      } finally{
      this.loadingDieta = false;
      }
    },
  },
});

app.component("app-navbar", NavbarComponent);
app.component("app-footer", FooterComponent);
app.mount("#app");
