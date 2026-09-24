# Fitness Tracker

Web app per la gestione di allenamenti e alimentazione che mette in contatto **sportivi** e **allenatori**, con un **manager** che amministra la piattaforma.

Lo sportivo si registra, sceglie un allenatore e riceve schede di allenamento e piani alimentari personalizzati, che può consultare online o scaricare in PDF.

**Sito online:** <https://fitness-tracker-n5ye.onrender.com/>

## Funzionalità

| Ruolo | Cosa può fare |
|---|---|
| **Sportivo** | Registrazione e login, gestione del profilo (peso, altezza, obiettivi, esperienza), scelta dell'allenatore, consultazione delle schede di allenamento e delle diete, download in PDF |
| **Allenatore** | Gestione del profilo con foto, accettazione delle richieste degli sportivi, creazione di schede di allenamento (esercizi, serie, ripetizioni, recupero) e piani alimentari (alimenti, grammi, note per pasto) |
| **Manager** | Gestione di allenatori, catalogo esercizi (con immagini) e catalogo alimenti (con valori nutrizionali), lettura dei messaggi arrivati dal modulo contatti |
| **Visitatore** | Home, elenco degli allenatori, modulo contatti |

## Tecnologie

- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL (hostato su [Neon](https://neon.tech))
- **Autenticazione:** express-session con sessioni salvate su PostgreSQL (connect-pg-simple), password cifrate con bcrypt
- **Upload immagini:** multer; le immagini vengono salvate nel database perché il disco dell'hosting non è permanente
- **PDF:** PDFKit
- **Frontend:** HTML, CSS, JavaScript vanilla, Bootstrap 5 e Bootstrap Icons
- **Deploy:** [Render](https://render.com)

## Struttura del progetto

```
fitness-tracker/
├── server.js          # Server Express: API REST, autenticazione, upload, generazione PDF
├── db/schema.sql      # Schema del database
├── public/            # Frontend servito come file statici
│   ├── *.html         # Pagine (home, login, registrazione, dashboard per ruolo, coach, contatti, 404)
│   ├── css/style.css
│   ├── js/            # Uno script per pagina + components.js (navbar e footer condivisi)
│   ├── img/           # Logo e immagini del sito
│   └── uploads/       # Immagini caricate prima del passaggio al salvataggio su database
├── .env.example       # Modello per le variabili d'ambiente
└── package.json
```

## Avvio in locale

Serve **Node.js 18** o superiore e un database PostgreSQL (ad esempio un progetto gratuito su Neon).

```bash
git clone https://github.com/simonegargiullo/fitness-tracker.git
cd fitness-tracker
npm install
cp .env.example .env    # poi inserisci i valori reali
```

Variabili d'ambiente in `.env`:

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Stringa di connessione PostgreSQL (`postgresql://utente:password@host/db?sslmode=require`) |
| `SESSION_SECRET` | Stringa lunga e casuale usata per firmare i cookie di sessione |
| `PORT` | Facoltativa, di default `3000` |

Crea le tabelle eseguendo `db/schema.sql` sul database (dall'SQL editor di Neon oppure con `psql "$DATABASE_URL" -f db/schema.sql`), poi avvia il server:

```bash
npm start
```

Il sito è raggiungibile su <http://localhost:3000>.

La registrazione dal sito crea solo account sportivo. Il primo manager si crea a mano nel database (vedi le istruzioni in fondo a `db/schema.sql`); gli allenatori li crea poi il manager dalla sua dashboard.

## Deploy

Il progetto è pensato per Render (Web Service, build `npm install`, start `npm start`) con le variabili `DATABASE_URL` e `SESSION_SECRET` impostate nel pannello. L'endpoint `GET /health` interroga il database e può essere chiamato periodicamente da un servizio esterno (ad esempio cron-job.org) per evitare che server e database vadano in sospensione.

## Autori

- Simone Gargiullo
- Andrea Lepone
