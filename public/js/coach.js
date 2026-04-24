// public/js/coach.js

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Simuliamo il database degli allenatori
            // In futuro, questo array si riempirà tramite una fetch() al tuo server!
            coaches: [
                { 
                    id: 1, 
                    nome: 'Marco Valeri', 
                    specialita: 'Forza e Ipertrofia', 
                    foto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop', 
                    descrizione: 'Specializzato in powerlifting e aumento della massa muscolare. Ti aiuterò a superare i tuoi limiti in sala pesi.' 
                },
                { 
                    id: 2, 
                    nome: 'Giulia Bianchi', 
                    specialita: 'Dimagrimento e Tonificazione', 
                    foto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop', 
                    descrizione: 'Esperta in circuit training e HIIT. Insieme costruiremo un percorso divertente per raggiungere il tuo peso forma ideale.' 
                },
                { 
                    id: 3, 
                    nome: 'Alessandro Costa', 
                    specialita: 'Riabilitazione e Postura', 
                    foto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop', 
                    descrizione: 'Fisioterapista e personal trainer. Il mio obiettivo è farti allenare in totale sicurezza, correggendo la postura ed eliminando i dolori.' 
                }
            ]
        }
    }
});

// Registriamo i componenti globali (Navbar e Footer)
app.component('app-navbar', NavbarComponent);
app.component('app-footer', FooterComponent);

// Montiamo l'app
app.mount('#app');