// Questo file contiene i componenti Vue.js per Navbar e Footer, più la funzione globale per i toast di notifica
// Questi vengono inclusi in tutte le pagine HTML tramite <script src="js/components.js"></script> e usati come
// <navbar-component></navbar-component> e <footer-component></footer-component>
// In questo modo si evita di ripetere lo stesso codice in ogni pagina e si centralizza la logica di sessione e navigazione

const NavbarComponent = {
  // "template" definisce l'HTML del componente.
  // Usando i backtick (template literal) possiamo scrivere HTML su più righe.
  template: `
    <!--
      <nav> con classi Bootstrap:
        - navbar-expand-lg: il menu si espande orizzontalmente da 992px in su; sotto quella soglia appare il bottone hamburger
        - navbar-dark: testo e icone chiari (per sfondi scuri)
        - bg-dark: sfondo nero/scuro
        - fixed-top: navbar fissa in cima alla pagina, sempre visibile mentre si scrolla
        - shadow-sm: leggera ombra sotto per separare visivamente dal contenuto
    -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-sm">

      <!-- .container centra il contenuto e limita la larghezza massima -->
      <div class="container">


        <!-- LOGO E NOME DEL SITO -->
        <!--
          navbar-brand: stile Bootstrap per il logo/nome del sito
          d-flex + align-items-center + gap-2: affianca logo e testo con uno spazio tra loro
          fw-bold fs-4: testo in grassetto, dimensione 4 (circa 1.5rem)
        -->
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4" href="index.html">

          <!-- Logo SVG: navbar-logo è una classe custom in style.css che ne controlla le dimensioni -->
          <img src="img/logo.svg" alt="Logo" class="navbar-logo">

          <!--
            Il nome è diviso in due <span>:
              - "Fitness" eredita il colore chiaro della navbar
              - "Tracker" ha text-primary: verde (colore principale del tema, ridefinito in style.css)
          -->
          <span>Fitness<span class="text-primary">Tracker</span></span>
        </a>


        <!-- BOTTONE HAMBURGER -->
        <!--
          Visibile solo su schermi < 992px (Bootstrap lo nasconde automaticamente su lg+).
          data-bs-toggle="collapse": attiva il meccanismo collapse di Bootstrap (collapse = nascondi/mostra un blocco di contenuto)
          data-bs-target="#navbarNav": collega il bottone al <div> con id="navbarNav"
          aria-controls, aria-expanded, aria-label: attributi di accessibilità per screen reader
        -->
        <button class="navbar-toggler" type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNav"
                aria-controls="navbarNav"
                aria-expanded="false"
                aria-label="Apri menu">
          <!-- Icona hamburger fornita direttamente da Bootstrap -->
          <span class="navbar-toggler-icon"></span>
        </button>


        <!-- MENU COLLASSABILE -->
        <!--
          collapse navbar-collapse: questo blocco è nascosto su mobile; si mostra/nasconde al click dell'hamburger
          id="navbarNav": deve corrispondere al data-bs-target del bottone hamburger
        -->
        <div class="collapse navbar-collapse" id="navbarNav">

          <!-- navbar-nav: lista di voci di menu in stile Bootstrap
               me-auto: spinge tutto il resto verso destra (margin-end: auto)
               ms-4: piccolo rientro dal logo -->
          <ul class="navbar-nav me-auto ms-4">

            <!-- Voce: Home -->
            <li class="nav-item">
              <!--
                :class è la direttiva Vue per classi dinamiche.
                Aggiunge la classe "active" (evidenzia il link corrente) se paginaAttuale
                è "index.html" oppure "" (stringa vuota = root del sito).
                @click="chiudiMenu": al click chiama il metodo Vue chiudiMenu(),
                che richiude il menu hamburger su mobile dopo la navigazione.
              -->
              <a class="nav-link"
                 :class="{ active: paginaAttuale === 'index.html' || paginaAttuale === '' }"
                 href="index.html"
                 @click="chiudiMenu">Home</a>
            </li>

            <!-- Voce: Coach -->
            <li class="nav-item">
              <a class="nav-link"
                 :class="{ active: paginaAttuale === 'coach.html' }"
                 href="coach.html"
                 @click="chiudiMenu">Coach</a>
            </li>

            <!-- Voce: Contatti -->
            <li class="nav-item">
              <a class="nav-link"
                 :class="{ active: paginaAttuale === 'contatti.html' }"
                 href="contatti.html"
                 @click="chiudiMenu">Contatti</a>
            </li>
          </ul>


          <!-- SEZIONE DESTRA -->
          <!--
            Contiene i bottoni di accesso (se non loggato) o le info utente (se loggato).
            Layout:
              - flex-column: elementi in colonna su mobile/landscape
              - flex-lg-row: elementi in riga da 992px in su
              - gap-3: spazio uniforme tra i bottoni di accesso o le info utente + bottoni dashboard/logout
              - align-items-start: allineamento a sinistra su mobile
              - align-items-lg-center: allineamento verticale centrato su desktop
              - mt-3 mt-lg-0: margine sopra su mobile, rimosso su desktop
              - pb-3 pb-lg-0: padding sotto su mobile (spazio prima della chiusura del menu), rimosso su desktop
          -->
          <div class="d-flex flex-column flex-lg-row gap-3 align-items-start align-items-lg-center mt-3 mt-lg-0 pb-3 pb-lg-0">


            <!-- UTENTE NON LOGGATO -->
            <!--
              <template v-if> è un elemento Vue invisibile:
              raggruppa elementi condizionali senza aggiungere un tag HTML extra.
              Mostra questo blocco solo se utenteLoggato è false/null.
            -->
            <template v-if="!utenteLoggato">

              <!-- Link "Accedi": stile bottone-link, testo chiaro, nessuna sottolineatura -->
              <a href="login.html"
                 class="btn btn-link text-light text-decoration-none fw-semibold px-0 ms-4 ms-lg-0"
                 @click="chiudiMenu">Accedi</a>

              <!-- Bottone "Inizia Ora": colore primario, forma a pillola -->
              <a href="registrati.html"
                 class="btn btn-primary fw-bold px-4 rounded-pill text-white"
                 @click="chiudiMenu">Inizia Ora</a>
            </template>


            <!-- UTENTE LOGGATO -->
            <!--
              <template v-else> è il ramo opposto: mostrato quando utenteLoggato è truthy (non null o non false).
            -->
            <template v-else>

              <!--
                Messaggio di benvenuto personalizzato.
                {{ nomeUtente }} è una interpolazione Vue: inserisce il valore della proprietà reattiva nomeUtente.
                mb-2 mb-lg-0: margine sotto su mobile, rimosso su desktop
                ms-3 ms-lg-0: rientro a sinistra su mobile, rimosso su desktop
              -->
              <span class="text-white mb-2 mb-lg-0 small ms-3 ms-lg-0">
                Bentornato, <strong>{{ nomeUtente }}</strong>
              </span>

              <!-- Contenitore affiancato per i due bottoni azione -->
              <div class="d-flex gap-2 ms-3 ms-lg-0">

                <!--
                  Bottone Dashboard: il link di destinazione è dinamico.
                  :href="urlDashboard" → Vue calcola l'URL corretto in base al ruolo
                  dell'utente (es. manager-dashboard.html o atleta-dashboard.html).
                -->
                <a :href="urlDashboard"
                   class="btn btn-primary fw-bold rounded-pill px-3 text-white"
                   @click="chiudiMenu">
                  <!-- Icona razzo da Bootstrap Icons -->
                  <i class="bi bi-rocket-takeoff"></i> Dashboard
                </a>

                <!--
                  Bottone Esci: è un <button>, non un <a>, perché non naviga ma esegue un'azione (logout).
                  @click="logout": chiama il metodo Vue logout(), che rimuove i dati di sessione e reindirizza alla home o al login.
                  btn-outline-light: bordo e testo chiari, sfondo trasparente
                -->
                <button @click="logout"
                        class="btn btn-outline-light rounded-pill px-3">Esci</button>
              </div>
            </template>


          </div>
        </div>
      </div>
    </nav>
  `,
  // Dati reattivi per gestire lo stato di login, ruolo, nome utente e pagina attuale
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
        const res = await fetch("/api/sessione"); // Endpoint che restituisce { loggato: true/false, utente: { nome, ruolo } }
        const dati = await res.json(); // Se loggato, aggiorna lo stato con nome, ruolo e URL della dashboard corrispondente
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

    // Chiude il menu a tendina su mobile/landscape dopo il click su un link
    chiudiMenu() {
      const navbarCollapse = document.getElementById("navbarNav"); // Se il menu è aperto, lo chiude usando l'API di Bootstrap
      if (navbarCollapse && navbarCollapse.classList.contains("show")) {
        bootstrap.Collapse.getInstance(navbarCollapse)?.hide();
      }
    },

    // Esegue il logout chiamando l'API e torna alla home
    async logout() {
      // Chiamata POST a /api/logout per distruggere la sessione lato server
      await fetch("/api/logout", { method: "POST" });
      // Resetta lo stato locale e reindirizza alla home
      window.location.href = "index.html";
    },
  },
};

