// =============================================================
// coach.js  —  Logica della pagina Coach (coach.html)
// =============================================================
// Mostra la lista degli allenatori disponibili in cards.
// Al click su una card si apre un modal Bootstrap con i dettagli.
// API chiamata: GET /api/allenatori (pubblica, senza autenticazione)
// =============================================================

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            coaches: [],           // Array di allenatori caricati dal database
            selectedCoach: null,   // Allenatore attualmente selezionato (mostrato nel modal)
            modalInstance: null,   // Riferimento all'istanza Bootstrap del modal
            loading: true          // true durante il caricamento, poi diventa false
        }
    },
    mounted() {
        // Inizializza il modal Bootstrap una sola volta al caricamento della pagina
        // (è più efficiente che crearlo ogni volta al click)
        this.modalInstance = new bootstrap.Modal(document.getElementById('coachModal'));

        // Carica subito la lista degli allenatori dal server
        this.caricaAllenatori();
    },
    methods: {
        // Chiama il backend e popola l'array coaches con i dati del DB
        async caricaAllenatori() {
            try {
                const res = await fetch('/api/allenatori');
                if (res.ok) {
                    this.coaches = await res.json();
                } else {
                    console.error("Errore nel recupero degli allenatori.");
                }
            } catch (error) {
                console.error("Errore di connessione al server:", error);
            } finally {
                // Nasconde lo spinner sia in caso di successo che di errore
                this.loading = false;
            }
        },

        // Viene chiamata quando l'utente clicca su una card coach
        // Salva il coach selezionato e apre il modal con i suoi dettagli
        apriDettagli(coach) {
            this.selectedCoach = coach;
            this.modalInstance.show();
        }
    }
});

app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);
app.mount('#app');
