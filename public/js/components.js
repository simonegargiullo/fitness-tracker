// =============================================================
// components.js
// Contiene i componenti Vue riutilizzabili in tutte le pagine:
//   - NavbarComponent: barra di navigazione fissa in alto
//   - FooterComponent: piè di pagina con anno dinamico
//   - mostraNotifica(): funzione globale per i toast Bootstrap
// =============================================================

const NavbarComponent = {
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-sm">
        <div class="container">

            <!-- Logo e nome del sito -->
            <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4" href="index.html">
                <img src="img/logo.svg" alt="Logo" class="navbar-logo">
                <span>Fitness<span class="text-primary">Tracker</span></span>
            </a>

            <!-- Bottone hamburger per mobile e landscape -->
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                aria-controls="navbarNav" aria-expanded="false" aria-label="Apri menu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- Voci di menu — si collassano su mobile e landscape -->
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto ms-4">
                    <li class="nav-item">
                        <!-- :class aggiunge "active" alla voce corrente per evidenziarla -->
                        <a class="nav-link" :class="{ active: paginaAttuale === 'index.html' || paginaAttuale === '' }"
                           href="index.html" @click="chiudiMenu">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" :class="{ active: paginaAttuale === 'coach.html' }"
                           href="coach.html" @click="chiudiMenu">Coach</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" :class="{ active: paginaAttuale === 'contatti.html' }"
                           href="contatti.html" @click="chiudiMenu">Contatti</a>
                    </li>
                </ul>

                <!-- Sezione destra: bottoni accesso o utente loggato -->
                <div class="d-flex flex-column flex-lg-row gap-3 align-items-start align-items-lg-center mt-3 mt-lg-0 pb-3 pb-lg-0">

                    <!-- Utente NON loggato: mostra Accedi e Inizia Ora -->
                    <template v-if="!utenteLoggato">
                        <a href="login.html" class="btn btn-link text-light text-decoration-none fw-semibold px-0 ms-4 ms-lg-0"
                           @click="chiudiMenu">Accedi</a>
                        <a href="registrati.html" class="btn btn-primary fw-bold px-4 rounded-pill text-white"
                           @click="chiudiMenu">Inizia Ora</a>
                    </template>

                    <!-- Utente loggato: mostra nome, Dashboard ed Esci -->
                    <template v-else>
                        <span class="text-white mb-2 mb-lg-0 small ms-3 ms-lg-0">
                            Bentornato, <strong>{{ nomeUtente }}</strong>
                        </span>
                        <div class="d-flex gap-2 ms-3 ms-lg-0">
                            <a :href="urlDashboard" class="btn btn-primary fw-bold rounded-pill px-3 text-white"
                               @click="chiudiMenu">
                                <i class="bi bi-rocket-takeoff"></i> Dashboard
                            </a>
                            <button @click="logout" class="btn btn-outline-light rounded-pill px-3">Esci</button>
                        </div>
                    </template>

                </div>
            </div>
        </div>
    </nav>
  `,
  data() {
    return {
      utenteLoggato: false,
      ruoloUtente: null,
      nomeUtente: "",
      urlDashboard: "#",
      paginaAttuale: "",
    };
  },
  mounted() {
    // Controlliamo la sessione e la pagina corrente appena il componente è pronto
    this.controllaSessione();
    this.setPaginaAttuale();
  },
  methods: {
    // Ricava il nome del file HTML corrente per evidenziare il link attivo
    setPaginaAttuale() {
      const path = window.location.pathname;
      this.paginaAttuale = path.split("/").pop();
    },

    // Chiama l'API per sapere se l'utente è loggato e impostare il link alla sua dashboard
    async controllaSessione() {
      try {
        const res = await fetch("/api/sessione");
        const dati = await res.json();
        if (dati.loggato) {
          this.utenteLoggato = true;
          this.ruoloUtente = dati.utente.ruolo;
          this.nomeUtente = dati.utente.nome;
          if (this.ruoloUtente === "manager")
            this.urlDashboard = "dashboard-manager.html";
          else if (this.ruoloUtente === "allenatore")
            this.urlDashboard = "dashboard-allenatore.html";
          else
            this.urlDashboard = "dashboard-sportivo.html";
        }
      } catch (error) {
        console.error("Sessione non verificabile:", error);
      }
    },

    // FIX RESPONSIVE: chiude il menu a tendina su mobile/landscape dopo il click su un link
    chiudiMenu() {
      const navbarCollapse = document.getElementById("navbarNav");
      if (navbarCollapse && navbarCollapse.classList.contains("show")) {
        bootstrap.Collapse.getInstance(navbarCollapse)?.hide();
      }
    },

    // Esegue il logout chiamando l'API e torna alla home
    async logout() {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "index.html";
    },
  },
};

// -------------------------------------------------------------
// FooterComponent — piè di pagina con anno calcolato dinamicamente
// -------------------------------------------------------------
const FooterComponent = {
  template: `
    <footer class="bg-dark text-white text-center py-4 mt-auto">
        <div class="container">
            <p class="mb-1 fw-semibold">Fitness Tracker</p>
            <!-- L'anno viene calcolato in JavaScript così non va mai aggiornato a mano -->
            <p class="mb-0 small">© {{ anno }} - Andrea Lepone & Simone Gargiullo</p>
        </div>
    </footer>
  `,
  data() {
    return {
      // new Date().getFullYear() restituisce l'anno corrente (es. 2026)
      anno: new Date().getFullYear(),
    };
  },
};

// =============================================================
// mostraNotifica — funzione globale per i toast Bootstrap
// Utilizzo: mostraNotifica("Messaggio!", "success" | "danger" | "warning")
// =============================================================
window.mostraNotifica = function (messaggio, tipo = "success") {
  // Crea il contenitore dei toast se non esiste ancora nel DOM
  let container = document.getElementById("toast-container-globale");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container-globale";
    container.className = "toast-container position-fixed bottom-0 end-0 p-4";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  // Sceglie colore e icona in base al tipo di notifica
  let bgClass = "bg-success";
  let iconClass = "bi-check-circle-fill";

  if (tipo === "danger" || tipo === "error") {
    bgClass = "bg-danger";
    iconClass = "bi-exclamation-triangle-fill";
  } else if (tipo === "warning") {
    bgClass = "bg-warning text-dark";
    iconClass = "bi-info-circle-fill";
  }

  // Costruisce l'elemento toast
  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-white border-0 rounded-4 shadow-lg mb-3 ${bgClass}`;
  if (tipo === "warning") toastEl.classList.remove("text-white");
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex p-2">
      <div class="toast-body fw-bold d-flex align-items-center gap-2 fs-6">
        <i class="bi ${iconClass} fs-5"></i>
        <span>${messaggio}</span>
      </div>
      <button type="button" class="btn-close ${tipo !== "warning" ? "btn-close-white" : ""} me-2 m-auto"
              data-bs-dismiss="toast" aria-label="Chiudi"></button>
    </div>
  `;

  container.appendChild(toastEl);

  // Mostra il toast e rimuovilo dal DOM dopo che scompare (3.5s)
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
};