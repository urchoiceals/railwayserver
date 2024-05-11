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
    res.status(200).send("Hola Gay");
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



app.get("/elements/ranking/:categoryId", (req, res) => {
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


app.get("/elements/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const query = `
        SELECT elements.*, elemcat.victories 
        FROM elemcat
        INNER JOIN elements ON elemcat.id_elem = elements.id_elem
        INNER JOIN categories ON elemcat.id_cat = categories.id_cat
        WHERE categories.id_cat = ?
    `;
    
    connection.query(query, [categoryId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        
        res.status(200).json(results);
    });
});

//--------------------------------------CATEGORIES-------------------------------------------------------------------------------------------------------

app.get("/categories", (req, res) => {
    connection.query('SELECT id_cat, name_cat, CONVERT(img_cat USING utf8) AS img_cat FROM categories', (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json(results);
    });
});

  
app.post("/categories/create", (req, res) => {
    const { name_cat, img_cat, elements } = req.body;

    // Comenzar una transacción
    connection.beginTransaction(function(err) {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ error: 'Error interno del servidor al iniciar la transacción' });
        }

        // Insertar la categoría
        connection.query('INSERT INTO categories (name_cat, img_cat) VALUES (?, ?)', [name_cat, img_cat], (error, categoryResult) => {
            if (error) {
                connection.rollback(function() {
                    console.error('Error al insertar la nueva categoría:', error);
                    return res.status(500).json({ error: 'Error interno del servidor al insertar categoría' });
                });
            }

            const id_cat = categoryResult.insertId; // Obtener el ID de la categoría recién insertada

            // Insertar los elementos en bucle
            let query = 'INSERT INTO elements (img_elem, name_elem) VALUES ?';
            let elementValues = elements.map(element => [element.img_elem, element.name_elem]);

            connection.query(query, [elementValues], (error, elementResult) => {
                if (error) {
                    connection.rollback(function() {
                        console.error('Error al insertar los elementos:', error);
                        return res.status(500).json({ error: 'Error interno del servidor al insertar elementos' });
                    });
                }

                // Obtener los ID de los elementos recién insertados
                const elementIds = elementResult.insertId;

                // Construir los valores para la tabla intermedia
                let elemCatValues = elements.map(element => [elementIds, id_cat, element.victories]);

                // Insertar en la tabla intermedia id_elemcat
                connection.query('INSERT INTO elemcat (id_elem, id_cat, victories) VALUES ?', [elemCatValues], (error, elemCatResult) => {
                    if (error) {
                        connection.rollback(function() {
                            console.error('Error al insertar en la tabla intermedia:', error);
                            return res.status(500).json({ error: 'Error interno del servidor al insertar en tabla intermedia' });
                        });
                    }

                    // Commit de la transacción si todas las inserciones fueron exitosas
                    connection.commit(function(err) {
                        if (err) {
                            connection.rollback(function() {
                                console.error('Error al hacer commit de la transacción:', err);
                                return res.status(500).json({ error: 'Error interno del servidor al hacer commit de la transacción' });
                            });
                        }

                        console.log('Transacción completada con éxito.');
                        res.status(200).json({ message: 'Transacción completada con éxito.' });
                    });
                });
            });
        });
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


//--------------------------------------ROOM-------------------------------------------------------------------------------------------------------

app.get("/rooms", (req, res) => {
    connection.query('SELECT room.*, COUNT(roomgame.id_user) AS userCount, categories.img_cat FROM room LEFT JOIN roomgame ON room.id_room = roomgame.id_room LEFT JOIN categories ON room.id_cat = categories.id_cat WHERE room.status_room = "OPEN" GROUP BY room.id_room', (error, results) => {
        if (error) {
            console.error('Error al obtener los datos de la tabla room:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json(results);
    });
});



//--------------------------------------ROOMGAME-------------------------------------------------------------------------------------------------------

app.post("/elemcat/winner", (req, res) => {
    const { id_elem, id_cat, victories } = req.body;
    
    connection.query('UPDATE elemcat SET victories = ? WHERE id_elem = ? AND id_cat = ?', [victories + 1, id_elem, id_cat], (error, results) => {
        if (error) {
            console.error('Error al actualizar la tabla elemcat:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json({ message: 'Se ha actualizado la tabla elemcat correctamente' });
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


app.post("/roomgame/vote", (req, res) => {
    const { id_room, id_user, vote_game } = req.body;

    // Función para verificar si todos los usuarios han votado
    function checkAllVotes() {
        connection.query('SELECT COUNT(*) AS pendingVotes FROM roomgame WHERE id_room = ? AND vote_game = ""', [id_room], (error, results) => {
            if (error) {
                console.error('Error al comprobar si todos los usuarios han votado:', error);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            const pendingVotes = results[0].pendingVotes;

            if (pendingVotes === 0) {
                // Todos los usuarios han votado, procedemos con la recolección y agrupación de votos
                connection.query('SELECT vote_game, COUNT(*) AS vote_count FROM roomgame WHERE id_room = ? GROUP BY vote_game', [id_room], (error, results) => {
                    if (error) {
                        console.error('Error al recolectar los votos:', error);
                        return res.status(500).json({ error: 'Error interno del servidor' });
                    }
                    connection.query('UPDATE roomgame SET vote_game = "" WHERE id_room = ? AND id_user = ?', [id_room, id_user], (error, results) => {
                        if (error) {
                            console.error('Error al actualizar el estado de votación de los usuarios de la sala:', error);
                            return res.status(500).json({ error: 'Error interno del servidor' });
                        }
                        console.log('Estado de votación del usuario de la sala actualizado correctamente');
                        res.status(200).json({ message: 'Todos los usuarios han votado', vote_counts: results });
                    });
                });
            } else {
                // Algunos usuarios aún no han votado, esperamos un momento y luego volvemos a verificar
                console.log('Esperando a que todos los usuarios voten...');
                setTimeout(checkAllVotes, 1000); // Esperar 1 segundo antes de volver a verificar
            }
        });
    }

    // Actualizar el voto del usuario en la tabla roomgame
    connection.query('UPDATE roomgame SET vote_game = ? WHERE id_room = ? AND id_user = ?', [vote_game, id_room, id_user], (error, results) => {
        if (error) {
            console.error('Error al actualizar el voto en roomgame:', error);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Verificar si todos los usuarios han votado
        checkAllVotes();
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