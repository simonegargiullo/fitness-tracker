// coach.js - Gestisce la pagina degli allenatori, inclusa la visualizzazione dei dettagli in un modal
const { createApp } = Vue;

// Oggetto data con le variabili reattive usate nella pagina
const app = createApp({
    data() {
        return {
            coaches: [], // Array di allenatori caricati dal database
            selectedCoach: null, // Allenatore attualmente selezionato (mostrato nel modal)
            modalInstance: null, // Riferimento all'istanza Bootstrap del modal
            loading: true // true durante il caricamento, poi diventa false
        }
    },
    mounted() {
        // Inizializza il modal Bootstrap una sola volta al caricamento della pagina
        // (anziché crearlo ogni volta al click)
        this.modalInstance = new bootstrap.Modal(document.getElementById('coachModal'));

        // Carica subito la lista degli allenatori dal server
        this.caricaAllenatori();
    },
    methods: {
        // Chiama il backend e popola l'array coaches con i dati del DB
        async caricaAllenatori() {
            try {
                const res = await fetch('/api/allenatori'); // API che restituisce la lista degli allenatori in formato JSON
                if (res.ok) {
                    this.coaches = await res.json(); // Popola l'array coaches con i dati ricevuti
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