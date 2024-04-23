const express = require("express");

const app = express();
const PORT =process.env.PORT || 3000;


app.get("/", (req,res) =>{
    res.send("Hello world");
});



//Esto serian un metodo
app.get("/welcome", (req,res) =>{
    res.send("Hello world");
});

app.get("/welcome", (req,res) =>{
    const { username } = req.body;
    res.send(`Hola ${username}`);
});



app.listen(PORT, () => {
    console.log("server running on port", 3000);
});