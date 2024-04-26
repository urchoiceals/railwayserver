const express = require("express");
const bodyParse = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParse.urlencoded({ extended: true}));
app.use(bodyParse.json());

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'viaduct.proxy.rlwy.net',
  user: 'root',
  password: 'dCWwchdFnRuZMnZhWFyLRRQHGByISwtk',
  database: 'railway'
});

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la basde e datos MySQL');
});

app.get("/", (req,res) =>{
    res.status(200).send("Hola Tincode");
});


app.post("/welcome", (req,res) =>{
    const { username } = req.body;
    res.send(`Hola ${username}`);
});


//--------------------------------------USERS-------------------------------------------------------------------------------------------------------

app.post("/user/register", (req, res) => {
    const { email, nick, img, contra } = req.body;

    connection.query('SELECT * FROM users WHERE email_user = ?', [email], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }

        connection.query('INSERT INTO users (email_user, nick_user, img_user, pass_user) VALUES (?, ?, ?, ?)', [email, nick, img, contra], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            connection.query('SELECT * FROM users WHERE id_user = ?', results.insertId, (error, results) => {
                if (error) {
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                const insertedUser = results[0];
                console.log('Usuario insertado correctamente en la base de datos');
                res.status(201).json(insertedUser);
            });
        });
    });
});



  app.post("/user/login", (req, res) => {
    const { email, contra } = req.body;

    connection.query('SELECT * FROM users WHERE email_user = ? AND pass_user = ?', [email, contra], (error, results) => {
      if (error) {
        console.error('Error al realizar la consulta:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      if (results.length === 0) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      const user = results[0];
      res.status(200).json(user); // Devuelve los datos del usuario como respuesta
    });
});

  
  

app.listen(PORT, () => {
    console.log("server running on port", 3000);
});