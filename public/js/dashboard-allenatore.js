// public/js/dashboard-allenatore.js

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
        note_pasto: "Pranzo",
      },

      loading: false,
    };
  },
  computed: {
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
    this.inizializzaDashboard();
  },
  methods: {
    async inizializzaDashboard() {
      try {
        const res = await fetch("/api/sessione");
        const dati = await res.json();

        if (!dati.loggato || dati.utente.ruolo !== "allenatore") {
          window.location.href = "login.html";
        } else {
          this.utente = dati.utente;
          this.caricaDati();
          this.caricaCataloghi();
        }
      } catch (error) {
        window.location.href = "login.html";
      }
    },

    // ==========================================
    // GESTIONE PROFILO ALLENATORE
    // ==========================================
    async apriModaleProfilo() {
      try {
        const res = await fetch("/api/allenatore/profilo");
        if (res.ok) {
          this.profilo = await res.json();
          this.nuovaFotoProfilo = null;
          const modale = new bootstrap.Modal(
            document.getElementById("modaleProfilo"),
          );
          modale.show();
        } else {
          mostraNotifica("Errore nel recupero dei dati del profilo.", "danger");
        }
      } catch (error) {
        console.error("Errore profilo:", error);
        mostraNotifica("Errore di connessione al server.", "danger");
      }
    },

    selezionaFotoProfilo(event) {
      this.nuovaFotoProfilo = event.target.files[0];
      if (this.nuovaFotoProfilo) {
        this.profilo.foto = URL.createObjectURL(this.nuovaFotoProfilo);
      }
    },

    async salvaProfilo() {
      this.loadingProfilo = true;

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

      try {
        const res = await fetch("/api/allenatore/profilo", {
          method: "PUT",
          body: formData,
        });
        const data = await res.json();

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

    // ==========================================

    async caricaDati() {
      try {
        const resRichieste = await fetch("/api/allenatore/richieste");
        this.richieste = await resRichieste.json();

        const resAttivi = await fetch("/api/allenatore/miei-sportivi");
        this.sportiviAttivi = await resAttivi.json();
      } catch (err) {
        console.error(err);
      }
    },

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

    formattaData(dataStr) {
      if (!dataStr) return "";
      const d = new Date(dataStr);
      return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },

    async accettaRichiesta(idSportivo) {
      try {
        const res = await fetch("/api/allenatore/accetta-richiesta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_sportivo: idSportivo }),
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

    // ==========================================
    // LOGICA SCHEDE ALLENAMENTO
    // ==========================================
    apriModaleScheda(sportivo) {
      this.schedaCorrente = {
        id_sportivo: sportivo.id_utente,
        nome_sportivo: sportivo.nome,
        titolo: `Scheda Massa - ${sportivo.nome}`,
        listaEsercizi: [],
      };
      new bootstrap.Modal(document.getElementById("modalScheda")).show();
    },

    aggiungiEsercizio() {
      if (!this.esercizioTemp.id_esercizio) {
        return mostraNotifica("Scegli un esercizio dal catalogo!", "warning");
      }
      const exTrovato = this.catalogoEsercizi.find(
        (e) => e.id === this.esercizioTemp.id_esercizio,
      );

      this.schedaCorrente.listaEsercizi.push({
        id_esercizio: exTrovato.id,
        nome_esercizio: exTrovato.nome,
        gruppo_muscolare: exTrovato.gruppo_muscolare,
        serie: this.esercizioTemp.serie,
        ripetizioni: this.esercizioTemp.ripetizioni,
        recupero: this.esercizioTemp.recupero,
        note: this.esercizioTemp.note,
      });

      this.esercizioTemp.id_esercizio = "";
      this.esercizioTemp.note = "";
    },

    rimuoviEsercizio(index) {
      this.schedaCorrente.listaEsercizi.splice(index, 1);
    },

    async salvaSchedaDefinitiva() {
      if (this.schedaCorrente.listaEsercizi.length === 0) {
        return mostraNotifica("La scheda è vuota!", "warning");
      }
      this.loading = true;
      try {
        const res = await fetch("/api/allenatore/crea-scheda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.schedaCorrente),
        });
        const data = await res.json();
        if (res.ok) {
          mostraNotifica(data.message, "success");
          bootstrap.Modal.getInstance(
            document.getElementById("modalScheda"),
          ).hide();
        } else {
          mostraNotifica(data.error || "Errore salvataggio scheda.", "danger");
        }
      } catch (err) {
        mostraNotifica("Errore di connessione.", "danger");
      }
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
        listaAlimenti: [],
      };
      new bootstrap.Modal(document.getElementById("modalDieta")).show();
    },

    aggiungiAlimento() {
      if (!this.alimentoTemp.id_alimento) {
        return mostraNotifica("Scegli un alimento dal catalogo!", "warning");
      }
      const alimTrovato = this.catalogoAlimenti.find(
        (a) => a.id === this.alimentoTemp.id_alimento,
      );

      this.dietaCorrente.listaAlimenti.push({
        id_alimento: alimTrovato.id,
        nome_alimento: alimTrovato.nome,
        quantita_grammi: this.alimentoTemp.quantita_grammi,
        note_pasto: this.alimentoTemp.note_pasto,
        kcal_calc: Math.round(
          (alimTrovato.calorie * this.alimentoTemp.quantita_grammi) / 100,
        ),
      });

      this.alimentoTemp.id_alimento = "";
    },

    rimuoviAlimento(index) {
      this.dietaCorrente.listaAlimenti.splice(index, 1);
    },

    async salvaDietaDefinitiva() {
      if (this.dietaCorrente.listaAlimenti.length === 0) {
        return mostraNotifica("La dieta è vuota!", "warning");
      }
      this.loading = true;
      try {
        const res = await fetch("/api/allenatore/crea-dieta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.dietaCorrente),
        });
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
      }
      this.loading = false;
    },
  },
});

app.component("app-navbar", NavbarComponent);
app.component("app-footer", FooterComponent);
app.mount("#app");
