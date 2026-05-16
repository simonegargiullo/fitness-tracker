// Tecnologie usate:
//   - Express 5 (framework HTTP per Node.js)
//   - express-session (gestione sessioni utente (login/logout))
//   - connect-pg-simple (salva le sessioni nel database PostgreSQL)
//   - bcrypt (cifratura sicura delle password)
//   - multer (upload di file (foto profilo, immagini esercizi))
//   - pg (Pool) (connessione al database Supabase (PostgreSQL))
//   - dotenv (variabili d'ambiente da file .env (sicurezza))

require('dotenv').config(); // Carica le variabili d'ambiente da .env (mai committare il file reale!)
const express = require("express");
const multer = require("multer");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const saltRounds = 10; // Numero di cicli bcrypt: 10 è lo standard raccomandato (sicuro ma non troppo lento)

// UPLOAD FILE — Multer
// Gestisce l'upload delle immagini (foto profilo allenatore, immagini esercizi).
// I file vengono salvati nella cartella public/uploads/
// Il nome file è reso unico aggiungendo un timestamp + numero casuale.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Salva i file in questa cartella
  },
  filename: function (req, file, cb) {
    // Genera un nome unico (data_attuale + nome_originale) per evitare che due foto si sovrascrivano
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

// CONNESSIONE AL DATABASE — Pool PostgreSQL (Supabase)
// Pool = gruppo di connessioni riutilizzabili (più efficiente di una connessione singola).
// I parametri sensibili vengono letti dal file .env tramite process.env.*
const pool = new Pool({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.zgsmezhausuhdflhfnuq",
  password: process.env.DB_PASSWORD, 
  database: "postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verifica della connessione al database all'avvio del server
pool.connect((err, client, release) => {
  if (err) {
    console.error("Impossibile connettersi al database:", err.stack);
  } else {
    console.log("Connessione al database PostgreSQL riuscita.");
    release(); // Rilascia subito la connessione al pool
  }
});

// SESSIONI — express-session + connect-pg-simple
// Le sessioni tengono traccia di chi è loggato sul sito.
// Vengono salvate nel database (tabella "session") invece che in memoria,
// così non si perdono al riavvio del server.
// Il cookie dura 24 ore, dopodiché l'utente deve rifare il login.
app.use(
  session({
    store: new pgSession({
      pool: pool, // Usa la connessione
      tableName: "session", // In questa tabella si salva chi ha fatto login
      createTableIfMissing: true, // Crea la tabella se non esiste
    }),
    secret: process.env.SESSION_SECRET, // Usata per criptare i dati
    resave: false, // Non salva la sessione se non è stata modificata
    saveUninitialized: false, // Non salva sessioni vuote
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // Il login dura 1 giorno
  }),
);

// MIDDLEWARES — elaborazione richieste in ingresso
app.use(express.json()); // Legge il body JSON delle richieste (es. dati login/registrazione)
app.use(express.urlencoded({ extended: true })); // Legge i dati inviati da form HTML classici
app.use(express.static(path.join(__dirname, "public"))); // Serve tutti i file HTML/CSS/JS/img dalla cartella public/

// REGISTRAZIONE E ACCESSO
// API:
//   registrati (crea un nuovo sportivo (utente + profilo))
//   login (autentica l'utente e crea la sessione)
//   logout (distrugge la sessione e cancella il cookie)

// registrati
// Riceve i dati del form di registrazione.
// Usa una transazione SQL (BEGIN/COMMIT/ROLLBACK) per garantire che
// l'utente e il suo profilo sportivo vengano creati INSIEME:
// se uno dei due INSERT fallisce, nessuno viene salvato.
app.post("/api/registrati", async (req, res) => {
  const { nome, email, password, sesso, data_nascita, peso, altezza, obiettivo, attitudini, esperienza_pregressa } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ message: "La password deve contenere almeno 8 caratteri." });
  }
  // 400 è una "bad request" di HTTP: i dati inviati non sono validi
  // .json invia una risposta JSON al client (frontend) con un messaggio di errore

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertUtenteQuery = `
          INSERT INTO utenti (nome, email, password, ruolo)
          VALUES ($1, $2, $3, 'sportivo')
          RETURNING id;
      `;
      const resultUtente = await client.query(insertUtenteQuery, [nome, email, hashedPassword]);
      const nuovoUtenteId = resultUtente.rows[0].id;

      const insertProfiloQuery = `
          INSERT INTO profili_sportivi (id_utente, sesso, data_nascita, peso, altezza, obiettivo, attitudini, esperienza_pregressa)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      await client.query(insertProfiloQuery, [nuovoUtenteId, sesso, data_nascita, peso, altezza, obiettivo, attitudini, esperienza_pregressa]);

      await client.query("COMMIT");
      // commit = conferma la transazione: i dati vengono salvati definitivamente nel database
      res.status(201).json({ message: "Registrazione completata con successo!" });
      // 201 = "created": la risorsa (utente) è stata creata con successo
    } catch (error) {
      await client.query("ROLLBACK");
      // rollback = annulla la transazione: se c'è un errore, nessun dato viene salvato (né utente né profilo)
      throw error;
    } finally {
      client.release();
      // Rilascia la connessione al pool, così può essere riutilizzata da altre richieste
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore durante la registrazione." });
    // 500 è un "internal server error": qualcosa è andato storto nel server
  }
});

// login
// Cerca l'utente nel DB tramite email, poi confronta la password
// con bcrypt.compare() (non si decripta mai, ma si confronta l'hash).
// Se corretta, salva in sessione: id, ruolo e nome dell'utente.
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM utenti WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email o password errati." });
    }

    const utente = result.rows[0];
    const match = await bcrypt.compare(password, utente.password);

    if (!match) {
      return res.status(401).json({ message: "Email o password errati." });
    }

    req.session.utenteId = utente.id;
    req.session.ruolo = utente.ruolo;
    req.session.nome = utente.nome;

    res.json({ message: "Login effettuato!", ruolo: utente.ruolo });
  } catch (err) {
    console.error("Errore durante il login:", err);
    res.status(500).json({ message: "Errore interno del server." });
  }
});

// logout
// Distrugge la sessione lato server e cancella il cookie nel browser.
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Errore durante il logout." });
    }
    res.clearCookie("connect.sid"); 
    res.json({ message: "Logout effettuato." });
  });
});

// req e res sono gli oggetti "request" e "response" di Express, che rappresentano la richiesta del client
// e la risposta del server.

// CONTROLLO SESSIONE
// API:
//   sessione (restituisce i dati dell'utente loggato)
//   Usata da components.js per mostrare/nascondere elementi nella navbar

// sessione, usata dal frontend a ogni caricamento pagina
app.get("/api/sessione", (req, res) => {
  if (req.session.utenteId) {
    res.json({
      loggato: true,
      utente: {
        id: req.session.utenteId,
        nome: req.session.nome,
        ruolo: req.session.ruolo,
      },
    });
  } else {
    res.json({ loggato: false });
  }
});

// API MANAGER
// Il middleware verificaManager() blocca le richieste non autorizzate (agli utenti non manager).
// API (tutte protette da verificaManager):
//   POST   /allenatori (crea allenatore)
//   PUT    /allenatori/:id (modifica allenatore)
//   DELETE /allenatori/:id (elimina allenatore)
//   POST   /esercizi       (aggiunge esercizio al catalogo)
//   PUT    /esercizi/:id   (modifica esercizio)
//   DELETE /esercizi/:id   (elimina esercizio)
//   POST   /alimenti       (aggiunge alimento al catalogo)
//   PUT    /alimenti/:id   (modifica alimento)
//   DELETE /alimenti/:id   (elimina alimento)

// verificaManager — middleware di protezione
// Se l'utente non ha ruolo "manager", blocca la richiesta con HTTP 403.
// Si usa aggiungendolo come secondo argomento in app.post/put/delete.
const verificaManager = (req, res, next) => {
  if (req.session.ruolo === "manager") {
    next(); // L'utente è autorizzato: passa alla funzione successiva
  } else {
    res.status(403).json({ message: "Accesso negato. Solo i manager possono eseguire questa azione." });
  }
};

// MANAGER: Creazione nuovo Allenatore
app.post("/api/manager/allenatori", verificaManager, upload.single("foto"), async (req, res) => {
  const { nome, cognome, email, password, specialita, descrizione, telefono } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ message: "La password deve essere di almeno 8 caratteri." });
  }

  const foto_url = req.file ? "/uploads/" + req.file.filename : null;
  // Se è stata caricata una foto, costruisce l'URL relativo; altrimenti, lascia null

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN"); 

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const insertUtente = await client.query(
        "INSERT INTO utenti (nome, email, password, ruolo) VALUES ($1, $2, $3, 'allenatore') RETURNING id",
        [nome, email, hashedPassword],
      );

      const nuovoId = insertUtente.rows[0].id;
      // Inserisce il profilo dell'allenatore con l'id dell'utente appena creato

      await client.query(
        "INSERT INTO profili_allenatori (id_utente, cognome, specialita, descrizione, foto, telefono) VALUES ($1, $2, $3, $4, $5, $6)",
        [nuovoId, cognome, specialita, descrizione, foto_url, telefono],
      );

      await client.query("COMMIT"); 
      // commit = conferma la transazione: se siamo arrivati fin qui senza errori, i dati vengono salvati
      // definitivamente nel database
      res.json({ message: "Allenatore creato con successo!" });
    } catch (error) {
      await client.query("ROLLBACK"); 
      // rollback = annulla la transazione: se c'è un errore, nessun dato viene salvato (né utente né profilo)
      throw error;
    } finally {
      client.release();
      // rilascio la connessione al pool, così può essere riutilizzata da altre richieste
    }
  } catch (err) {
    console.error("Errore salvataggio allenatore:", err);
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Modifica Allenatore
app.put("/api/manager/allenatori/:id", verificaManager, upload.single("foto"), async (req, res) => {
  const id = req.params.id;
  // L'id dell'allenatore da modificare, passato come parametro nell'URL
  const pulisci = (val) => val === "null" || val === "undefined" || val === "" ? null : val;
  // Funzione di pulizia: se il campo è vuoto o contiene "null"/"undefined", lo converte in null (così si può cancellare
  // un dato esistente)

  const nome = pulisci(req.body.nome);
  const cognome = pulisci(req.body.cognome);
  const email = pulisci(req.body.email);
  const specialita = pulisci(req.body.specialita);
  const descrizione = pulisci(req.body.descrizione);
  const telefono = pulisci(req.body.telefono);

  const nuovaFotoUrl = req.file ? "/uploads/" + req.file.filename : null;
  // Se è stata caricata una nuova foto, costruisce l'URL relativo; altrimenti,
  // lascia null (così non si sovrascrive la foto esistente)

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // begin = inizio transazione: da qui in poi, tutte le query devono riuscire perché
      // altrimenti si annullano tutte (rollback)

      await client.query("UPDATE utenti SET nome=$1, email=$2 WHERE id=$3", [nome, email, id]);
      // Aggiorna i dati nella tabella utenti

      const queryProfilo = `
          INSERT INTO profili_allenatori (id_utente, cognome, specialita, descrizione, telefono, foto)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id_utente) DO UPDATE SET
              cognome = EXCLUDED.cognome,
              specialita = EXCLUDED.specialita,
              descrizione = EXCLUDED.descrizione,
              telefono = EXCLUDED.telefono,
              foto = COALESCE(EXCLUDED.foto, profili_allenatori.foto);
      `;
      // Questa query usa "INSERT ... ON CONFLICT ... DO UPDATE" per fare un "upsert":
      // se il profilo esiste già, lo aggiorna; se non esiste, lo crea. Inoltre, per la foto usa COALESCE per mantenere
      // la foto esistente se non viene caricata una nuova.

      await client.query(queryProfilo, [id, cognome, specialita, descrizione, telefono, nuovaFotoUrl]);
      // Aggiorna o inserisce i dati nella tabella profili_allenatori con l'id dell'utente corrispondente
      // all'allenatore da modificare

      await client.query("COMMIT");
      // commit = conferma la transazione: se siamo arrivati fin qui senza errori, i dati vengono salvati
      // definitivamente nel database
      res.json({ message: "Coach aggiornato con successo!" });
    } catch (err) {
      await client.query("ROLLBACK");
      // rollback = annulla la transazione: se c'è un errore, nessun dato viene salvato (né nella tabella utenti
      // né in profili_allenatori)
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: "Errore durante il salvataggio nel database." });
  }
});

// MANAGER: Inserimento Esercizio 
app.post("/api/manager/esercizi", verificaManager, upload.single("immagine_file"), async (req, res) => {
  const { nome, gruppo_muscolare } = req.body;
  //nome e gruppo_muscolare vengono inviati come campi del form, mentre l'immagine viene gestita da multer (req.file)
  const url_immagine = req.file ? "/uploads/" + req.file.filename : null;
  // Se è stata caricata un'immagine, costruisce l'URL relativo; altrimenti, lascia null

  try {
    await pool.query(
      "INSERT INTO esercizi (nome, gruppo_muscolare, url_immagine) VALUES ($1, $2, $3)",
      [nome, gruppo_muscolare, url_immagine],
    );
    res.json({ message: "Esercizio e immagine aggiunti al catalogo!" });
  } catch (err) {
    console.error("Errore salvataggio esercizio:", err);
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Modifica Esercizio
app.put("/api/manager/esercizi/:id", verificaManager, upload.single("immagine_file"), async (req, res) => {
  const id = req.params.id;
  // L'id dell'esercizio da modificare, passato come parametro nell'URL
  const { nome, gruppo_muscolare } = req.body;
  // nome e gruppo_muscolare vengono inviati come campi del form, mentre l'immagine viene gestita da multer (req.file)

  try {
    if (req.file) {
      const url_immagine = "/uploads/" + req.file.filename;
      await pool.query(
        "UPDATE esercizi SET nome=$1, gruppo_muscolare=$2, url_immagine=$3 WHERE id=$4",
        [nome, gruppo_muscolare, url_immagine, id],
      );
    } else {
      await pool.query(
        "UPDATE esercizi SET nome=$1, gruppo_muscolare=$2 WHERE id=$3",
        [nome, gruppo_muscolare, id],
      );
    }
    res.json({ message: "Esercizio aggiornato!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Elimina Esercizio
app.delete("/api/manager/esercizi/:id", verificaManager, async (req, res) => {
  try {
    await pool.query("DELETE FROM esercizi WHERE id = $1", [req.params.id]);
    // Elimina l'esercizio con l'id specificato
    res.json({ message: "Esercizio eliminato" });
  } catch (err) {
    res.status(400).json({ error: "Impossibile eliminare: l'esercizio è usato in una o più schede." });
  }
});

// MANAGER: Inserimento Alimento
app.post("/api/manager/alimenti", verificaManager, async (req, res) => {
  const { nome, calorie, proteine, carboidrati, grassi } = req.body;
  // Tutti i dati vengono inviati come campi del form, quindi sono disponibili in req.body
  try {
    await pool.query(
      "INSERT INTO alimenti (nome, calorie, proteine, carboidrati, grassi) VALUES ($1, $2, $3, $4, $5)",
      [nome, calorie, proteine, carboidrati, grassi],
    );
    res.json({ message: "Alimento aggiunto!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Modifica Alimento
app.put("/api/manager/alimenti/:id", verificaManager, async (req, res) => {
  const { id } = req.params;
  // L'id dell'alimento da modificare, passato come parametro nell'URL
  const { nome, calorie, proteine, carboidrati, grassi } = req.body;
  // Tutti i dati vengono inviati come campi del form, quindi sono disponibili in req.body
  try {
    await pool.query(
      "UPDATE alimenti SET nome=$1, calorie=$2, proteine=$3, carboidrati=$4, grassi=$5 WHERE id=$6",
      [nome, calorie, proteine, carboidrati, grassi, id],
    );
    res.json({ message: "Alimento aggiornato!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Elimina Alimento
app.delete("/api/manager/alimenti/:id", verificaManager, async (req, res) => {
  try {
    await pool.query("DELETE FROM alimenti WHERE id = $1", [req.params.id]);
    // Elimina l'alimento con l'id specificato
    res.json({ message: "Alimento eliminato" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MANAGER: Elimina Allenatore
app.delete("/api/manager/allenatori/:id", verificaManager, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN"); // Inizio transazione: se qualcosa va storto, si annullano tutte le operazioni
      await client.query("DELETE FROM profili_allenatori WHERE id_utente = $1", [req.params.id]);
      // Elimina prima il profilo dell'allenatore, poi l'utente stesso (che ha ruolo "allenatore")
      await client.query("DELETE FROM utenti WHERE id = $1 AND ruolo = 'allenatore'", [req.params.id]);
      await client.query("COMMIT");
      // Se siamo arrivati fin qui senza errori, confermiamo la transazione: i dati vengono eliminati
      // definitivamente dal database
      res.json({ message: "Allenatore e relativo account eliminati" });
    } catch (err) {
      await client.query("ROLLBACK");
      // Se c'è un errore, annulliamo la transazione: nessun dato viene eliminato (né in profili_allenatori né in utenti)
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CATALOGHI PUBBLICI
// API accessibili da tutti gli utenti loggati:
//   GET esercizi (lista esercizi ordinata per gruppo muscolare)
//   GET alimenti (lista alimenti ordinata per nome)
//   GET allenatori (lista coach con dati profilo (JOIN su due tabelle))

app.get("/api/esercizi", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM esercizi ORDER BY gruppo_muscolare, nome");
    // Ordina prima per gruppo muscolare, poi per nome all'interno di ogni gruppo
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/alimenti", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM alimenti ORDER BY nome");
    // Ordina i risultati per nome
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/allenatori", async (req, res) => {
  try {
    const query = `
        SELECT u.id, u.nome, u.email, 
               pa.cognome, pa.specialita, pa.descrizione, pa.foto, pa.telefono
        FROM utenti u
        LEFT JOIN profili_allenatori pa ON u.id = pa.id_utente
        WHERE u.ruolo = 'allenatore'
    `; // JOIN tra utenti e profili_allenatori per ottenere tutti i dati del coach in un'unica query
    const result = await pool.query(query);
    res.json(result.rows);
    // Restituisce un array di allenatori con i dati combinati di entrambe le tabelle
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API SPORTIVO
// Tutte protette dal middleware verificaSportivo.
// API:
//   GET  /profilo (legge i dati del profilo)
//   PUT  /profilo (aggiorna peso, altezza, obiettivo...)
//   GET  /stato (stato richiesta e nome coach)
//   POST /scegli-allenatore (invia richiesta a un coach)
//   GET  /mie-schede (schede allenamento assegnate)
//   GET  /mie-diete (piani alimentari assegnati)

// verificaSportivo
// Middleware di protezione: se l'utente non ha ruolo "sportivo", blocca la richiesta con HTTP 403.
const verificaSportivo = (req, res, next) => {
  if (req.session.ruolo === "sportivo") {
    next();
  } else {
    res.status(403).json({ message: "Accesso negato. Area riservata agli sportivi." });
  }
};

// SPORTIVO: Lettura Profilo
app.get("/api/sportivo/profilo", verificaSportivo, async (req, res) => {
  try {
    const query = `
        SELECT u.nome, u.email, p.sesso,
               TO_CHAR(p.data_nascita, 'YYYY-MM-DD') AS data_nascita, -- formatta la data per i campi <input type="date">
               p.peso, p.altezza, p.obiettivo, p.attitudini, p.esperienza_pregressa
        FROM utenti u
        JOIN profili_sportivi p ON u.id = p.id_utente
        WHERE u.id = $1
    `;
    // JOIN tra utenti e profili_sportivi per ottenere tutti i dati del profilo in un'unica query
    const result = await pool.query(query, [req.session.utenteId]);
    // Usa l'id dell'utente loggato (dalla sessione) per leggere il suo profilo
    if (result.rows.length > 0) {
      res.json(result.rows[0]); // Restituisce i dati del profilo come JSON
    } else {
      res.status(404).json({ message: "Profilo non trovato." });
      // 404 = "not found": il profilo dell'utente loggato non esiste
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
    // 500 = "internal server error": qualcosa è andato storto nel server
  }
});

// SPORTIVO: Modifica Profilo
app.put("/api/sportivo/profilo", verificaSportivo, async (req, res) => {
  const { nome, email, peso, altezza, obiettivo, attitudini, esperienza_pregressa } = req.body;
  // I dati aggiornati del profilo, inviati dal form di modifica
  try {
    const client = await pool.connect(); // Ottiene una connessione dal pool per eseguire una transazione
    try {
      await client.query("BEGIN"); // Inizio transazione: se qualcosa va storto, si annullano tutte le operazioni
      
      await client.query("UPDATE utenti SET nome = $1, email = $2 WHERE id = $3", 
          [nome, email, req.session.utenteId]
      ); // Aggiorna i dati nella tabella utenti (nome e email)
      
      await client.query(`
          UPDATE profili_sportivi 
          SET peso = $1, altezza = $2, obiettivo = $3, attitudini = $4, esperienza_pregressa = $5 
          WHERE id_utente = $6`,
          [peso, altezza, obiettivo, attitudini, esperienza_pregressa, req.session.utenteId]
      ); // Aggiorna i dati nella tabella profili_sportivi (peso, altezza, obiettivo, attitudini, esperienza_pregressa)
      
      req.session.nome = nome;
      // Aggiorniamo il nome in sessione così che venga mostrato correttamente nella navbar dopo la modifica del profilo
      await client.query("COMMIT");
      // Se siamo arrivati fin qui senza errori, confermiamo la transazione: i dati vengono salvati
      // definitivamente nel database
      res.json({ message: "Profilo aggiornato con successo!" });
    } catch (error) {
      await client.query("ROLLBACK"); // Se c'è un errore, annulliamo la transazione: nessun dato viene
      // aggiornato (né in utenti né in profili_sportivi)
      throw error;
    } finally {
      client.release(); // Rilascia la connessione al pool, così può essere riutilizzata da altre richieste
    }
  } catch (err) {
    console.error("Errore aggiornamento profilo sportivo:", err);
    res.status(500).json({ error: "Errore durante il salvataggio." });
  }
});

// SPORTIVO: Stato
// Restituisce lo stato della richiesta di coaching (nessuna, in_attesa, accettata, rifiutata) e il
// nome dell'allenatore scelto (se presente).
app.get("/api/sportivo/stato", verificaSportivo, async (req, res) => {
  try {
    const query = `
        SELECT p.stato_richiesta, u_all.nome AS nome_allenatore 
        FROM profili_sportivi p
        LEFT JOIN utenti u_all ON p.id_allenatore_scelto = u_all.id
        WHERE p.id_utente = $1
    `; // JOIN tra profili_sportivi e utenti (per ottenere il nome dell'allenatore) filtrando per l'id dello sportivo loggato
    const result = await pool.query(query, [req.session.utenteId]);
    // Usa l'id dell'utente loggato (dalla sessione) per leggere lo stato della sua richiesta di coaching e
    // il nome del coach scelto
    if (result.rows.length > 0) res.json(result.rows[0]);
    // Restituisce lo stato della richiesta e il nome dell'allenatore come JSON
    else res.status(404).json({ message: "Profilo non trovato" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPORTIVO: Scegli Coach
app.post("/api/sportivo/scegli-allenatore", verificaSportivo, async (req, res) => {
  const { id_allenatore } = req.body; // L'id dell'allenatore scelto, inviato dal form di scelta coach
  try {
    await pool.query(
      "UPDATE profili_sportivi SET id_allenatore_scelto = $1, stato_richiesta = 'in_attesa' WHERE id_utente = $2",
      [id_allenatore, req.session.utenteId],
    ); // Aggiorna il profilo dello sportivo con l'id dell'allenatore scelto e imposta lo stato della richiesta su "in_attesa"
    res.json({ message: "Richiesta inviata con successo!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mie-schede
// Recupera tutte le schede dell'atleta tramite una JOIN su tre tabelle.
// Il risultato viene poi "riassemblato" in JavaScript in un array di oggetti:
// ogni scheda ha un campo "esercizi" che è un array degli esercizi assegnati.
app.get("/api/sportivo/mie-schede", verificaSportivo, async (req, res) => {
  try {
    const query = `
        SELECT s.id as scheda_id, s.titolo, s.data_creazione,
               e.id as ex_id, e.nome, e.gruppo_muscolare, e.url_immagine,
               se.serie, se.ripetizioni, se.recupero, se.note
        FROM schede_allenamento s
        LEFT JOIN schede_esercizi se ON s.id = se.id_scheda
        LEFT JOIN esercizi e ON se.id_esercizio = e.id
        WHERE s.id_sportivo = $1
        ORDER BY s.data_creazione DESC, se.id ASC
    `;
    const result = await pool.query(query, [req.session.utenteId]);
    // Usa l'id dell'utente loggato (dalla sessione) per leggere le sue schede di allenamento
    const schedeMap = {}; // Oggetto temporaneo per raggruppare gli esercizi sotto la rispettiva scheda
    
    result.rows.forEach(row => {
        if (!schedeMap[row.scheda_id]) {
            schedeMap[row.scheda_id] = { id: row.scheda_id, titolo: row.titolo, data_creazione: row.data_creazione, esercizi: [] };
        }
        // Se la scheda non è ancora stata aggiunta a schedeMap, la crea con i dati della riga e un array vuoto di esercizi
        if (row.ex_id) {
            schedeMap[row.scheda_id].esercizi.push({
                id: row.ex_id, nome: row.nome, gruppo_muscolare: row.gruppo_muscolare, url_immagine: row.url_immagine,
                serie: row.serie, ripetizioni: row.ripetizioni, recupero: row.recupero, note: row.note
            });
        } // Se la riga contiene un esercizio (ex_id non è null), lo aggiunge all'array di esercizi della scheda corrispondente
    });
    const elencoSchede = Object.values(schedeMap).sort((a, b) => new Date(b.data_creazione) - new Date(a.data_creazione));
    // Converte schedeMap in un array e lo ordina per data di creazione (schede più recenti prima)
    res.json(elencoSchede);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mie-diete
// Stessa logica di mie-schede, ma per i piani alimentari.
// JOIN su schede_alimentari → schede_alimenti → alimenti
app.get("/api/sportivo/mie-diete", verificaSportivo, async (req, res) => {
  try {
    const query = `
        SELECT sa.id as dieta_id, sa.titolo, sa.data_creazione,
               a.id as alim_id, a.nome, a.calorie, a.proteine, a.carboidrati, a.grassi,
               sal.quantita_grammi, sal.note_pasto
        FROM schede_alimentari sa
        LEFT JOIN schede_alimenti sal ON sa.id = sal.id_scheda
        LEFT JOIN alimenti a ON sal.id_alimento = a.id
        WHERE sa.id_sportivo = $1
        ORDER BY sa.data_creazione DESC, sal.id ASC
    `;
    // Usa l'id dell'utente loggato (dalla sessione) per leggere i suoi piani alimentari
    const result = await pool.query(query, [req.session.utenteId]);
    // Il risultato contiene i dati della dieta e, se presenti, i dati degli alimenti associati (grazie alle JOIN)
    const dieteMap = {};
    // Oggetto temporaneo per raggruppare gli alimenti sotto la rispettiva dieta
    
    result.rows.forEach(row => {
        if (!dieteMap[row.dieta_id]) {
            dieteMap[row.dieta_id] = { id: row.dieta_id, titolo: row.titolo, data_creazione: row.data_creazione, alimenti: [] };
        } // Se la dieta non è ancora stata aggiunta a dieteMap, la crea con i dati della riga e un array vuoto di alimenti
        if (row.alim_id) {
            dieteMap[row.dieta_id].alimenti.push({
                id: row.alim_id, nome: row.nome, calorie: row.calorie, proteine: row.proteine, carboidrati: row.carboidrati,
                grassi: row.grassi, quantita_grammi: row.quantita_grammi, note_pasto: row.note_pasto
            });
        } // Se la riga contiene un alimento (alim_id non è null), lo aggiunge all'array di alimenti della dieta corrispondente
    });
    const elencoDiete = Object.values(dieteMap).sort((a, b) => new Date(b.data_creazione) - new Date(a.data_creazione));
    // Converte dieteMap in un array e lo ordina per data di creazione (diete più recenti prima)
    res.json(elencoDiete);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API ALLENATORE
// Tutte protette dal middleware verificaAllenatore.
// API:
//   GET  /profilo (legge i dati del profilo)
//   PUT  /profilo (aggiorna specialità, descrizione, foto...)
//   GET  /richieste (richieste di coaching in attesa)
//   POST /accetta-richiesta (accetta una richiesta di coaching)
//   GET  /miei-sportivi (lista dei propri atleti)

// verificaAllenatore
// Middleware di protezione: se l'utente non ha ruolo "allenatore", blocca la richiesta con HTTP 403.
const verificaAllenatore = (req, res, next) => {
  if (req.session.ruolo === "allenatore") {
    next();
  } else {
    res.status(403).json({ message: "Accesso negato. Area riservata agli allenatori." });
  }
};

// ALLENATORE: Lettura Profilo
// Restituisce i dati del profilo dell'allenatore loggato, combinando le informazioni dalle tabelle utenti e
// profili_allenatori tramite una JOIN.
app.get("/api/allenatore/profilo", verificaAllenatore, async (req, res) => {
  try {
      const query = `
          SELECT u.nome, u.email, p.cognome, p.specialita, p.descrizione, p.telefono, p.foto
          FROM utenti u
          JOIN profili_allenatori p ON u.id = p.id_utente
          WHERE u.id = $1
      `;
      const result = await pool.query(query, [req.session.utenteId]);
      // Usa l'id dell'utente loggato (dalla sessione) per leggere il suo profilo
      if (result.rows.length > 0) {
          res.json(result.rows[0]); // Restituisce i dati del profilo come JSON
      } else {
          res.status(404).json({ message: "Profilo non trovato." });
      }
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// ALLENATORE: Modifica Profilo
// Permette di aggiornare i dati del profilo dell'allenatore, inclusa la foto (con upload tramite multer).
app.put("/api/allenatore/profilo", verificaAllenatore, upload.single("foto"), async (req, res) => {
  const pulisci = (val) => val === "null" || val === "undefined" || val === "" ? null : val;
  // Funzione di pulizia: se il campo è vuoto o contiene "null"/"undefined", lo converte in null
  // (così si può cancellare un dato esistente)
  
  const nome = pulisci(req.body.nome);
  const email = pulisci(req.body.email);
  const cognome = pulisci(req.body.cognome);
  const specialita = pulisci(req.body.specialita);
  const descrizione = pulisci(req.body.descrizione);
  const telefono = pulisci(req.body.telefono);
  
  const nuovaFotoUrl = req.file ? "/uploads/" + req.file.filename : null;
  // Se è stata caricata una nuova foto, costruisce l'URL relativo; altrimenti, lascia null
  // (così non si sovrascrive la foto esistente)

  try {
      const client = await pool.connect(); // Ottiene una connessione dal pool per eseguire una transazione
      try {
          await client.query("BEGIN"); // Inizio transazione: se qualcosa va storto, si annullano tutte le operazioni
          
          await client.query("UPDATE utenti SET nome = $1, email = $2 WHERE id = $3", 
              [nome, email, req.session.utenteId]
          ); // Aggiorna i dati nella tabella utenti (nome e email)
          
          await client.query(`
              UPDATE profili_allenatori 
              SET cognome = $1, specialita = $2, descrizione = $3, telefono = $4, 
                  foto = COALESCE($5, foto)
              WHERE id_utente = $6`,
              [cognome, specialita, descrizione, telefono, nuovaFotoUrl, req.session.utenteId]
          ); // Aggiorna i dati nella tabella profili_allenatori (cognome, specialità, descrizione, telefono, foto)

          req.session.nome = nome;
          // Aggiorna nome sessione così viene mostrato correttamente nella navbar dopo la modifica del profilo
          await client.query("COMMIT");
          // Se siamo arrivati fin qui senza errori, confermiamo la transazione: i dati vengono salvati
          res.json({ message: "Profilo aggiornato con successo!" });
      } catch (error) {
          await client.query("ROLLBACK");
          // Se c'è un errore, annulliamo la transazione: nessun dato viene aggiornato (né in utenti né in profili_allenatori)
          throw error;
      } finally {
          client.release();
          // Rilascia la connessione al pool, così può essere riutilizzata da altre richieste
      }
  } catch (err) {
      console.error("Errore aggiornamento profilo allenatore:", err);
      res.status(500).json({ error: "Errore durante il salvataggio." });
  }
});

// ALLENATORE: Richieste in attesa
// Restituisce la lista delle richieste di coaching in attesa, con i dati degli sportivi che le hanno inviate
// (JOIN tra profili_sportivi e utenti).
app.get("/api/allenatore/richieste", verificaAllenatore, async (req, res) => {
  try {
    const query = `
        SELECT p.id_utente, u.nome, p.obiettivo, p.esperienza_pregressa 
        FROM profili_sportivi p
        JOIN utenti u ON p.id_utente = u.id
        WHERE p.id_allenatore_scelto = $1 AND p.stato_richiesta = 'in_attesa'
    `;
    const result = await pool.query(query, [req.session.utenteId]);
    // Usa l'id dell'allenatore loggato (dalla sessione) per leggere le richieste di coaching in attesa che gli sono
    // state inviate
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALLENATORE: Accetta Richiesta
// Riceve l'id dello sportivo che ha inviato la richiesta, aggiorna il suo profilo impostando stato_richiesta su
// "accettata". In questo modo, lo sportivo vedrà che la sua richiesta è stata accettata e potrà accedere alle
// schede e diete che l'allenatore gli assegnerà.
app.post("/api/allenatore/accetta-richiesta", verificaAllenatore, async (req, res) => {
  const { id_sportivo } = req.body;
  try {
    await pool.query(
      "UPDATE profili_sportivi SET stato_richiesta = 'accettata' WHERE id_utente = $1 AND id_allenatore_scelto = $2",
      [id_sportivo, req.session.utenteId],
    ); // Aggiorna il profilo dello sportivo con id_sportivo, ma solo se ha scelto come allenatore quello loggato (per sicurezza)
    res.json({ message: "Richiesta accettata con successo!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALLENATORE: I miei atleti
// Restituisce la lista dei propri sportivi (con dati di profilo) che hanno una richiesta accettata,
// tramite una JOIN tra profili_sportivi e utenti filtrando per id_allenatore_scelto e stato_richiesta = "accettata".
// In questo modo, l'allenatore può vedere i dati dei suoi atleti e assegnare loro schede e diete (tramite le altre API).
app.get("/api/allenatore/miei-sportivi", verificaAllenatore, async (req, res) => {
  try {
    const query = `
        SELECT p.id_utente, u.nome, p.obiettivo, p.sesso, p.data_nascita, p.peso, p.altezza
        FROM profili_sportivi p
        JOIN utenti u ON p.id_utente = u.id
        WHERE p.id_allenatore_scelto = $1 AND p.stato_richiesta = 'accettata'
    `;
    const result = await pool.query(query, [req.session.utenteId]);
    // Usa l'id dell'allenatore loggato (dalla sessione) per leggere la lista dei suoi sportivi con richiesta accettata
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /crea-scheda
// Riceve titolo, id_sportivo e una lista di esercizi.
// Usa una transazione: prima crea la scheda (ottiene l'id),
// poi inserisce tutti gli esercizi in schede_esercizi.
app.post("/api/allenatore/crea-scheda", verificaAllenatore, async (req, res) => {
  const { id_sportivo, titolo, listaEsercizi } = req.body;
  // id dello sportivo a cui assegnare la scheda, titolo della scheda e lista di esercizi
  // (con serie, ripetizioni, recupero) inviati dal form di creazione scheda
  const id_allenatore = req.session.utenteId;
  // id dell'allenatore loggato, ottenuto dalla sessione (così si associa la scheda al coach che la crea)

  try {
    const client = await pool.connect(); // Ottiene una connessione dal pool per eseguire una transazione
    try {
      await client.query("BEGIN"); // Inizio transazione: se qualcosa va storto, si annullano tutte le operazioni
      const resultScheda = await client.query(
        "INSERT INTO schede_allenamento (id_sportivo, id_allenatore, titolo) VALUES ($1, $2, $3) RETURNING id;", 
        [id_sportivo, id_allenatore, titolo]
      ); // Crea la scheda di allenamento e ottiene l'id della nuova scheda appena creata (grazie a RETURNING id)
      const idNuovaScheda = resultScheda.rows[0].id;
      // Estrae l'id della nuova scheda dalla risposta del database

      for (let es of listaEsercizi) {
        await client.query(
          "INSERT INTO schede_esercizi (id_scheda, id_esercizio, serie, ripetizioni, recupero) VALUES ($1, $2, $3, $4, $5);",
          [idNuovaScheda, es.id_esercizio, es.serie, es.ripetizioni, es.recupero]
        );
      }
      // Per ogni esercizio nella lista, inserisce una riga in schede_esercizi associando l'esercizio alla
      // scheda appena creata (idNuovaScheda) e specificando serie, ripetizioni e recupero
      await client.query("COMMIT");
      // Se siamo arrivati fin qui senza errori, confermiamo la transazione: i dati vengono salvati definitivamente nel database
      res.json({ message: "Scheda creata e salvata con successo!" });
    } catch (error) {
      await client.query("ROLLBACK");
      // Se c'è un errore, annulliamo la transazione: nessun dato viene salvato (né in schede_allenamento né in schede_esercizi)
      throw error;
    } finally {
      client.release();
      // Rilascia la connessione al pool, così può essere riutilizzata da altre richieste
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALLENATORE: Crea Piano Alimentare
// Stessa logica di crea-scheda, ma per i piani alimentari e con la tabella schede_alimenti al posto di schede_esercizi.
app.post("/api/allenatore/crea-dieta", verificaAllenatore, async (req, res) => {
  const { id_sportivo, titolo, listaAlimenti } = req.body;
  // id dello sportivo a cui assegnare la dieta, titolo della dieta e lista di alimenti (con quantità e note)
  // inviati dal form di creazione dieta
  const id_allenatore = req.session.utenteId;
  // id dell'allenatore loggato, ottenuto dalla sessione (così si associa la dieta al coach che la crea)

  try {
    const client = await pool.connect(); // Ottiene una connessione dal pool per eseguire una transazione
    try {
      await client.query("BEGIN"); // Inizio transazione: se qualcosa va storto, si annullano tutte le operazioni
      const resultDieta = await client.query(
        "INSERT INTO schede_alimentari (id_sportivo, id_allenatore, titolo) VALUES ($1, $2, $3) RETURNING id;", 
        [id_sportivo, id_allenatore, titolo]
      ); // Crea la scheda alimentare e ottiene l'id della nuova dieta appena creata (grazie a RETURNING id)
      const idNuovaDieta = resultDieta.rows[0].id;
      // Estrae l'id della nuova dieta dalla risposta del database

      for (let alim of listaAlimenti) {
        await client.query(
          "INSERT INTO schede_alimenti (id_scheda, id_alimento, quantita_grammi, note_pasto) VALUES ($1, $2, $3, $4);",
          [idNuovaDieta, alim.id_alimento, alim.quantita_grammi, alim.note_pasto]
        );
      }
      // Per ogni alimento nella lista, inserisce una riga in schede_alimenti associando l'alimento
      // alla dieta appena creata (idNuovaDieta) e specificando quantità e note
      await client.query("COMMIT");
      // Se siamo arrivati fin qui senza errori, confermiamo la transazione: i dati vengono salvati definitivamente nel database
      res.json({ message: "Piano alimentare inviato con successo all'atleta!" });
    } catch (error) {
      await client.query("ROLLBACK");
      // Se c'è un errore, annulliamo la transazione: nessun dato viene salvato (né in schede_alimentari né in schede_alimenti)
      throw error;
    } finally {
      client.release();
      // Rilascia la connessione al pool, così può essere riutilizzata da altre richieste
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONTATTI E MESSAGGI

// Salva messaggio dalla pagina Contatti
app.post('/api/contatti', async (req, res) => {
  const { nome, email, oggetto, messaggio } = req.body; // Dati del messaggio inviati dal form di contatto
  if (!nome || !email || !messaggio) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti.' });
    // 400 = "bad request": se mancano i campi obbligatori, restituisce un errore al client senza eseguire la query al database
  }
  try {
    await pool.query(
      'INSERT INTO messaggi_contatto (nome, email, oggetto, messaggio) VALUES ($1, $2, $3, $4)',
      [nome, email, oggetto || 'Nessun oggetto', messaggio]
    );
    // Inserisce il messaggio nella tabella messaggi_contatto; se l'oggetto è vuoto, inserisce "Nessun oggetto"
    // per evitare valori null
    res.json({ message: 'Messaggio inviato con successo!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manager: leggi tutti i messaggi
// Restituisce la lista di tutti i messaggi ricevuti dalla pagina Contatti, ordinati prima per quelli non letti
// (letto = false) e poi per data di invio (più recenti prima).
app.get('/api/manager/messaggi', verificaManager, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messaggi_contatto ORDER BY letto ASC, data_invio DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manager: segna messaggio come letto
// Riceve l'id del messaggio da aggiornare, imposta il campo "letto" su true.
app.put('/api/manager/messaggi/:id/letto', verificaManager, async (req, res) => {
  try {
    await pool.query('UPDATE messaggi_contatto SET letto = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Messaggio marcato come letto.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GESTIONE ERRORI 404 E AVVIO

// Intercetta rotte inesistenti
// Se nessuna delle rotte definite sopra corrisponde alla richiesta, restituisce la pagina 404.html con status 404.
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Avvio del server
// Il server si mette in ascolto sulla porta 3000.
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
