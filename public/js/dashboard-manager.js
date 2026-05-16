// =============================================================
// dashboard-manager.js  —  Logica della Dashboard Manager
// =============================================================
// Il Manager è l'amministratore del sistema. Può:
//   - Creare, modificare e rimuovere account allenatori
//   - Gestire il catalogo esercizi (con foto) e alimenti
//   - Leggere i messaggi di contatto inviati dagli utenti
//
// La dashboard ha tre viste principali, selezionabili tramite tab:
//   'inserimento' → form per aggiungere coach/esercizi/alimenti
//   'catalogo'    → tabelle con i dati esistenti e bottoni modifica/elimina
//   'messaggi'    → lista messaggi ricevuti dal form contatti
//
// API usate (tutte richiedono ruolo 'manager'):
//   POST/PUT/DELETE /api/manager/allenatori/:id
//   POST/PUT/DELETE /api/manager/esercizi/:id
//   POST/PUT/DELETE /api/manager/alimenti/:id
//   GET/PUT         /api/manager/messaggi/:id
// =============================================================

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      loadingDati: true,

      vistaAttiva: "inserimento",
      tabCatalogo: "allenatori",

      // --- INSERIMENTO ---
      coach: { nome: "", cognome: "", email: "", password: "", specialita: "", telefono: "", descrizione: "" },
      fotoCoach: null, loadingCoach: false,

      esercizio: { nome: "", gruppo_muscolare: "" },
      fotoEsercizio: null, loadingEsercizio: false,

      alimento: { nome: "", calorie: "", proteine: "", carboidrati: "", grassi: "" },
      loadingAlimento: false,

      // --- CATALOGHI ---
      listaAllenatori: [], listaEsercizi: [], listaAlimenti: [],

      // --- MODIFICA ---
      editCoach: {}, fotoEditCoach: null,
      editEsercizio: {}, fotoEditEsercizio: null,
      editAlimento: {}, loadingEdit: false,

      // --- MESSAGGI ---
      listaMessaggi: [], messaggioSelezionato: null,

      // ==========================================================
    // ELIMINAZIONE — Modal di conferma → chiamata DELETE
    // ==========================================================

    // Apre il modal generico di conferma eliminazione, impostando
    // testo e tipo in base all'elemento da eliminare.
      deleteModal: { id: null, tipo: '', titolo: '', testo: '', loading: false }
    };
  },
  computed: {
    messaggiNonLetti() { return this.listaMessaggi.filter(m => !m.letto).length; }
  },
  mounted() {
    // Al caricamento verifica subito che l'utente sia loggato come manager
    this.verificaAccesso(); },
  methods: {
    async verificaAccesso() {
      try {
        const res = await fetch("/api/sessione");
        const dati = await res.json();
        if (!dati.loggato || dati.utente.ruolo !== "manager") {
          window.location.href = "login.html";
        } else {
          this.loadingDati = false;
        }
      } catch (error) {
        window.location.href = "login.html";
      }
    },

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

    // --- MESSAGGI ---
    async caricaMessaggi() {
      try {
        const res = await fetch("/api/manager/messaggi");
        if (res.ok) this.listaMessaggi = await res.json();
      } catch (error) { console.error("Errore messaggi", error); }
    },

    async apriMessaggio(msg) {
      this.messaggioSelezionato = msg;
      if (!msg.letto) {
        try {
          await fetch(`/api/manager/messaggi/${msg.id}/letto`, { method: "PUT" });
          msg.letto = true;
        } catch (e) { console.error(e); }
      }
      new bootstrap.Modal(document.getElementById("modalMessaggio")).show();
    },

    formattaData(dataStr) {
      if (!dataStr) return "";
      const d = new Date(dataStr);
      return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    },

    // --- GESTIONE FILE ---
    selezionaFotoCoach(event) { this.fotoCoach = event.target.files[0]; },
    selezionaFotoEsercizio(event) { this.fotoEsercizio = event.target.files[0]; },
    selezionaFotoEditCoach(event) { this.fotoEditCoach = event.target.files[0]; },
    selezionaFotoEditEsercizio(event) { this.fotoEditEsercizio = event.target.files[0]; },

    async creaAllenatore() {
      this.loadingCoach = true;
      let formData = new FormData();
      for (let key in this.coach) formData.append(key, this.coach[key]);
      if (this.fotoCoach) formData.append("foto", this.fotoCoach);
      try {
        const res = await fetch("/api/manager/allenatori", { method: "POST", body: formData });
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
        const res = await fetch("/api/manager/alimenti", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.alimento) });
        const data = await res.json();
        if (res.ok) {
          mostraNotifica("Alimento aggiunto al catalogo!", "success");
          this.alimento = { nome: "", calorie: "", proteine: "", carboidrati: "", grassi: "" };
        } else mostraNotifica(data.message || data.error, "danger");
      } catch (error) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingAlimento = false; }
    },

    // ==========================================================
    // MODIFICA — Apre i modal con i dati precompilati
    // Lo spread operator {...c} crea una copia dell'oggetto
    // così le modifiche non cambiano la lista fino al salvataggio
    // ==========================================================
    apriModificaCoach(c) { this.editCoach = { ...c }; this.fotoEditCoach = null; new bootstrap.Modal(document.getElementById("modalEditCoach")).show(); },
    apriModificaEsercizio(e) { this.editEsercizio = { ...e }; this.fotoEditEsercizio = null; new bootstrap.Modal(document.getElementById("modalEditEsercizio")).show(); },
    apriModificaAlimento(a) { this.editAlimento = { ...a }; new bootstrap.Modal(document.getElementById("modalEditAlimento")).show(); },

    // ==========================================================
    // SALVATAGGIO MODIFICHE — Invia PUT al server
    // ==========================================================
    async salvaModificaAlimento() {
      this.loadingEdit = true;
      try {
        const res = await fetch(`/api/manager/alimenti/${this.editAlimento.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.editAlimento) });
        if (res.ok) { mostraNotifica("Alimento aggiornato con successo!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditAlimento")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    async salvaModificaEsercizio() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editEsercizio.nome); formData.append("gruppo_muscolare", this.editEsercizio.gruppo_muscolare);
      if (this.fotoEditEsercizio) formData.append("immagine_file", this.fotoEditEsercizio);
      try {
        const res = await fetch(`/api/manager/esercizi/${this.editEsercizio.id}`, { method: "PUT", body: formData });
        if (res.ok) { mostraNotifica("Esercizio aggiornato con successo!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditEsercizio")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    async salvaModificaCoach() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editCoach.nome || ""); formData.append("cognome", this.editCoach.cognome || "");
      formData.append("email", this.editCoach.email || ""); formData.append("specialita", this.editCoach.specialita || "");
      formData.append("telefono", this.editCoach.telefono || ""); formData.append("descrizione", this.editCoach.descrizione || "");
      if (this.fotoEditCoach) formData.append("foto", this.fotoEditCoach);
      try {
        const res = await fetch(`/api/manager/allenatori/${this.editCoach.id}`, { method: "PUT", body: formData });
        if (res.ok) { mostraNotifica("Profilo allenatore aggiornato!", "success"); bootstrap.Modal.getInstance(document.getElementById("modalEditCoach")).hide(); this.caricaTuttiIcataloghi(); }
        else mostraNotifica("Errore durante l'aggiornamento.", "danger");
      } catch (err) { mostraNotifica("Errore di rete.", "danger"); }
      finally { this.loadingEdit = false; }
    },

    // ==========================================================
    // ELIMINAZIONE — Modal di conferma → chiamata DELETE
    // ==========================================================

    // Apre il modal generico di conferma eliminazione, impostando
    // testo e tipo in base all'elemento da eliminare.
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
    },

    async eseguiEliminazione() {
      this.deleteModal.loading = true;
      let url = '';
      if (this.deleteModal.tipo === 'alimento') url = `/api/manager/alimenti/${this.deleteModal.id}`;
      else if (this.deleteModal.tipo === 'esercizio') url = `/api/manager/esercizi/${this.deleteModal.id}`;
      else if (this.deleteModal.tipo === 'coach') url = `/api/manager/allenatori/${this.deleteModal.id}`;
      try {
        const res = await fetch(url, { method: "DELETE" });
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
