const NavbarComponent = {
  template: `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-sm">
            <div class="container">
                <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4" href="index.html">
                    <img src="img/logo.svg" alt="Logo" class="navbar-logo">
                    <span>Fitness<span class="text-primary">Tracker</span></span>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto ms-4">
                        <li class="nav-item">
                            <a class="nav-link" :class="{ active: paginaAttuale === 'index.html' || paginaAttuale === '' }" href="index.html">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" :class="{ active: paginaAttuale === 'coach.html' }" href="coach.html">Coach</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" :class="{ active: paginaAttuale === 'contatti.html' }" href="contatti.html">Contatti</a>
                        </li>
                    </ul>
                    
                    <div class="d-flex flex-column flex-lg-row gap-3 align-items-start align-items-lg-center mt-3 mt-lg-0 pb-3 pb-lg-0">
                        <template v-if="!utenteLoggato">
                            <a href="login.html" class="btn btn-link text-light text-decoration-none fw-semibold px-0 ms-4 ms-lg-0">Accedi</a>
                            <a href="registrati.html" class="btn btn-primary fw-bold px-4 rounded-pill text-white">Inizia Ora</a>
                        </template>
                        <template v-else>
                            <span class="text-white mb-2 mb-lg-0 small ms-3 ms-lg-0">Bentornato, <strong>{{ nomeUtente }}</strong></span>
                            
                            <div class="d-flex gap-2 ms-3 ms-lg-0">
                                <a :href="urlDashboard" class="btn btn-primary fw-bold rounded-pill px-3 text-white">
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
    this.controllaSessione();
    this.setPaginaAttuale();
  },
  methods: {
    setPaginaAttuale() {
      const path = window.location.pathname;
      this.paginaAttuale = path.split("/").pop();
    },
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
          else this.urlDashboard = "dashboard-sportivo.html";
        }
      } catch (error) {
        console.error("Sessione non verificabile.");
      }
    },
    async logout() {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "index.html";
    },
  },
};

const FooterComponent = {
  template: `
        <footer class="bg-dark text-white text-center py-4 mt-auto">
            <div class="container">
                <p class="mb-1 fw-semibold">Fitness Tracker</p>
                <p class="mb-0 small">© 2026 - Andrea Lepone & Simone Gargiullo</p>
            </div>
        </footer>
    `,
};

// Aggiungi questo alla FINE del file components.js

window.mostraNotifica = function(messaggio, tipo = 'success') {
    // 1. Controlla se esiste già il contenitore dei toast, altrimenti lo crea
    let container = document.getElementById('toast-container-globale');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-globale';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-4';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    // 2. Sceglie il colore e l'icona in base al "tipo" (success, danger, warning)
    let bgClass = 'bg-success';
    let iconClass = 'bi-check-circle-fill';
    
    if (tipo === 'danger' || tipo === 'error') {
        bgClass = 'bg-danger';
        iconClass = 'bi-exclamation-triangle-fill';
    } else if (tipo === 'warning') {
        bgClass = 'bg-warning text-dark';
        iconClass = 'bi-info-circle-fill';
    }

    // 3. Crea il Toast HTML
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white border-0 rounded-4 shadow-lg mb-3 ${bgClass}`;
    if (tipo === 'warning') toastEl.classList.remove('text-white'); // Se è giallo, il testo è scuro
    
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
        <div class="d-flex p-2">
            <div class="toast-body fw-bold d-flex align-items-center gap-2 fs-6">
                <i class="bi ${iconClass} fs-5"></i>
                <span>${messaggio}</span>
            </div>
            <button type="button" class="btn-close ${tipo !== 'warning' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toastEl);

    // 4. Mostra il toast e lo fa sparire dopo 3.5 secondi
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();

    // 5. Pulisce il codice HTML quando il toast scompare
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
};