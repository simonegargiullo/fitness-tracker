// Il Manager è l'amministratore del sistema. Può:
//   - Creare, modificare e rimuovere account allenatori
//   - Gestire il catalogo esercizi (con foto) e alimenti
//   - Leggere i messaggi di contatto inviati dagli utenti

// La dashboard ha tre viste principali, selezionabili tramite tab:
//   'inserimento': form per aggiungere coach/esercizi/alimenti
//   'catalogo': tabelle con i dati esistenti e bottoni modifica/elimina
//   'messaggi': lista messaggi ricevuti dal form contatti

const { createApp } = Vue;

const app = createApp({
  data() {
    // Stato iniziale: mostra loader finché non verifica sessione e carica dati
    return {
      loadingDati: true,

      // Vista attiva: 'inserimento', 'cataloghi' o 'messaggi'
      vistaAttiva: "inserimento",
      // Tab attiva all'interno della vista 'cataloghi': 'allenatori', 'esercizi' o 'alimenti'
      tabCatalogo: "allenatori",

      // INSERIMENTO
      coach: { nome: "", cognome: "", email: "", password: "", specialita: "", telefono: "", descrizione: "" },
      fotoCoach: null, loadingCoach: false,

      esercizio: { nome: "", gruppo_muscolare: "" },
      fotoEsercizio: null, loadingEsercizio: false,

      alimento: { nome: "", calorie: "", proteine: "", carboidrati: "", grassi: "" },
      loadingAlimento: false,

      // CATALOGHI
      listaAllenatori: [], listaEsercizi: [], listaAlimenti: [],

      // MODIFICA
      editCoach: {}, fotoEditCoach: null,
      editEsercizio: {}, fotoEditEsercizio: null,
      editAlimento: {}, loadingEdit: false,

      // MESSAGGI
      listaMessaggi: [], messaggioSelezionato: null,

    // ELIMINAZIONE — Modal di conferma, chiamata DELETE

    // Apre il modal generico di conferma eliminazione, impostando testo e tipo in base all'elemento da eliminare.
      deleteModal: { id: null, tipo: '', titolo: '', testo: '', loading: false }
    };
  },
  computed: {
    messaggiNonLetti() { return this.listaMessaggi.filter(m => !m.letto).length; } // Conteggio messaggi non letti per badge notifica
  },
  mounted() {
    // Al caricamento verifica subito che l'utente sia loggato come manager
    this.verificaAccesso(); },
  methods: {
    // Verifica se l'utente è loggato e ha ruolo manager. Se no, reindirizza a login.
    async verificaAccesso() {
      try {
        // Endpoint che restituisce { loggato: true/false, utente: { ruolo: "manager"/"coach"/"sportivo", ... } }
        const res = await fetch("/api/sessione");
        // Se la sessione è valida, carica subito i cataloghi per evitare ritardi quando si passa alla vista cataloghi
        const dati = await res.json();
        // Se non loggato o ruolo diverso da manager, reindirizza a login
        if (!dati.loggato || dati.utente.ruolo !== "manager") {
          window.location.href = "login.html";
        } else {
          this.loadingDati = false;
        }
      } catch (error) {
        window.location.href = "login.html";
      }
    },

    // PILLOLE
    // Cambia la vista attiva. Se si passa a 'cataloghi' o 'messaggi', carica i dati corrispondenti.
    cambiaVista(vista) {
      this.vistaAttiva = vista;
      if (vista === "cataloghi") this.caricaTuttiIcataloghi();
      else if (vista === "messaggi") this.caricaMessaggi();
    },

    // Carica in parallelo: lista allenatori, esercizi e alimenti.
    // Chiamata sia all'avvio che dopo ogni modifica/eliminazione.
    async caricaTuttiIcataloghi() {
      try {
        let resAll = await fetch("/api/allenatori");
        if (resAll.ok) this.listaAllenatori = await resAll.json();

        let resEs = await fetch("/api/esercizi");
        if (resEs.ok) this.listaEsercizi = await resEs.json();

        let resAl = await fetch("/api/alimenti");
        if (resAl.ok) this.listaAlimenti = await resAl.json();
      } catch (error) { console.error("Errore caricamento cataloghi", error); }
    },

    // MESSAGGI
    // Carica i messaggi ricevuti dagli utenti tramite il form contatti. Chiamata quando si apre la vista messaggi.
    async caricaMessaggi() {
      try {
        const res = await fetch("/api/manager/messaggi");
        if (res.ok) this.listaMessaggi = await res.json();
      } catch (error) { console.error("Errore messaggi", error); }
    },

    // Apre il modal con i dettagli del messaggio. Se il messaggio non è ancora stato letto, invia una richiesta al server per marcarlo come letto.
    // Il modal mostra mittente, email, data formattata e testo del messaggio.
    async apriMessaggio(msg) {
      this.messaggioSelezionato = msg;
      if (!msg.letto) {
        try {
          // Endpoint per marcare il messaggio come letto: PUT /api/manager/messaggi/:id/letto
          await fetch(`/api/manager/messaggi/${msg.id}/letto`, { method: "PUT" });
          msg.letto = true;
        } catch (e) { console.error(e); }
      }
      new bootstrap.Modal(document.getElementById("modalMessaggio")).show();
    },

    // Formatta la data in modo leggibile (es. "15 Mar 2024, 14:30"). Se la data è null o vuota, restituisce stringa vuota.
    formattaData(dataStr) {
      if (!dataStr) return "";
      const d = new Date(dataStr);
      return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    },

    // GESTIONE FILE (foto)
    selezionaFotoCoach(event) { this.fotoCoach = event.target.files[0]; }, // Salva il file selezionato per il nuovo coach
    selezionaFotoEsercizio(event) { this.fotoEsercizio = event.target.files[0]; }, // Salva il file selezionato per il nuovo esercizio
    selezionaFotoEditCoach(event) { this.fotoEditCoach = event.target.files[0]; }, // Salva il file selezionato per la modifica coach
    selezionaFotoEditEsercizio(event) { this.fotoEditEsercizio = event.target.files[0]; }, // Salva il file selezionato per la modifica esercizio

    // Crea un nuovo allenatore con i dati del form. Se è stata selezionata una foto, la invia come multipart/form-data. Al termine, mostra notifica e resetta il form.
    async creaAllenatore() {
      this.loadingCoach = true;
      let formData = new FormData(); // FormData per inviare testo + file senza dover gestire manualmente i boundary
      for (let key in this.coach) formData.append(key, this.coach[key]); // Aggiunge tutti i campi del coach al form data
      // Se è stata selezionata una foto, aggiungila al form data. Il server si occuperà di gestire l'upload e salvare il percorso.
      if (this.fotoCoach) formData.append("foto", this.fotoCoach);
      try {
        // Invia la richiesta POST al server. Il server si aspetta un form data con i campi del coach e opzionalmente un file "foto".
        const res = await fetch("/api/manager/allenatori", { method: "POST", body: formData });
        // Il server risponde con JSON che contiene un messaggio di successo o errore. Se la risposta è ok, mostra notifica di successo e resetta il form.
        // Altrimenti, mostra l'errore restituito dal server.
        const data = await res.json();
        if (res.ok) {
          mostraNotifica("Allenatore creato con successo!", "success");
          this.coach = { nome: "", cognome: "", email: "", password: "", specialita: "", telefono: "", descrizione: "" };
          this.fotoCoach = null; document.getElementById("file-coach").value = "";
        } else mostraNotifica(data.message || data.error, "danger");
      } catch (error) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingCoach = false; }
    },

    // Aggiunge un esercizio al catalogo con immagine opzionale.
    async aggiungiEsercizio() {
      this.loadingEsercizio = true;
      let formData = new FormData();
      formData.append("nome", this.esercizio.nome); formData.append("gruppo_muscolare", this.esercizio.gruppo_muscolare);
      if (this.fotoEsercizio) formData.append("immagine_file", this.fotoEsercizio);
      try {
        // Invia la richiesta POST al server. Il server si aspetta un form data con i campi dell'esercizio e opzionalmente un file "immagine_file".
        const res = await fetch("/api/manager/esercizi", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) {
          mostraNotifica("Esercizio aggiunto al catalogo!", "success");
          this.esercizio = { nome: "", gruppo_muscolare: "" };
          this.fotoEsercizio = null; document.getElementById("file-esercizio").value = "";
        } else mostraNotifica(data.message || data.error, "danger");
      } catch (error) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEsercizio = false; }
    },

    // Aggiunge un alimento con i macronutrienti (calorie, proteine, carboidrati, grassi).
    async aggiungiAlimento() {
      this.loadingAlimento = true;
      try {
        // Invia la richiesta POST al server. Il server si aspetta un JSON con i campi dell'alimento.
        const res = await fetch("/api/manager/alimenti", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.alimento) });
        const data = await res.json();
        if (res.ok) {
          mostraNotifica("Alimento aggiunto al catalogo!", "success");
          this.alimento = { nome: "", calorie: "", proteine: "", carboidrati: "", grassi: "" };
        } else mostraNotifica(data.message || data.error, "danger");
      } catch (error) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingAlimento = false; }
    },

    // MODIFICA: Apre i modal con i dati precompilati
    // Lo spread operator {...c} crea una copia dell'oggetto così le modifiche non cambiano la lista fino al salvataggio
    // Ti apre il modale che puoi modificare, e se vuoi cambiare la foto puoi selezionarne una nuova (altrimenti rimane quella attuale)
    apriModificaCoach(c) { this.editCoach = { ...c }; this.fotoEditCoach = null; new bootstrap.Modal(document.getElementById("modalEditCoach")).show(); },
    apriModificaEsercizio(e) { this.editEsercizio = { ...e }; this.fotoEditEsercizio = null; new bootstrap.Modal(document.getElementById("modalEditEsercizio")).show(); },
    apriModificaAlimento(a) { this.editAlimento = { ...a }; new bootstrap.Modal(document.getElementById("modalEditAlimento")).show(); },

    // SALVATAGGIO MODIFICHE: Invia PUT al server
    // Salva le modifiche al coach, esercizio o alimento. Se è stata selezionata una nuova foto, la invia come multipart/form-data; altrimenti, invia solo i dati testuali.
    // Al termine, mostra notifica e ricarica i cataloghi per aggiornare la tabella.
    async salvaModificaAlimento() {
      this.loadingEdit = true;
      try {
        const res = await fetch(`/api/manager/alimenti/${this.editAlimento.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.editAlimento) });
        if (res.ok) { mostraNotifica("Alimento aggiornato con successo!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditAlimento")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    // Salva le modifiche all'esercizio. Se è stata selezionata una nuova foto, la invia come multipart/form-data; altrimenti, invia solo i dati testuali.
    // Al termine, mostra notifica e ricarica i cataloghi per aggiornare la tabella.
    async salvaModificaEsercizio() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editEsercizio.nome); formData.append("gruppo_muscolare", this.editEsercizio.gruppo_muscolare);
      if (this.fotoEditEsercizio) formData.append("immagine_file", this.fotoEditEsercizio);
      try {
        // Invia la richiesta PUT al server. Il server si aspetta un form data con i campi dell'esercizio e opzionalmente un file "immagine_file".
        const res = await fetch(`/api/manager/esercizi/${this.editEsercizio.id}`, { method: "PUT", body: formData });
        if (res.ok) { mostraNotifica("Esercizio aggiornato con successo!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditEsercizio")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    // Salva le modifiche al coach. Se è stata selezionata una nuova foto, la invia come multipart/form-data; altrimenti, invia solo i dati testuali.
    // Al termine, mostra notifica e ricarica i cataloghi per aggiornare la tabella.
    async salvaModificaCoach() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editCoach.nome || ""); formData.append("cognome", this.editCoach.cognome || "");
      formData.append("email", this.editCoach.email || ""); formData.append("specialita", this.editCoach.specialita || "");
      formData.append("telefono", this.editCoach.telefono || ""); formData.append("descrizione", this.editCoach.descrizione || "");
      if (this.fotoEditCoach) formData.append("foto", this.fotoEditCoach);
      try {
        // Invia la richiesta PUT al server. Il server si aspetta un form data con i campi del coach e opzionalmente un file "foto".
        const res = await fetch(`/api/manager/allenatori/${this.editCoach.id}`, { method: "PUT", body: formData });
        if (res.ok) { mostraNotifica("Profilo allenatore aggiornato!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditCoach")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    // ELIMINAZIONE: Modal di conferma, chiamata DELETE

    // Apre il modal generico di conferma eliminazione, impostando testo e tipo in base all'elemento da eliminare.
    chiediConferma(id, tipo) {
      this.deleteModal.id = id;
      this.deleteModal.tipo = tipo;
      if (tipo === 'alimento') {
        this.deleteModal.titolo = 'Elimina Alimento';
        this.deleteModal.testo = "Sei sicuro di voler eliminare definitivamente questo alimento dal catalogo?";
      } else if (tipo === 'esercizio') {
        this.deleteModal.titolo = 'Elimina Esercizio';
        this.deleteModal.testo = "Eliminare questo esercizio? Potrebbe essere collegato a delle schede di allenamento esistenti.";
      } else if (tipo === 'coach') {
        this.deleteModal.titolo = 'Licenzia Allenatore';
        this.deleteModal.testo = "ATTENZIONE: Eliminando l'allenatore eliminerai in modo permanente anche il suo account di accesso. Vuoi procedere?";
      }
      new bootstrap.Modal(document.getElementById('modalConfermaEliminazione')).show();
      // Mostra il modal di conferma eliminazione dopo aver impostato i dati dinamici (titolo e testo) in base al tipo di elemento da eliminare.
    },

    // Esegue l'eliminazione dell'elemento (alimento, esercizio o coach) chiamando l'endpoint DELETE corrispondente. Al termine, mostra notifica e ricarica i cataloghi.
    async eseguiEliminazione() {
      this.deleteModal.loading = true;
      let url = '';
      if (this.deleteModal.tipo === 'alimento') url = `/api/manager/alimenti/${this.deleteModal.id}`;
      else if (this.deleteModal.tipo === 'esercizio') url = `/api/manager/esercizi/${this.deleteModal.id}`;
      else if (this.deleteModal.tipo === 'coach') url = `/api/manager/allenatori/${this.deleteModal.id}`;
      try {
        const res = await fetch(url, { method: "DELETE" });
        // Il server risponde con JSON che contiene un messaggio di successo o errore. Se la risposta è ok, mostra notifica di successo e ricarica i cataloghi.
        // Altrimenti, mostra l'errore restituito dal server.
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          mostraNotifica("Eliminazione completata con successo.", "success");
          this.caricaTuttiIcataloghi();
          bootstrap.Modal.getInstance(document.getElementById('modalConfermaEliminazione')).hide();
        } else {
          mostraNotifica(data.error || "Impossibile eliminare l'elemento selezionato.", "danger");
        }
      } catch (err) {
        mostraNotifica("Errore di connessione.", "danger");
      } finally {
        this.deleteModal.loading = false;
      }
    }
  },
});

app.component("app-navbar", NavbarComponent);
app.component("app-footer", FooterComponent);
app.mount("#app");
