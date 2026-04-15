const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");

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
  // Estraiamo TUTTI i dati, inclusi i due nuovi campi
  const {
    nome,
    email,
    password,
    sesso,
    eta,
    peso,
    altezza,
    obiettivo,
    attitudini,
    esperienza_pregressa,
  } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Inseriamo l'utente
      const insertUtenteQuery = `
                INSERT INTO utenti (nome, email, password, ruolo)
                VALUES ($1, $2, $3, 'sportivo')
                RETURNING id;
            `;
      const resultUtente = await client.query(insertUtenteQuery, [
        nome,
        email,
        password,
      ]);
      const nuovoUtenteId = resultUtente.rows[0].id;

      // 2. Inseriamo il profilo con le nuove colonne attitudini ed esperienza_pregressa (aggiunti $7 e $8)
      const insertProfiloQuery = `
                INSERT INTO profili_sportivi (id_utente, sesso, eta, peso, altezza, obiettivo, attitudini, esperienza_pregressa)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `;
      await client.query(insertProfiloQuery, [
        nuovoUtenteId,
        sesso,
        eta,
        peso,
        altezza,
        obiettivo,
        attitudini,
        esperienza_pregressa,
      ]);

      await client.query("COMMIT");
      res
        .status(201)
        .json({
          message:
            "Registrazione completata con successo! Reindirizzamento al login...",
        });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Errore durante la registrazione:", err);
    if (err.code === "23505") {
      res
        .status(400)
        .json({
          message: "Attenzione: Questa email è già registrata nel sistema.",
        });
    } else {
      res
        .status(500)
        .json({
          message: "Errore interno del server durante la registrazione.",
        });
    }
  }
});

// 2. Login dell'utente
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Cerchiamo l'utente nel database tramite l'email
        const result = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        
        // Se non trova nessuno (array vuoto)
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Email o password errati.' });
        }

        const utente = result.rows[0];

        // Verifichiamo la password (per ora in chiaro, come impostato nella registrazione)
        if (password !== utente.password) {
            return res.status(401).json({ message: 'Email o password errati.' });
        }

        // MAGIA DELLE SESSIONI: Salviamo i dati dell'utente nel suo "lasciapassare"
        req.session.utenteId = utente.id;
        req.session.ruolo = utente.ruolo;
        req.session.nome = utente.nome;

        // Rispondiamo al frontend dicendogli chi è entrato
        res.json({ message: 'Login effettuato con successo!', ruolo: utente.ruolo });

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

// 5. Creazione di un nuovo Allenatore
app.post('/api/manager/allenatori', verificaManager, async (req, res) => {
    const { nome, email, password } = req.body;
    try {
        await pool.query(
            "INSERT INTO utenti (nome, email, password, ruolo) VALUES ($1, $2, $3, 'allenatore')",
            [nome, email, password]
        );
        res.json({ message: 'Allenatore creato!' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 6. Inserimento Esercizio nel Catalogo
app.post('/api/manager/esercizi', verificaManager, async (req, res) => {
    const { nome, gruppo_muscolare } = req.body;
    try {
        await pool.query(
            "INSERT INTO esercizi (nome, gruppo_muscolare) VALUES ($1, $2)",
            [nome, gruppo_muscolare]
        );
        res.json({ message: 'Esercizio aggiunto!' });
    } catch (err) {
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

// 9. Ottieni la lista di tutti gli allenatori disponibili
app.get('/api/allenatori', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nome, email FROM utenti WHERE ruolo = 'allenatore'");
        res.json(result.rows);
    } catch (err) {
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

// Avvio del server
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
