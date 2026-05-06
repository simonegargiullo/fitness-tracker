// public/js/dashboard-manager.js

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      vistaAttiva: "inserimento",
      tabCatalogo: "allenatori",

      // --- INSERIMENTO ---
      coach: {
        nome: "",
        cognome: "",
        email: "",
        password: "",
        specialita: "",
        telefono: "",
        descrizione: "",
      },
      fotoCoach: null,
      loadingCoach: false,
      msgCoach: { testo: "", tipo: "" },

      esercizio: { nome: "", gruppo_muscolare: "" },
      fotoEsercizio: null,
      loadingEsercizio: false,
      msgEsercizio: { testo: "", tipo: "" },

      alimento: {
        nome: "",
        calorie: "",
        proteine: "",
        carboidrati: "",
        grassi: "",
      },
      loadingAlimento: false,
      msgAlimento: { testo: "", tipo: "" },

      // --- CATALOGHI ---
      listaAllenatori: [],
      listaEsercizi: [],
      listaAlimenti: [],

      // --- MODIFICA ---
      editCoach: {},
      fotoEditCoach: null,

      editEsercizio: {},
      fotoEditEsercizio: null,

      editAlimento: {},
      loadingEdit: false,

      // --- MESSAGGI ---
      listaMessaggi: [],
      messaggioSelezionato: null,
    };
  },
  computed: {
    messaggiNonLetti() {
      return this.listaMessaggi.filter(m => !m.letto).length;
    }
  },
  mounted() {
    this.verificaAccesso();
  },
  methods: {
    async verificaAccesso() {
      try {
        const res = await fetch("/api/sessione");
        const dati = await res.json();
        if (!dati.loggato || dati.utente.ruolo !== "manager") {
          window.location.href = "index.html";
        }
      } catch (error) {
        window.location.href = "index.html";
      }
    },

    cambiaVista(vista) {
      this.vistaAttiva = vista;
      if (vista === "cataloghi") {
        this.caricaTuttiIcataloghi();
      } else if (vista === "messaggi") {
        this.caricaMessaggi();
      }
    },

    async caricaTuttiIcataloghi() {
      try {
        let resAll = await fetch("/api/allenatori");
        if (resAll.ok) this.listaAllenatori = await resAll.json();

        let resEs = await fetch("/api/esercizi");
        if (resEs.ok) this.listaEsercizi = await resEs.json();

        let resAl = await fetch("/api/alimenti");
        if (resAl.ok) this.listaAlimenti = await resAl.json();
      } catch (error) {
        console.error("Errore caricamento cataloghi", error);
      }
    },

    // --- MESSAGGI ---
    async caricaMessaggi() {
      try {
        const res = await fetch("/api/manager/messaggi");
        if (res.ok) this.listaMessaggi = await res.json();
      } catch (error) {
        console.error("Errore caricamento messaggi", error);
      }
    },

    async apriMessaggio(msg) {
      this.messaggioSelezionato = msg;
      if (!msg.letto) {
        try {
          await fetch(`/api/manager/messaggi/${msg.id}/letto`, { method: "PUT" });
          msg.letto = true;
        } catch (e) {
          console.error(e);
        }
      }
      new bootstrap.Modal(document.getElementById("modalMessaggio")).show();
    },

    formattaData(dataStr) {
      if (!dataStr) return "";
      const d = new Date(dataStr);
      return d.toLocaleDateString("it-IT", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    },

    // --- GESTIONE FILE (Inserimento) ---
    selezionaFotoCoach(event) {
      this.fotoCoach = event.target.files[0];
    },
    selezionaFotoEsercizio(event) {
      this.fotoEsercizio = event.target.files[0];
    },

    // --- GESTIONE FILE (Modifica) ---
    selezionaFotoEditCoach(event) {
      this.fotoEditCoach = event.target.files[0];
    },
    selezionaFotoEditEsercizio(event) {
      this.fotoEditEsercizio = event.target.files[0];
    },

    // --- API INSERIMENTO ---
    async creaAllenatore() {
      this.loadingCoach = true;
      this.msgCoach = { testo: "", tipo: "" };
      let formData = new FormData();
      for (let key in this.coach) formData.append(key, this.coach[key]);
      if (this.fotoCoach) formData.append("foto", this.fotoCoach);

      try {
        const res = await fetch("/api/manager/allenatori", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          this.msgCoach = { testo: "Allenatore creato!", tipo: "success" };
          this.coach = {
            nome: "", cognome: "", email: "", password: "",
            specialita: "", telefono: "", descrizione: "",
          };
          this.fotoCoach = null;
          document.getElementById("file-coach").value = "";
        } else {
          this.msgCoach = { testo: data.message || data.error, tipo: "danger" };
        }
      } catch (error) {
        this.msgCoach = { testo: "Errore di rete.", tipo: "danger" };
      } finally {
        this.loadingCoach = false;
      }
    },

    async aggiungiEsercizio() {
      this.loadingEsercizio = true;
      this.msgEsercizio = { testo: "", tipo: "" };
      let formData = new FormData();
      formData.append("nome", this.esercizio.nome);
      formData.append("gruppo_muscolare", this.esercizio.gruppo_muscolare);
      if (this.fotoEsercizio) formData.append("immagine_file", this.fotoEsercizio);

      try {
        const res = await fetch("/api/manager/esercizi", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          this.msgEsercizio = { testo: "Esercizio aggiunto!", tipo: "success" };
          this.esercizio = { nome: "", gruppo_muscolare: "" };
          this.fotoEsercizio = null;
          document.getElementById("file-esercizio").value = "";
        } else {
          this.msgEsercizio = { testo: data.message || data.error, tipo: "danger" };
        }
      } catch (error) {
        this.msgEsercizio = { testo: "Errore di rete.", tipo: "danger" };
      } finally {
        this.loadingEsercizio = false;
      }
    },

    async aggiungiAlimento() {
      this.loadingAlimento = true;
      this.msgAlimento = { testo: "", tipo: "" };
      try {
        const res = await fetch("/api/manager/alimenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.alimento),
        });
        const data = await res.json();
        if (res.ok) {
          this.msgAlimento = { testo: "Alimento aggiunto!", tipo: "success" };
          this.alimento = { nome: "", calorie: "", proteine: "", carboidrati: "", grassi: "" };
        } else {
          this.msgAlimento = { testo: data.message || data.error, tipo: "danger" };
        }
      } catch (error) {
        this.msgAlimento = { testo: "Errore di rete.", tipo: "danger" };
      } finally {
        this.loadingAlimento = false;
      }
    },

    // --- APERTURA MODALI ---
    apriModificaCoach(c) {
      this.editCoach = { ...c };
      this.fotoEditCoach = null;
      new bootstrap.Modal(document.getElementById("modalEditCoach")).show();
    },

    apriModificaEsercizio(e) {
      this.editEsercizio = { ...e };
      this.fotoEditEsercizio = null;
      new bootstrap.Modal(document.getElementById("modalEditEsercizio")).show();
    },

    apriModificaAlimento(a) {
      this.editAlimento = { ...a };
      new bootstrap.Modal(document.getElementById("modalEditAlimento")).show();
    },

    // --- API MODIFICA ---
    async salvaModificaAlimento() {
      this.loadingEdit = true;
      try {
        const res = await fetch(`/api/manager/alimenti/${this.editAlimento.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.editAlimento),
        });
        if (res.ok) {
          bootstrap.Modal.getInstance(document.getElementById("modalEditAlimento")).hide();
          this.caricaTuttiIcataloghi();
        } else {
          alert("Errore durante l'aggiornamento");
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingEdit = false;
      }
    },

    async salvaModificaEsercizio() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editEsercizio.nome);
      formData.append("gruppo_muscolare", this.editEsercizio.gruppo_muscolare);
      if (this.fotoEditEsercizio) formData.append("immagine_file", this.fotoEditEsercizio);

      try {
        const res = await fetch(`/api/manager/esercizi/${this.editEsercizio.id}`, {
          method: "PUT",
          body: formData,
        });
        if (res.ok) {
          bootstrap.Modal.getInstance(document.getElementById("modalEditEsercizio")).hide();
          this.caricaTuttiIcataloghi();
        } else {
          alert("Errore durante l'aggiornamento");
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingEdit = false;
      }
    },

    async salvaModificaCoach() {
      this.loadingEdit = true;
      let formData = new FormData();
      formData.append("nome", this.editCoach.nome || "");
      formData.append("cognome", this.editCoach.cognome || "");
      formData.append("email", this.editCoach.email || "");
      formData.append("specialita", this.editCoach.specialita || "");
      formData.append("telefono", this.editCoach.telefono || "");
      formData.append("descrizione", this.editCoach.descrizione || "");
      if (this.fotoEditCoach) formData.append("foto", this.fotoEditCoach);

      try {
        const res = await fetch(`/api/manager/allenatori/${this.editCoach.id}`, {
          method: "PUT",
          body: formData,
        });
        if (res.ok) {
          bootstrap.Modal.getInstance(document.getElementById("modalEditCoach")).hide();
          this.caricaTuttiIcataloghi();
        } else {
          alert("Errore durante l'aggiornamento");
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingEdit = false;
      }
    },

    async eliminaAlimento(id) {
      if (!confirm("Sei sicuro di voler eliminare questo alimento? L'azione è irreversibile.")) return;
      try {
        const res = await fetch(`/api/manager/alimenti/${id}`, { method: "DELETE" });
        if (res.ok) {
          this.caricaTuttiIcataloghi();
        } else {
          alert("Errore durante l'eliminazione.");
        }
      } catch (err) {
        console.error(err);
      }
    },

    async eliminaEsercizio(id) {
      if (!confirm("Eliminare questo esercizio? Potrebbe essere presente in alcune schede allenamento.")) return;
      try {
        const res = await fetch(`/api/manager/esercizi/${id}`, { method: "DELETE" });
        if (res.ok) {
          this.caricaTuttiIcataloghi();
        } else {
          const data = await res.json();
          alert(data.error || "Errore durante l'eliminazione. Controlla che non sia usato in una scheda.");
        }
      } catch (err) {
        console.error(err);
      }
    },

    async eliminaCoach(id) {
      if (!confirm("ATTENZIONE: Eliminando l'allenatore eliminerai anche il suo account di accesso. Procedere?")) return;
      try {
        const res = await fetch(`/api/manager/allenatori/${id}`, { method: "DELETE" });
        if (res.ok) {
          this.caricaTuttiIcataloghi();
        } else {
          alert("Errore durante l'eliminazione dell'allenatore.");
        }
      } catch (err) {
        console.error(err);
      }
    },
  },
});

app.component("app-navbar", NavbarComponent);
app.component("app-footer", FooterComponent);
app.mount("#app");