-- Schema del database PostgreSQL di Fitness Tracker.
-- Ricostruito a partire dalle query in server.js: nomi di tabelle e colonne
-- corrispondono al codice, i tipi sono quelli più adatti all'uso che ne viene fatto.
-- Le tabelle "session" (connect-pg-simple) e "immagini" vengono create
-- automaticamente dal server all'avvio, quindi non compaiono qui.

CREATE TABLE IF NOT EXISTS utenti (
  id        SERIAL PRIMARY KEY,
  nome      VARCHAR(255) NOT NULL,
  email     VARCHAR(255) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL, -- hash bcrypt
  ruolo     VARCHAR(20)  NOT NULL CHECK (ruolo IN ('sportivo', 'allenatore', 'manager'))
);

CREATE TABLE IF NOT EXISTS profili_sportivi (
  id_utente             INTEGER PRIMARY KEY REFERENCES utenti(id) ON DELETE CASCADE,
  sesso                 VARCHAR(20),
  data_nascita          DATE,
  peso                  NUMERIC(5,2),
  altezza               NUMERIC(5,2),
  obiettivo             TEXT,
  attitudini            TEXT,
  esperienza_pregressa  TEXT,
  id_allenatore_scelto  INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
  stato_richiesta       VARCHAR(20) -- 'in_attesa' | 'accettata'
);

CREATE TABLE IF NOT EXISTS profili_allenatori (
  id_utente    INTEGER PRIMARY KEY REFERENCES utenti(id) ON DELETE CASCADE,
  cognome      VARCHAR(255),
  specialita   VARCHAR(255),
  descrizione  TEXT,
  foto         TEXT, -- URL /uploads/<nome>
  telefono     VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS esercizi (
  id                SERIAL PRIMARY KEY,
  nome              VARCHAR(255) NOT NULL,
  gruppo_muscolare  VARCHAR(100),
  url_immagine      TEXT -- URL /uploads/<nome>
);

CREATE TABLE IF NOT EXISTS alimenti (
  id           SERIAL PRIMARY KEY,
  nome         VARCHAR(255) NOT NULL,
  calorie      NUMERIC,
  proteine     NUMERIC,
  carboidrati  NUMERIC,
  grassi       NUMERIC
);

CREATE TABLE IF NOT EXISTS schede_allenamento (
  id              SERIAL PRIMARY KEY,
  id_sportivo     INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  id_allenatore   INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
  titolo          VARCHAR(255) NOT NULL,
  data_creazione  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schede_esercizi (
  id            SERIAL PRIMARY KEY,
  id_scheda     INTEGER NOT NULL REFERENCES schede_allenamento(id) ON DELETE CASCADE,
  id_esercizio  INTEGER NOT NULL REFERENCES esercizi(id) ON DELETE CASCADE,
  serie         INTEGER,
  ripetizioni   VARCHAR(50),
  recupero      VARCHAR(50),
  note          TEXT
);

CREATE TABLE IF NOT EXISTS schede_alimentari (
  id              SERIAL PRIMARY KEY,
  id_sportivo     INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  id_allenatore   INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
  titolo          VARCHAR(255) NOT NULL,
  data_creazione  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schede_alimenti (
  id               SERIAL PRIMARY KEY,
  id_scheda        INTEGER NOT NULL REFERENCES schede_alimentari(id) ON DELETE CASCADE,
  id_alimento      INTEGER NOT NULL REFERENCES alimenti(id) ON DELETE CASCADE,
  quantita_grammi  NUMERIC,
  note_pasto       TEXT
);

CREATE TABLE IF NOT EXISTS messaggi_contatto (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  oggetto     VARCHAR(255),
  messaggio   TEXT NOT NULL,
  letto       BOOLEAN DEFAULT FALSE,
  data_invio  TIMESTAMP DEFAULT NOW()
);

-- Il primo account manager va creato a mano (la registrazione dal sito crea solo sportivi).
-- La password deve essere un hash bcrypt, ad esempio generato con:
--   node -e "require('bcrypt').hash('LaTuaPassword', 10).then(console.log)"
-- INSERT INTO utenti (nome, email, password, ruolo)
-- VALUES ('Manager', 'manager@example.com', '<hash bcrypt>', 'manager');
