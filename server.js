const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Configurazione della connessione a PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fitness_tracker',
    password: 'admin',
    port: 5432,
});

// Verifica della connessione al database
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Errore di connessione al database', err.stack);
    }
    console.log('Connesso al database PostgreSQL');
    release(); // Rilascia il client dopo il test
});

// Configuraazione delle sessioni sicure (salvate nel DB)
app.use(session({
    store: new pgSession({
        pool: pool, // Usa la connessione
        tableName: 'session', // In questa tabella di salva chi ha fatto login
        createTableIfMissing: true, // Crea la tabella se non esiste
    }),
    secret: 'chiave_segreta__fitness_123', // Usata per criptare i dati
    resave: false, // Non salva la sessione se non è stata modificata
    saveUninitialized: false, // Non salva sessioni vuote
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // Il login dura 1 giorno
}));

// Middlewares di base
app.use(express.json()); // Permette di leggere i dati inviati dai form
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve i file statici (HTML, CSS, JS)

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});