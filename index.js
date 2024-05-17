const express = require("express");
const bodyParse = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParse.json({ limit: '100mb' }));
app.use(bodyParse.urlencoded({ limit: '100mb', extended: true }));


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
    res.status(200).send("Hola Gay");
});


app.post("/welcome", (req,res) =>{
    const { username } = req.body;
    res.send(`Hola ${username}`);
});


//--------------------------------------USERS-------------------------------------------------------------------------------------------------------

app.post("/user/register", (req, res) => {
    const { email, nick, img, contra } = req.body;

    connection.query('SELECT * FROM users WHERE email_user = ? OR nick_user = ?', [email,nick], (error, results) => {
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

app.get("/users/all/:id_user", (req, res) => {
    const userId = req.params.id_user;

    connection.query('SELECT * FROM users WHERE id_user != ?', [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Mapear los resultados para convertir img_user a Base64
        const elementsWithBase64 = results.map(element => {
            const imgBytes = element.img_user; // Suponiendo que la columna img_user contiene los bytes de la imagen
            const imgBase64 = imgBytes ? Buffer.from(imgBytes).toString('base64') : null;
            return {
                id_user: element.id_user,
                email_user: element.email_user,
                nick_user: element.nick_user,
                img_user: imgBase64,
                GamesPlayed: element.GamesPlayed,
            };
        });

        res.status(200).json(elementsWithBase64);
    });
});


app.get("/users/:id_user", (req, res) => {
    const userId = req.params.id_user;

    connection.query('SELECT * FROM users WHERE id_user = ?', [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const element = results[0];
        const imgBytes = element.img_user; // Suponiendo que la columna img_user contiene los bytes de la imagen
        const imgBase64 = imgBytes ? Buffer.from(imgBytes).toString('base64') : null;
        
        const userWithBase64Image = {
            id_user: element.id_user,
            email_user: element.email_user,
            nick_user: element.nick_user,
            img_user: imgBase64,
            GamesPlayed: element.GamesPlayed,
        };

        res.status(200).json(userWithBase64Image);
    });
});


// Actualizar el nombre de un usuario por su ID
app.post("/user/UpdateName", (req, res) => {
    const { user_id, nick_user } = req.body;

    connection.query(
        'SELECT COUNT(*) AS count FROM users WHERE nick_user = ? AND user_id != ?',
        [nick_user, user_id],
        (error, results) => {
            if (error) {
                console.error('Error al buscar usuarios con el mismo nombre:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            const userCount = results[0].count;

            if (userCount > 0) {
                return res.status(400).json({ error: 'Ya existe otro usuario con ese nombre' });
            }

            // Si no hay otros usuarios con el mismo nombre, procedemos con la actualización
            connection.query(
                'UPDATE users SET nick_user = ? WHERE user_id = ?',
                [new_nick_user, user_id],
                (error, results) => {
                    if (error) {
                        console.error('Error al actualizar el nombre del usuario:', error);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }

                    if (results.affectedRows === 0) {
                        return res.status(404).json({ error: 'Usuario no encontrado' });
                    }

                    res.status(200).json({ message: 'Nombre de usuario actualizado correctamente' });
                }
            );
        }
    );
});


// Actualizar el nombre de un usuario por su ID
app.post("/user/UpdateIMG", (req, res) => {
    const { user_id, img_user } = req.body;
    
    const imgBytes = Buffer.from(img_user, 'base64');

    connection.query(
        'UPDATE users SET img_user = ? WHERE user_id = ?',
        [imgBytes, user_id],
        (error, results) => {
            if (error) {
                console.error('Error al actualizar el nombre del usuario:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.status(200).json({ message: 'Nombre de usuario actualizado correctamente' });
        }
    );
});



//--------------------------------------ELEMENTS-------------------------------------------------------------------------------------------------------



app.get("/elements/ranking/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const query = `
        SELECT elements.* 
        FROM elements
        INNER JOIN categories ON elements.id_cat = categories.id_cat
        WHERE categories.id_cat = ?
        ORDER BY elements.victories DESC
        LIMIT 5
    `;

    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        const elementsWithBase64 = results.map(element => {
            const imgBytes = element.img_elem;
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_elem: element.id_elem,
                name_elem: element.name_elem,
                victories: element.victories,
                id_cat: element.id_cat,
                img_elem: imgBase64
            };
        });

        res.status(200).json(elementsWithBase64);
    });
});


app.get("/elements/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const query = `
        SELECT *
        FROM elements
        WHERE id_cat = ?
        ORDER BY name_elem DESC
    `;

    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        // Convertir las imágenes de los elementos a Base64
        const elementsWithBase64 = results.map(element => {
            const imgBytes = element.img_elem; // Suponiendo que la columna img_elem contiene los bytes de la imagen
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_elem: element.id_elem,
                name_elem: element.name_elem,
                victories: element.victories,
                img_elem: imgBase64,
            };
        });

        res.status(200).json(elementsWithBase64);
    });
});


app.post("/element/winner", (req, res) => {
    const { id_elem, victories, id_user } = req.body;
    
    // Convertir la cadena de victorias a un número antes de sumar 1
    const updatedVictories = parseInt(victories) + 1;

    connection.query('UPDATE elements SET victories = ? WHERE id_elem = ?', [updatedVictories, id_elem], (error, results) => {
        if (error) {
            console.error('Error al actualizar la tabla elements:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json({ message: 'Se ha actualizado la tabla elements correctamente' });
    });

    connection.query('UPDATE users SET GamesPlayed = GamesPlayed + 1 WHERE id_user = ?', [id_user], (error, results) => {
        if (error) {
            console.error('Error al actualizar la tabla users:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
});



//--------------------------------------CATEGORIES-------------------------------------------------------------------------------------------------------

app.get("/categories/all", (req, res) => {
    connection.query('SELECT * FROM categories', (error, results) => {
        if (error) {
            console.error('Error al realizar la consulta:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        const categoriesWithBase64 = results.map(category => {
            const imgBytes = category.img_cat;
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_cat: category.id_cat,
                name_cat: category.name_cat,
                img_cat: imgBase64
            };
        });

        res.status(200).json(categoriesWithBase64);
    });
});



app.get("/categories/:id_user", (req, res) => {
    const userId = req.params.id_user;
    const query = `
        SELECT c.id_cat, c.name_cat, c.img_cat 
        FROM categories c
        LEFT JOIN saved s ON c.id_cat = s.id_cat AND s.id_user = ?
        LEFT JOIN favs f ON c.id_cat = f.id_cat AND f.id_user = ?
        WHERE s.id_cat IS NULL AND f.id_cat IS NULL
    `;

    connection.query(query, [userId, userId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Convertir las imágenes de las categorías a Base64
        const categoriesWithBase64 = results.map(category => {
            const imgBytes = category.img_cat;
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_cat: category.id_cat,
                name_cat: category.name_cat,
                img_cat: imgBase64
            };
        });

        res.status(200).json(categoriesWithBase64);
    });
});



app.post("/categories/create", (req, res) => {
    const { name_cat, img_cat, elements } = req.body;

    // Convertir la imagen Base64 a bytes
    const imgBytes = Buffer.from(img_cat, 'base64');

    // Comenzar una transacción
    connection.beginTransaction(function(err) {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ error: 'Error interno del servidor al iniciar la transacción'});
        }

        // Insertar la categoría
        connection.query('INSERT INTO categories (name_cat, img_cat) VALUES (?, ?)', [name_cat, imgBytes], (error, categoryResult) => {
            if (error) {
                connection.rollback(function() {
                    console.error('Error al insertar la nueva categoría:', error);
                    return res.status(500).json({ error: 'Error interno del servidor al insertar categoría' });
                });
                return; // Detener la ejecución en caso de error
            }

            const id_cat = categoryResult.insertId; // Obtener el ID de la categoría recién insertada

            let query = 'INSERT INTO elements (img_elem, name_elem, id_cat) VALUES ?';        
            let elementValues = elements.map(element => [Buffer.from(element.img_elem, 'base64'), element.name_elem, id_cat]);

            connection.query(query, [elementValues], (error, elementResult) => {
                if (error) {
                    connection.rollback(function() {
                        console.error('Error al insertar los elementos:', error);
                        return res.status(500).json({ error: 'Error interno del servidor al insertar elementos' });
                    });
                    return; // Detener la ejecución en caso de error
                }

                // Commit de la transacción si todas las inserciones fueron exitosas
                connection.commit(function(err) {
                    if (err) {
                        connection.rollback(function() {
                            console.error('Error al hacer commit de la transacción:', err);
                            return res.status(500).json({ error: 'Error interno del servidor al hacer commit de la transacción' });
                        });
                        return; // Detener la ejecución en caso de error
                    }

                    console.log('Transacción completada con éxito.');
                    res.status(200).json({ message: 'Transacción completada con éxito.' });
                });
            });
        });
    });
});



app.get("/category/:id", (req, res) => {
    const categoryId = req.params.id;
    const query = `
        SELECT * 
        FROM categories
        WHERE id_cat = ?
    `;

    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            console.error('Error al obtener la categoría:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        const category = results[0];

        // Convertir la imagen de la categoría a Base64
        const imgBytes = category.img_cat;
        const imgBase64 = Buffer.from(imgBytes).toString('base64');
        
        // Crear un objeto con la categoría y la imagen en Base64
        const categoryWithBase64 = {
            id_cat: category.id_cat,
            name_cat: category.name_cat,
            img_cat: imgBase64
        };

        res.status(200).json(categoryWithBase64);
    });
});


//--------------------------------------FAVORITOS-------------------------------------------------------------------------------------------------------

app.post('/fav/insert', (req, res) => {
    const { id_user, id_cat } = req.body;
  
    const query = 'INSERT INTO favs (id_user, id_cat) VALUES (?, ?)';
    const values = [id_user, id_cat];
  
    connection.query(query, values, (err, result) => {
      if (err) {
        console.error('Error al insertar:', err);
        res.status(500).send('Error al insertar en la base de datos');
        return;
      }
      console.log('Favorito insertado correctamente:', result);
      res.status(200).send('Favorito insertado correctamente');
    });
  });



  

  app.delete('/fav/delete/:id_user/:id_cat', (req, res) => {
    const id_user = req.params.id_user;
    const id_cat = req.params.id_cat;

    const query = 'DELETE FROM favs WHERE id_user = ? AND id_cat = ?';
    const values = [id_user, id_cat];

    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al eliminar:', err);
            res.status(500).send('Error al eliminar de la base de datos');
            return;
        }
        console.log('Favorito eliminado correctamente:', result);
        res.status(200).send('Favorito eliminado correctamente');
    });
});


  app.get('/favoritos/:id_user', (req, res) => {
    const id_user = req.params.id_user;
  
    const query = `
      SELECT favs.id_fav, favs.id_user, favs.id_cat, categories.name_cat, categories.img_cat
      FROM favs
      INNER JOIN categories ON favs.id_cat = categories.id_cat
      WHERE favs.id_user = ?
    `;
  
    connection.query(query, id_user, (err, results) => {
      if (err) {
        console.error('Error al obtener favoritos:', err);
        res.status(500).send('Error al obtener favoritos de la base de datos');
        return;
      }
  
      if (results.length === 0) {
        res.status(404).send('El usuario no tiene categorías favoritas');
        return;
      }
  
      const favoritosConDetalle = results.map(favorito => {
        const imgBytes = Buffer.from(favorito.img_cat, 'base64').toString('base64');
        return {
          id_fav: favorito.id_fav,
          id_user: favorito.id_user,
          id_cat: favorito.id_cat,
          name_cat: favorito.name_cat,
          img_cat: imgBytes
        };
      });
  
      res.status(200).json(favoritosConDetalle);
    });
  });

//--------------------------------------SAVED-------------------------------------------------------------------------------------------------------


app.post('/saved/insert', (req, res) => {
    const { id_user, id_cat } = req.body;
  
    const query = 'INSERT INTO saved (id_user, id_cat) VALUES (?, ?)';
    const values = [id_user, id_cat];
  
    connection.query(query, values, (err, result) => {
      if (err) {
        console.error('Error al insertar:', err);
        res.status(500).send('Error al insertar en la base de datos');
        return;
      }
      console.log('Guardado insertado correctamente:', result);
      res.status(200).send('Guardado insertado correctamente');
    });
  });


  app.delete('/saved/fav/delete/:id_user/:id_cat', (req, res) => {
    const id_user = req.params.id_user;
    const id_cat = req.params.id_cat;

    const deleteQuery = 'DELETE FROM saved WHERE id_user = ? AND id_cat = ?';
    const deleteValues = [id_user, id_cat];

    connection.query(deleteQuery, deleteValues, (deleteErr, deleteResult) => {
        if (deleteErr) {
            console.error('Error al eliminar:', deleteErr);
            res.status(500).send('Error al eliminar de la base de datos');
            return;
        }
        console.log('Saved eliminado correctamente:', deleteResult);

        // Después de que se complete la eliminación, procedemos con la inserción
        const insertQuery = 'INSERT INTO favs (id_user, id_cat) VALUES (?, ?)';
        const insertValues = [id_user, id_cat];

        connection.query(insertQuery, insertValues, (insertErr, insertResult) => {
            if (insertErr) {
                console.error('Error al insertar:', insertErr);
                res.status(500).send('Error al insertar en la base de datos');
                return;
            }
            console.log('Favorito insertado correctamente:', insertResult);
            res.status(200).send('Favorito insertado correctamente');
        });
    });
});


  app.delete('/saved/delete/:id_user/:id_cat', (req, res) => {
    const id_user = req.params.id_user;
    const id_cat = req.params.id_cat;

    const query = 'DELETE FROM saved WHERE id_user = ? AND id_cat = ?';
    const values = [id_user, id_cat];

    connection.query(query, values, (err, result) => {
        if (err) {
            console.error('Error al eliminar:', err);
            res.status(500).send('Error al eliminar de la base de datos');
            return;
        }
        console.log('Saved eliminado correctamente:', result);
        res.status(200).send('Saved eliminado correctamente');
    });
});


  app.get('/saved/:id_user', (req, res) => {
    const id_user = req.params.id_user;

    const query = `
      SELECT saved.id_saved, saved.id_user, saved.id_cat, categories.name_cat, categories.img_cat
      FROM saved
      INNER JOIN categories ON saved.id_cat = categories.id_cat
      WHERE saved.id_user = ?
    `;

    connection.query(query, id_user, (err, results) => {
      if (err) {
        console.error('Error al obtener guardados:', err);
        res.status(500).send('Error al obtener guardados de la base de datos');
        return;
      }

      if (results.length === 0) {
        res.status(404).send('El usuario no tiene categorías guardadas');
        return;
      }

      const savedConDetalle = results.map(saved => {
        const imgBytes = Buffer.from(saved.img_cat, 'base64').toString('base64');
        return {
          id_saved: saved.id_saved,
          id_user: saved.id_user,
          id_cat: saved.id_cat,
          name_cat: saved.name_cat,
          img_cat: imgBytes
        };
      });

      res.status(200).json(savedConDetalle);
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




app.get("/friends/count/:id_user", (req, res) => {
    const { id_user } = req.params;
    
    connection.query('SELECT COUNT(*) AS count FROM friends WHERE (id_us1 = ? OR id_us2 = ?) AND estado = "Aceptada"', [id_user, id_user], (error, results) => {
        if (error) {
            console.error('Error al realizar la consulta:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        const count = results[0].count;
        res.status(200).json({ count });
    });
});


app.get("/friends/:id_user", (req, res) => {
    const { id_user } = req.params;
    
    connection.query('SELECT * FROM friends WHERE (id_us1 = ? OR id_us2 = ?) AND estado = "Aceptada"', [id_user, id_user], (error, results) => {
        if (error) {
            console.error('Error al realizar la consulta:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        const friends = results;
        
        // Obtener información de usuario asociada a los amigos encontrados
        const userIds = friends.map(friend => friend.id_us1 === id_user ? friend.id_us2 : friend.id_us1);
        
        if (userIds.length === 0) {
            // No se encontraron usuarios asociados a los amigos
            return res.status(200).json([]);
        }
        
        connection.query('SELECT * FROM users WHERE id_user IN (?)', [userIds], (error, userResults) => {
            if (error) {
                console.error('Error al obtener información de usuario:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            const users = userResults.map(user => ({
                id_user: user.id_user,
                email_user: user.email_user,
                nick_user: user.nick_user,
                pass_user: user.pass_user,
                img_user: user.img_user,
                GamesPlayed: user.GamesPlayed
            }));
            
            res.status(200).json(users);
        });
    });
});


app.get("/friends/request/:id_user", (req, res) => {
    const { id_user } = req.params;
    
    connection.query('SELECT * FROM friends WHERE (id_us1 = ? OR id_us2 = ?) AND estado = "pendiente"', [id_user, id_user], (error, results) => {
        if (error) {
            console.error('Error al realizar la consulta:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        const friends = results;
        
        // Obtener información de usuario asociada a los amigos encontrados
        const userIds = [];
        friends.forEach(friend => {
            if (friend.id_us1 === parseInt(id_user)) {
                userIds.push(friend.id_us2);
            } else {
                userIds.push(friend.id_us1);
            }
        });
        
        if (userIds.length === 0) {
            // No se encontraron usuarios asociados a los amigos
            return res.status(200).json([]);
        }
        
        const userIdsExceptCurrentUser = userIds.filter(userId => userId !== parseInt(id_user));
        
        if (userIdsExceptCurrentUser.length === 0) {
            // No hay otros usuarios que enviaran solicitudes de amistad
            return res.status(200).json([]);
        }
        
        connection.query('SELECT * FROM users WHERE id_user IN (?)', [userIdsExceptCurrentUser], (error, userResults) => {
            if (error) {
                console.error('Error al obtener información de usuario:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            const users = userResults.map(user => ({
                id_user: user.id_user,
                email_user: user.email_user,
                nick_user: user.nick_user,
                pass_user: user.pass_user,
                img_user: user.img_user,
                GamesPlayed: user.GamesPlayed
            }));
            
            res.status(200).json(users);
        });
    });
});








//--------------------------------------ROOM-------------------------------------------------------------------------------------------------------

app.get("/rooms", (req, res) => {
    connection.query('SELECT room.*, COUNT(roomgame.id_user) AS userCount, categories.img_cat FROM room LEFT JOIN roomgame ON room.id_room = roomgame.id_room LEFT JOIN categories ON room.id_cat = categories.id_cat WHERE room.status_room = "OPEN" GROUP BY room.id_room', (error, results) => {
        if (error) {
            console.error('Error al obtener los datos de la tabla room:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        // Convertir las imágenes de las habitaciones a Base64
        const roomsWithBase64 = results.map(room => {
            const imgBytes = room.img_cat; // Suponiendo que la columna img_cat contiene los bytes de la imagen
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_room: room.id_room,
                pass_room: room.pass_room,
                status_room: room.status_room,
                id_cat: room.id_cat,
                name_room: room.name_room,
                userCount: room.userCount,
                img_cat: imgBase64
            };
        });

        res.status(200).json(roomsWithBase64);
    });
});



app.get("/categories", (req, res) => {
    connection.query('SELECT id_cat, name_cat, img_cat FROM categories', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Convertir las imágenes de las categorías a Base64
        const categoriesWithBase64 = results.map(category => {
            const imgBytes = category.img_cat;
            const imgBase64 = Buffer.from(imgBytes).toString('base64');
            return {
                id_cat: category.id_cat,
                name_cat: category.name_cat,
                img_cat: imgBase64
            };
        });

        res.status(200).json(categoriesWithBase64);
    });
});

//--------------------------------------MULTIJUGADOR-------------------------------------------------------------------------------------------------------


app.post("/room/create", (req, res) => {
    const { id_cat, id_user, nameRoom, passRoom} = req.body;
    connection.query('INSERT INTO room (id_cat, name_room, pass_room) VALUES (?, ?, ?)', [id_cat, nameRoom, passRoom], (error, results) => {
        if (error) {
            console.error('Error al insertar la nueva sala:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        const roomId = results.insertId;
        connection.query('INSERT INTO roomgame (id_room, id_user, admin) VALUES (?, ?, true)', [roomId, id_user], (error, results) => {
            if (error) {
                console.error('Error al insertar el nuevo juego de sala:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            res.status(201).json(roomId);
        });        
    });
});



app.post("/room/join", (req, res) => {
    const { id_room, id_user, password } = req.body;

    // Consulta para obtener la contraseña de la sala
    connection.query('SELECT pass_room FROM room WHERE id_room = ?', [id_room], (error, results) => {
        if (error) {
            console.error('Error al obtener la contraseña de la sala:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No se encontró la sala' });
        }
        const roomPassword = results[0].pass_room;


        // Verificar si la contraseña poprorcionada coincide con la contraseña de la sala
        if (password !== roomPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // La contraseña coincide, proceder con la inserción del nuevo juego de sala
        connection.query('INSERT INTO roomgame (id_room, id_user) VALUES (?, ?)', [id_room, id_user], (error, results) => {
            if (error) {
                console.error('Error al insertar el nuevo juego de sala:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            res.status(201).json({ message: 'Se ha unido correctamente' });
        });
    });
});



app.get("/room/:id_room/users", (req, res) => {
    const id_room = req.params.id_room;

    connection.query('SELECT rg.id_user, u.nick_user, rg.vote_game, rg.admin FROM roomgame rg JOIN users u ON rg.id_user = u.id_user WHERE rg.id_room = ?', [id_room], (error, results) => {
        if (error) {
            console.error('Error al recuperar los usuarios y sus votos:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Si se encontraron resultados, enviarlos como respuesta
        res.status(200).json(results);
    });
});

app.post("/room/updateVote", (req, res) => {
    const { id_room, id_user, vote_game } = req.body; 

    connection.query('UPDATE roomgame SET vote_game = ? WHERE id_room = ? AND id_user = ?', [vote_game, id_room, id_user], (error, results) => {
        if (error) {
            console.error('Error al actualizar el voto en roomgame:', error);
            return res.status(500).json({ success: false, error: 'Error interno del servidor' });
        }
        
        // La actualización se realizó con éxito
        console.log('Voto actualizado correctamente en la tabla roomgame');
        res.status(200).json({ success: true, message: 'Voto actualizado correctamente' });
    });
});



app.get("/room/WinnerRound/:id_room", (req, res) => {
    const id_room = req.params.id_room;

    connection.query('SELECT vote_game, COUNT(*) AS vote_count FROM roomgame WHERE id_room = ? AND vote_game IS NOT NULL AND vote_game <> "" GROUP BY vote_game ORDER BY vote_count DESC LIMIT 1', [id_room], (error, results) => {
        if (error) {
            console.error('Error al obtener el juego más votado:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'No se encontraron votos para esta sala' });
        }

        const mostVotedGame = results[0].vote_game;
        res.status(200).json({ mostVotedGame });
    });
});




app.post("/room/start", (req, res) => {
    const { id_room, id_user } = req.body;

    connection.query('UPDATE roomgame SET vote_game = "LISTO" WHERE id_room = ? AND id_user = ?', [id_room, id_user], (error, results) => {
        if (error) {
            console.error('Error al actualizar el estado del juego de sala:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Función para verificar si todos los jugadores han votado
        function checkAllVotes() {
            connection.query('SELECT * FROM roomgame WHERE id_room = ? AND vote_game = ""', [id_room], (error, results) => {
                if (error) {
                    console.error('Error al verificar el estado del juego de sala:', error);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                // Si todos los jugadores han votado
                if (results.length === 0) {
                    // Actualizar el estado de la sala a "CLOSED"
                    connection.query('UPDATE room SET status_room = "CLOSED" WHERE id_room = ?', [id_room], (error, results) => {
                        if (error) {
                            console.error('Error al actualizar el estado de la sala:', error);
                            return res.status(500).json({ error: 'Error interno del servidor' });
                        }
                        // Actualizar el estado de votación para los usuarios de la sala a ""
                        connection.query('UPDATE roomgame SET vote_game = "" WHERE id_room = ? AND id_user = ?', [id_room, id_user], (error, results) => {
                            if (error) {
                                console.error('Error al actualizar el estado de votación de los usuarios de la sala:', error);
                                return res.status(500).json({ error: 'Error interno del servidor' });
                            }
                            console.log('Estado de votación del usuario de la sala actualizado correctamente');
                            res.status(201).json({ message: 'La sala se ha cerrado correctamente'});
                        });
                    });
                } else {
                    // Si aún hay jugadores que no han votado, esperar un momento y volver a verificar
                    console.log('Esperando a que todos los jugadores voten...');
                    setTimeout(checkAllVotes, 1000); // Esperar 1 segundo antes de volver a verificar
                }
            });
        }

        // Comprobar si se realizó con éxito la actualización antes de comenzar a verificar los votos
        if (results.affectedRows > 0) {
            // Comenzar a verificar si todos los jugadores han votado
            checkAllVotes();
        } else {
            console.error('No se encontraron juegos de sala para actualizar');
            res.status(500).json({ error: 'No se encontraron juegos de sala para actualizar' });
        }
    });
});


app.post("/room/updateVote", (req, res) => {
    const { id_room, id_user, vote_game } = req.body; 

    connection.query('UPDATE roomgame SET vote_game = ? WHERE id_room = ? AND id_user = ?', [vote_game, id_room, id_user], (error, results) => {
        if (error) {
            console.error('Error al actualizar el voto en roomgame:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        // La actualización se realizó con éxito
        console.log('Voto actualizado correctamente en la tabla roomgame');

    });
});






app.post("/room/end", (req, res) => {
    const { id_room, id_user } = req.body;

    // Eliminar el registro de la sala para el usuario específico
    connection.query('DELETE FROM roomgame WHERE id_room = ? AND id_user = ?', [id_room, id_user], (error, results) => {
        if (error) {
            console.error('Error al eliminar el juego de sala:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Verificar si todavía hay usuarios en la sala
        connection.query('SELECT COUNT(*) AS userCount FROM roomgame WHERE id_room = ?', [id_room], (error, results) => {
            if (error) {
                console.error('Error al contar los usuarios de la sala:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            const userCount = results[0].userCount;

            if (userCount === 0) {
                // Si no quedan usuarios en la sala, eliminar la sala
                connection.query('DELETE FROM room WHERE id_room = ?', [id_room], (error, results) => {
                    if (error) {
                        console.error('Error al eliminar la sala:', error);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }
                    console.log('Sala eliminada correctamente');
                    res.status(200).json({ message: 'Sala eliminada correctamente' });
                });
            } else {
                // Si aún quedan usuarios en la sala, verificar si hay alguno con admin = 1
                connection.query('SELECT COUNT(*) AS adminCount FROM roomgame WHERE id_room = ? AND admin = 1', [id_room], (error, results) => {
                    if (error) {
                        console.error('Error al contar los usuarios administradores de la sala:', error);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }

                    const adminCount = results[0].adminCount;

                    if (adminCount === 0) {
                        // Si no hay usuarios administradores en la sala, actualizar al primero como administrador
                        connection.query('UPDATE roomgame SET admin = 1 WHERE id_room = ? ORDER BY id_roomgame LIMIT 1', [id_room], (error, results) => {
                            if (error) {
                                console.error('Error al actualizar el primer usuario como administrador:', error);
                                return res.status(500).json({ error: 'Error interno del servidor' });
                            }
                            console.log('Primer usuario actualizado como administrador');
                            res.status(200).json({ message: 'Primer usuario actualizado como administrador' });
                        });
                    } else {
                        console.log('No se necesita actualizar al primer usuario como administrador');
                        res.status(200).json({ message: 'No se necesita actualizar al primer usuario como administrador' });
                    }
                });
            }
        });
    });
});



//--------------------------------------FUNCIONA-------------------------------------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log("server running on port", 3000);
});