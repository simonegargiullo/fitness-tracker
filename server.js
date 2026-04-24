const express = require("express");
const multer = require('multer');
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require('bcrypt');
const saltRounds = 10; // Livello di sicurezza della crittografia

// Configurazione di Multer (Dove salvare e come chiamare i file)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // Salva i file in questa cartella
    },
    filename: function (req, file, cb) {
        // Genera un nome unico (data_attuale + nome_originale) per evitare che due foto si sovrascrivano
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

// Configurazione della connessione a PostgreSQL
const pool = new Pool({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.zgsmezhausuhdflhfnuq",
  password: "v5vz/HNXbS-!?.r", // Ora i caratteri speciali non daranno fastidio!
  database: "postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verifica della connessione al database
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Errore di connessione al database", err.stack);
  }
  console.log("Connesso al database PostgreSQL");
  release(); // Rilascia il client dopo il test
});

// Configuraazione delle sessioni sicure (salvate nel DB)
app.use(
  session({
    store: new pgSession({
      pool: pool, // Usa la connessione
      tableName: "session", // In questa tabella di salva chi ha fatto login
      createTableIfMissing: true, // Crea la tabella se non esiste
    }),
    secret: "chiave_segreta__fitness_123", // Usata per criptare i dati
    resave: false, // Non salva la sessione se non è stata modificata
    saveUninitialized: false, // Non salva sessioni vuote
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // Il login dura 1 giorno
  }),
);

// Middlewares di base
app.use(express.json()); // Permette di leggere i dati inviati dai form
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Serve i file statici (HTML, CSS, JS)

// 1. Registrazione di un nuovo Sportivo
app.post("/api/registrati", async (req, res) => {
  const { nome, email, password, sesso, eta, peso, altezza, obiettivo, attitudini, esperienza_pregressa } = req.body;

  // 1. Controllo lunghezza minima
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "La password deve contenere almeno 8 caratteri." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 2. Crittografia della password
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertUtenteQuery = `
                INSERT INTO utenti (nome, email, password, ruolo)
                VALUES ($1, $2, $3, 'sportivo')
                RETURNING id;
            `;
      // Salviamo hashedPassword invece di password
      const resultUtente = await client.query(insertUtenteQuery, [nome, email, hashedPassword]);
      const nuovoUtenteId = resultUtente.rows[0].id;

      // ... (il resto del codice dei profili rimane uguale)
      const insertProfiloQuery = `
                INSERT INTO profili_sportivi (id_utente, sesso, eta, peso, altezza, obiettivo, attitudini, esperienza_pregressa)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `;
      await client.query(insertProfiloQuery, [nuovoUtenteId, sesso, eta, peso, altezza, obiettivo, attitudini, esperienza_pregressa]);

      await client.query("COMMIT");
      res.status(201).json({ message: "Registrazione completata con successo!" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    // ... gestione errori esistente
  }
});

// 2. Login dell'utente
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Email o password errati.' });
        }

        const utente = result.rows[0];

        // 3. Confronto sicuro tra password inserita e hash nel DB
        const match = await bcrypt.compare(password, utente.password);

        if (!match) {
            return res.status(401).json({ message: 'Email o password errati.' });
        }

        // Se arriviamo qui, la password è corretta
        req.session.utenteId = utente.id;
        req.session.ruolo = utente.ruolo;
        req.session.nome = utente.nome;

        res.json({ message: 'Login effettuato!', ruolo: utente.ruolo });

    } catch (err) {
        console.error('Errore durante il login:', err);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

// 3. Logout dell'utente
app.post('/api/logout', (req, res) => {
    // Distruggiamo la sessione (il lasciapassare viene strappato)
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Errore durante il logout.' });
        }
        res.clearCookie('connect.sid'); // Cancelliamo il biscottino dal browser
        res.json({ message: 'Logout effettuato.' });
    });
});

// --- API DI SICUREZZA ---

// 4. Controlla chi è attualmente loggato
app.get('/api/sessione', (req, res) => {
    if (req.session.utenteId) {
        res.json({ 
            loggato: true, 
            utente: { 
                id: req.session.utenteId, 
                nome: req.session.nome, 
                ruolo: req.session.ruolo 
            } 
        });
    } else {
        res.json({ loggato: false });
    }
});


// --- API DEL MANAGER ---

// Middleware per proteggere le rotte del manager
// (Se non sei manager, il server blocca la richiesta)
const verificaManager = (req, res, next) => {
    if (req.session.ruolo === 'manager') {
        next(); // Vai pure avanti
    } else {
        res.status(403).json({ message: 'Accesso negato. Solo i manager possono eseguire questa azione.' });
    }
};

