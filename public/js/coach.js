// public/js/coach.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            coaches: [], // Inizia vuoto, si riempirà tramite il database
            selectedCoach: null, // Conterrà i dati dell'allenatore cliccato per mostrarli nel pop-up
            modalInstance: null, // Conterrà l'oggetto tecnico del pop-up di Bootstrap
            loading: true
        }
    },
    mounted() {
        // Appena la pagina è caricata, prepariamo il pop-up (nascosto) per poterlo aprire dopo
        this.modalInstance = new bootstrap.Modal(document.getElementById('coachModal'));
        
        // E lanciamo subito la richiesta al server per scaricare i coach
        this.caricaAllenatori();
    },
    methods: {
        // Funzione che contatta il tuo server (sostituisci l'URL con la tua vera rotta API se diversa)
        async caricaAllenatori() {
            try {
                // Esempio: supponiamo che il backend abbia una rotta che restituisce gli utenti con ruolo "allenatore"
                const res = await fetch('/api/allenatori'); 
                if (res.ok) {
                    const dati = await res.json();
                    this.coaches = dati; // Salviamo i coach reali provenienti dal DB!
                } else {
                    console.error("Errore nel recupero degli allenatori.");
                }
            } catch (error) {
                console.error("Errore di connessione al server:", error);
            } finally {
                this.loading = false; // Abbiamo finito di caricare, anche se c'è stato un errore
            }
        },
        
        // Funzione chiamata quando si clicca il bottone sulla card
        apriDettagli(coach) {
            this.selectedCoach = coach; // Copiamo i dati del coach specifico in selectedCoach
            this.modalInstance.show(); // Apriamo il pop-up
        }
    }
});

// Registriamo i componenti globali (Navbar e Footer)
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Montiamo l'app
app.mount('#app');