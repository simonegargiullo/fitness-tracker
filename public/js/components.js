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
                    
                    <div class="d-flex gap-3 align-items-center mt-3 mt-lg-0">
                        <template v-if="!utenteLoggato">
                            <a href="login.html" class="btn btn-link text-light text-decoration-none fw-semibold">Accedi</a>
                            <a href="registrati.html" class="btn btn-primary fw-bold px-4 rounded-pill text-white">Inizia Ora</a>
                        </template>
                        <template v-else>
                            <span class="text-white me-2 d-none d-lg-block small">Bentornato, <strong>{{ nomeUtente }}</strong></span>
                            <a :href="urlDashboard" class="btn btn-primary fw-bold rounded-pill px-3 text-white">
                                <i class="bi bi-rocket-takeoff"></i> Dashboard
                            </a>
                            <button @click="logout" class="btn btn-outline-light rounded-pill px-3">Esci</button>
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
            nomeUtente: '',
            urlDashboard: '#',
            paginaAttuale: '' // Qui salveremo il nome del file corrente
        }
    },
    mounted() {
        this.controllaSessione();
        this.setPaginaAttuale();
    },
    methods: {
        setPaginaAttuale() {
            // Estrae il nome del file dall'URL (es: index.html)
            const path = window.location.pathname;
            this.paginaAttuale = path.split("/").pop();
        },
        async controllaSessione() {
            try {
                const res = await fetch('/api/sessione');
                const dati = await res.json();
                if (dati.loggato) {
                    this.utenteLoggato = true;
                    this.ruoloUtente = dati.utente.ruolo;
                    this.nomeUtente = dati.utente.nome;
                    if (this.ruoloUtente === 'manager') this.urlDashboard = 'dashboard-manager.html';
                    else if (this.ruoloUtente === 'allenatore') this.urlDashboard = 'dashboard-allenatore.html';
                    else this.urlDashboard = 'dashboard-sportivo.html';
                }
            } catch (error) {
                console.error("Sessione non verificabile.");
            }
        },
        async logout() {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = 'index.html';
        }
    }
};

const FooterComponent = {
    template: `
        <footer class="bg-dark text-white text-center py-4 mt-auto">
            <div class="container">
                <p class="mb-1 fw-semibold">Fitness Tracker</p>
                <p class="mb-0 small">© 2026 - Andrea Lepone & Simone Gargiullo</p>
            </div>
        </footer>
    `
};