const FooterComponent = {
  template: `
    <!-- Footer semplice con sfondo scuro, testo bianco e anno dinamico -->
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
      // new Date().getFullYear() restituisce l'anno corrente
      anno: new Date().getFullYear(),
    };
  },
};

// mostraNotifica — funzione globale per i toast Bootstrap
window.mostraNotifica = function (messaggio, tipo = "success") {
  // Crea il contenitore dei toast se non esiste ancora
  let container = document.getElementById("toast-container-globale");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container-globale";
    container.className = "toast-container position-fixed bottom-0 end-0 p-4"; // Posiziona i toast in basso a destra con un po' di padding
    container.style.zIndex = "9999"; // Assicura che i toast siano sopra altri elementi
    document.body.appendChild(container);
    // Aggiunge il contenitore al body se non esisteva, così i toast possono essere mostrati da qualsiasi pagina senza dover includere un elemento specifico in HTML
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
  // Usa le classi di Bootstrap per lo stile del toast, con sfondo, testo bianco, bordi arrotondati e ombra.
  // Aggiunge un margine inferiore per distanziare i toast se ce ne sono più di uno.
  // Se è un warning, rimuove la classe text-white perché il testo deve essere scuro per essere leggibile su sfondo giallo.
  if (tipo === "warning") toastEl.classList.remove("text-white");
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  // Contenuto del toast con icona e messaggio, più il bottone di chiusura
  toastEl.innerHTML = `
    <!-- Usa flexbox per allineare l'icona e il testo, con un po' di gap tra loro -->
    <div class="d-flex p-2">
      <!-- Il corpo del toast con l'icona a sinistra e il messaggio a destra, entrambi centrati verticalmente -->
      <div class="toast-body fw-bold d-flex align-items-center gap-2 fs-6">
        <!-- L'icona usa le classi di Bootstrap Icons per mostrare un simbolo diverso a seconda del tipo di notifica -->
        <i class="bi ${iconClass} fs-5"></i>
        <span>${messaggio}</span>
      </div>
      <!-- Bottone di chiusura posizionato a destra, con margine automatico per spingerlo all'estremità -->
      <button type="button" class="btn-close ${tipo !== "warning" ? "btn-close-white" : ""} me-2 m-auto"
              data-bs-dismiss="toast" aria-label="Chiudi"></button>
    </div>
  `;

  container.appendChild(toastEl);
  // Aggiunge il nuovo toast al contenitore, così viene mostrato in basso a destra. Se ci sono più toast, si accumulano verso l'alto grazie al margine inferiore.

  // Mostra il toast e rimuovilo dopo che scompare (3.5s)
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
};