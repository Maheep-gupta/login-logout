require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocal = require('passport-local')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { config } = require('dotenv')





const app = express();
app.set('view engine', 'ejs')
app.use("/public", express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    secret: 'ncgvbjhsdfska;klfk',
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
}))

app.use(passport.initialize())
app.use(passport.session())


mongoose.connect(`mongodb+srv://maheepgupta:${process.env.DB_PASSWORD}@cluster0.j8jvfuc.mongodb.net/userCredentials`);


const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log("Database is connected Successfully");
});

// Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secrets: String
})
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate);


// Model
const userCollection = mongoose.model('userCollection', userSchema)

passport.use(userCollection.createStrategy())

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        userCollection.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get('/', async (req, res) => {
    await res.render('home')
});
app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get('/secrets', async (req, res) => {
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        const secrets = await userCollection.find({ 'secrets': { $ne: null } })
        console.log(secrets)
        res.render("secrets", { foundSecrets: secrets })
    } else {
        res.redirect('/login')
    }
})

app.get('/submit', async (req, res) => {
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        console.log("Authenticated")
        res.render('submit')
    } else {
        res.redirect('/login')
    }
})


app.post('/submit', async (req, res) => {

    await userCollection.findOneAndUpdate(
        { _id: req.user.id },
        { secrets: req.body.secret })
    console.log(req.user.id);
    // if (foundingUser!=null) {
    //     foundingUser.secrets=req.body.secret
    //     // console.log(foundingUser);
    //     // userCollection.save().then(function(err, result) {
    //     //     console.log('User Created');
    //     // });
    res.redirect("/secrets")
    // } else {
    //     console.log("No secrets")
    // }

})



app.get('/logout', async (req, res) => {
    req.logout(function (err) {
        if (err) { return console.log(err); }
        res.redirect('/');
    });
})

// For Register
app.route('/register')

    .get(async (req, res) => {
        await res.render('register')
    })

    .post(async (req, res) => {

        userCollection.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) {
                console.log(err)
                res.redirect('/register')
            } else {
                passport.authenticate('local')(req, res, () => {
                    console.log(req.isAuthenticated());
                    res.redirect('/secrets')
                })
            }
        })




    });




app.route('/login')
    .get(async (req, res) => {
        await res.render('login')
    })
    .post(async (req, res) => {
        const user = new userCollection({
            username: req.body.username,
            passport: req.body.password
        })
        req.login(user, (err) => {
            if (err) {
                console.log(err)
                res.redirect('/login')
            } else {
                passport.authenticate('local')(req, res, () => {

                    res.redirect('/secrets')
                })
            }
        })

    })




app.listen(3000, () => {
    console.log("Server Boomed")
})