// 5. Creazione di un nuovo Allenatore (AGGIORNATA con Foto e Dettagli)
app.post('/api/manager/allenatori', verificaManager, upload.single('foto'), async (req, res) => {
    const { nome, cognome, email, password, specialita, descrizione, telefono } = req.body;
    
    if (!password || password.length < 8) {
        return res.status(400).json({ message: "La password deve essere di almeno 8 caratteri." });
    }

    // Se il manager carica una foto, salviamo il percorso, altrimenti null
    const foto_url = req.file ? '/uploads/' + req.file.filename : null;

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN'); // Inizio transazione
            
            // 1. Creiamo l'utente base
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const insertUtente = await client.query(
                "INSERT INTO utenti (nome, email, password, ruolo) VALUES ($1, $2, $3, 'allenatore') RETURNING id",
                [nome, email, hashedPassword]
            );
            
            const nuovoId = insertUtente.rows[0].id;
            
            // 2. Salviamo i dettagli nel profilo allenatore
            await client.query(
                "INSERT INTO profili_allenatori (id_utente, cognome, specialita, descrizione, foto, telefono) VALUES ($1, $2, $3, $4, $5, $6)",
                [nuovoId, cognome, specialita, descrizione, foto_url, telefono]
            );
            
            await client.query('COMMIT'); // Confermiamo il salvataggio
            res.json({ message: 'Allenatore creato con successo!' });
        } catch (error) {
            await client.query('ROLLBACK'); // In caso di errore, annulliamo tutto
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Errore salvataggio allenatore:", err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Inserimento Esercizio nel Catalogo (Con Upload Immagine)
// Aggiungiamo "upload.single('immagine_file')" per intercettare il file
app.post('/api/manager/esercizi', verificaManager, upload.single('immagine_file'), async (req, res) => {
    const { nome, gruppo_muscolare } = req.body;
    
    // Se il manager ha caricato un file, salviamo il percorso (es. "/uploads/foto123.jpg")
    // Se non l'ha caricato, salviamo null.
    const url_immagine = req.file ? '/uploads/' + req.file.filename : null;

    try {
        await pool.query(
            "INSERT INTO esercizi (nome, gruppo_muscolare, url_immagine) VALUES ($1, $2, $3)",
            [nome, gruppo_muscolare, url_immagine]
        );
        res.json({ message: 'Esercizio e immagine aggiunti al catalogo!' });
    } catch (err) {
        console.error("Errore salvataggio esercizio:", err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Inserimento Alimento nel Catalogo
app.post('/api/manager/alimenti', verificaManager, async (req, res) => {
    const { nome, calorie, proteine, carboidrati, grassi } = req.body;
    try {
        await pool.query(
            "INSERT INTO alimenti (nome, calorie, proteine, carboidrati, grassi) VALUES ($1, $2, $3, $4, $5)",
            [nome, calorie, proteine, carboidrati, grassi]
        );
        res.json({ message: 'Alimento aggiunto!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API DELLO SPORTIVO ---

// Middleware per proteggere le rotte dello sportivo
const verificaSportivo = (req, res, next) => {
    if (req.session.ruolo === 'sportivo') {
        next();
    } else {
        res.status(403).json({ message: 'Accesso negato. Area riservata agli sportivi.' });
    }
};

// 8. Ottieni lo stato attuale dello sportivo (per capire in che "Fase" si trova)
app.get('/api/sportivo/stato', verificaSportivo, async (req, res) => {
    try {
        // Cerchiamo il profilo dello sportivo loggato e, se c'è, il nome del suo allenatore
        const query = `
            SELECT p.stato_richiesta, u_all.nome AS nome_allenatore 
            FROM profili_sportivi p
            LEFT JOIN utenti u_all ON p.id_allenatore_scelto = u_all.id
            WHERE p.id_utente = $1
        `;
        const result = await pool.query(query, [req.session.utenteId]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]); // Restituisce es: { stato_richiesta: 'nessuna', nome_allenatore: null }
        } else {
            res.status(404).json({ message: 'Profilo non trovato' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Ottieni la lista di tutti gli allenatori disponibili (AGGIORNATA per coach.html)
app.get('/api/allenatori', async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.nome, u.email, 
                   pa.cognome, pa.specialita, pa.descrizione, pa.foto, pa.telefono
            FROM utenti u
            LEFT JOIN profili_allenatori pa ON u.id = pa.id_utente
            WHERE u.ruolo = 'allenatore'
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Errore recupero allenatori:", err);
        res.status(500).json({ error: err.message });
    }
});

// 10. Lo sportivo invia la richiesta a un allenatore specifico
app.post('/api/sportivo/scegli-allenatore', verificaSportivo, async (req, res) => {
    const { id_allenatore } = req.body;
    try {
        await pool.query(`
            UPDATE profili_sportivi 
            SET id_allenatore_scelto = $1, stato_richiesta = 'in_attesa'
            WHERE id_utente = $2
        `, [id_allenatore, req.session.utenteId]);
        res.json({ message: 'Richiesta inviata con successo!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API DELL'ALLENATORE ---

const verificaAllenatore = (req, res, next) => {
    if (req.session.ruolo === 'allenatore') {
        next();
    } else {
        res.status(403).json({ message: 'Accesso negato. Area riservata agli allenatori.' });
    }
};

// 11. Ottieni le richieste "in attesa" per questo allenatore
app.get('/api/allenatore/richieste', verificaAllenatore, async (req, res) => {
    try {
        const query = `
            SELECT p.id_utente, u.nome, p.obiettivo, p.esperienza_pregressa 
            FROM profili_sportivi p
            JOIN utenti u ON p.id_utente = u.id
            WHERE p.id_allenatore_scelto = $1 AND p.stato_richiesta = 'in_attesa'
        `;
        const result = await pool.query(query, [req.session.utenteId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. Accetta la richiesta di uno sportivo
app.post('/api/allenatore/accetta-richiesta', verificaAllenatore, async (req, res) => {
    const { id_sportivo } = req.body;
    try {
        await pool.query(`
            UPDATE profili_sportivi 
            SET stato_richiesta = 'accettata'
            WHERE id_utente = $1 AND id_allenatore_scelto = $2
        `, [id_sportivo, req.session.utenteId]);
        res.json({ message: 'Richiesta accettata con successo!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. Ottieni la lista degli sportivi attivi (già accettati)
app.get('/api/allenatore/miei-sportivi', verificaAllenatore, async (req, res) => {
    try {
        const query = `
            SELECT p.id_utente, u.nome, p.obiettivo, p.sesso, p.eta, p.peso, p.altezza
            FROM profili_sportivi p
            JOIN utenti u ON p.id_utente = u.id
            WHERE p.id_allenatore_scelto = $1 AND p.stato_richiesta = 'accettata'
        `;
        const result = await pool.query(query, [req.session.utenteId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 14. Ottieni tutto il catalogo degli esercizi (serve all'allenatore per creare la scheda)
app.get('/api/esercizi', verificaAllenatore, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM esercizi ORDER BY gruppo_muscolare, nome");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 15. Salva la nuova Scheda di Allenamento
app.post('/api/allenatore/crea-scheda', verificaAllenatore, async (req, res) => {
    // Il frontend ci manderà l'ID dello sportivo e un array con tutti gli esercizi scelti
    const { id_sportivo, titolo, listaEsercizi } = req.body;
    const id_allenatore = req.session.utenteId;

    try {
        // Usiamo una TRANSAZIONE, proprio come per la registrazione!
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // A. Creiamo la "copertina" della scheda
            const insertSchedaQuery = `
                INSERT INTO schede_allenamento (id_sportivo, id_allenatore, titolo) 
                VALUES ($1, $2, $3) RETURNING id;
            `;
            const resultScheda = await client.query(insertSchedaQuery, [id_sportivo, id_allenatore, titolo]);
            const idNuovaScheda = resultScheda.rows[0].id;

            // B. Inseriamo tutti gli esercizi uno ad uno
            const insertEsercizioQuery = `
                INSERT INTO schede_esercizi (id_scheda, id_esercizio, serie, ripetizioni, recupero) 
                VALUES ($1, $2, $3, $4, $5);
            `;
            
            // Cicliamo sull'array degli esercizi inviato da Vue.js
            for (let es of listaEsercizi) {
                await client.query(insertEsercizioQuery, [idNuovaScheda, es.id_esercizio, es.serie, es.ripetizioni, es.recupero]);
            }

            await client.query('COMMIT');
            res.json({ message: 'Scheda creata e salvata con successo!' });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Errore salvataggio scheda:", err);
        res.status(500).json({ error: err.message });
    }
});

// 16. Lo sportivo visualizza la sua scheda di allenamento
app.get('/api/sportivo/mia-scheda', verificaSportivo, async (req, res) => {
    try {
        // 1. Cerchiamo la scheda più recente di questo sportivo
        const schedaResult = await pool.query(`
            SELECT id, titolo, data_creazione 
            FROM schede_allenamento 
            WHERE id_sportivo = $1 
            ORDER BY data_creazione DESC LIMIT 1
        `, [req.session.utenteId]);

        // Se non ha ancora una scheda, avvisiamo il frontend
        if (schedaResult.rows.length === 0) {
            return res.json({ haScheda: false });
        }

        const scheda = schedaResult.rows[0];

        // 2. Se c'è la scheda, peschiamo tutti i suoi esercizi con una JOIN (ORA INCLUSA L'IMMAGINE!)
        const eserciziResult = await pool.query(`
            SELECT e.nome, e.gruppo_muscolare, e.url_immagine, se.serie, se.ripetizioni, se.recupero 
            FROM schede_esercizi se
            JOIN esercizi e ON se.id_esercizio = e.id
            WHERE se.id_scheda = $1
        `, [scheda.id]);

        // Impacchettiamo tutto e spediamo al frontend
        res.json({
            haScheda: true,
            titolo: scheda.titolo,
            esercizi: eserciziResult.rows
        });

    } catch (err) {
        console.error("Errore recupero scheda:", err);
        res.status(500).json({ error: err.message });
    }
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
