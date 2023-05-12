require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { config } = require('dotenv')




const app = express();
app.set('view engine', 'ejs')
app.use("/public", express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }))


mongoose.connect(`mongodb+srv://maheepgupta:${process.env.DB_PASSWORD}@cluster0.j8jvfuc.mongodb.net/userCredentials`);


const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log("Database is connected Successfully");
});

// Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String
})


// Model
const userCollection = mongoose.model('userCollection', userSchema)

var LoggedIn = false;
app.get('/', async (req, res) => {
    await res.render('home')
})
app.get('/secrets', async (req, res) => {
    console.log(LoggedIn)
    LoggedIn ? await res.render('secrets') : await res.render('home');
})
app.get('/logout', async (req, res) => {
    LoggedIn = false
    await res.redirect('/')
})

// For Register
app.route('/register')

    .get(async (req, res) => {
        await res.render('register')
    })

    .post(async (req, res) => {

        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            const userData = new userCollection({
                username: req.body.username,
                password: hash
            })
            // whether user exist's or not
            userCollection.findOne({ username: req.body.username })
                .then((exsitingUserName) => {
                    // Its is a new User
                    if (exsitingUserName == null) {
                        console.log("user Not exist")
                        userData.save()
                        LoggedIn = true;
                        res.redirect('/secrets')
                    }
                    else {
                        //User Already Exists
                        console.log("user  exist")
                        res.redirect('/register')
                    }
                })
                .catch((err) => {
                    console.log(err);
                });

        });




    });




app.route('/login')
    .get(async (req, res) => {
        await res.render('login')
    })
    .post(async (req, res) => {
        userCollection.findOne({ username: req.body.username })
            .then((loggingUser) => {
                // User Not registered
                if (loggingUser == null) {
                    console.log("user Not exist")
                }
                else {
                    //User Exists
                    bcrypt.compare(req.body.password, loggingUser.password).then(function (result) {
                        if (result == true) {
                            console.log("Login successful")
                            LoggedIn = true;
                            res.redirect('/secrets')
                            // result == true
                        }
                        else {
                            console.log("Wrong Passwords")
                            res.render('login')
                        }
                    });


                }
            })
            .catch((err) => {
                console.log(err);
            });
    })




app.listen(3000, () => {
    console.log("Server Boomed")
})