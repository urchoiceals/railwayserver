const express = require("express");
const bodyParse = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParse.urlencoded({ extended: true}));
app.use(bodyParse.json());

const mysql = require('mysql');

const dbUrl = 'mysql://root:dCWwchdFnRuZMnZhWFyLRRQHGByISwtk@viaduct.proxy.rlwy.net:21120/railway';

const connection = mysql.createConnection(dbUrl);


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

        connection.query('INSERT INTO users (email_user, nick_user, pass_user, img_user) VALUES (?, ?, ?, ?)', [email, nick, contra, img], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error interno del servidor1' + error});
            }

            connection.query('SELECT * FROM users WHERE id_user = ?', results.insertId, (error, results) => {
                if (error) {
                    return res.status(500).json({ error: 'Error interno del servidor2' });
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
      res.status(200).json(user);
    });
});

app.get("/users", (req, res) => {
    connection.query('SELECT * FROM users', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json(results);
    });
});



//--------------------------------------ELEMENTS-------------------------------------------------------------------------------------------------------



app.get("/elements/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const query = `
        SELECT elements.*, elemcat.victories 
        FROM elemcat
        INNER JOIN elements ON elemcat.id_elem = elements.id_elem
        INNER JOIN categories ON elemcat.id_cat = categories.id_cat
        WHERE categories.id_cat = ?
        ORDER BY elemcat.victories DESC
    `;
    
    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        res.status(200).json(results);
    });
});


//--------------------------------------ELEMENTS-------------------------------------------------------------------------------------------------------

app.get("/categories", (req, res) => {
    connection.query('SELECT * FROM categories', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json(results);
    });
});
  



//--------------------------------------FRIENDS-------------------------------------------------------------------------------------------------------


app.post("/friends", (req, res) => {
    const { id_us1, id_us2 } = req.body;

    connection.query('INSERT INTO friends (id_us1, id_us2, estado) VALUES (?, ?, ?)', [id_us1, id_us2, 'pendiente'], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(201).json({ message: 'Inserción exitosa en la tabla friends' });
    });
});


app.put("/friends/update", (req, res) => {
    const { id_us1, id_us2, nuevoEstado } = req.body;

    if (nuevoEstado === 'Aceptada') {
        connection.query('UPDATE friends SET estado = ? WHERE (id_us1 = ? AND id_us2 = ?) OR (id_us1 = ? AND id_us2 = ?)', ['Aceptada', id_us1, id_us2, id_us2, id_us1], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            res.status(200).json({ message: 'Actualización exitosa del estado a Aceptada' });
        });
    } else if (nuevoEstado === 'Denegado') {
        connection.query('DELETE FROM friends WHERE (id_us1 = ? AND id_us2 = ?) OR (id_us1 = ? AND id_us2 = ?)', [id_us1, id_us2, id_us2, id_us1], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            res.status(200).json({ message: 'Eliminación exitosa de la relación' });
        });
    } else {
        res.status(400).json({ error: 'El nuevo estado proporcionado no es válido' });
    }
});



//--------------------------------------FUNCIONA-------------------------------------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log("server running on port", 3000);
});