const express = require("express");
const bodyParse = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParse.urlencoded({ extended: true}));
app.use(bodyParse.json());


app.get("/", (req,res) =>{
    res.status(200).send("Hola Tincode");
});


app.post("/welcome", (req,res) =>{
    const { username } = req.body;
    res.send(`Hola ${username}`);
});



app.listen(PORT, () => {
    console.log("server running on port", 3000);
});