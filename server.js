const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: 'secret', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

mongoose.connect('mongodb://localhost:27017/CHEF', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.use(express.static('public'));


app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','login.html'));
});

const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String
});
const Contact = mongoose.model('Contact', contactSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    order_by: String
  });
const Order = mongoose.model('Order', orderSchema);

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ email: req.body.email, password: hashedPassword });
        await newUser.save();
        res.redirect('/login.html');
    } catch {
        res.redirect('/register.html');
    }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        req.session.userId = user._id; // Set user session
        req.session.userName = user.email; // Store the user's email or name in the session
        res.redirect('/'); // Redirect to the home page
    } else {
        res.redirect('/login.html');
    }
});

app.get('/getuserinfo', (req, res) => {
    if (req.session.userId) {
        res.json({ userName: req.session.userName });
    } else {
        res.status(401).json({ error: 'Not Authenticated' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/login');  // Redirect to login page after logout
    });
});

app.post('/submit-form', (req, res) => {
    const newContact = new Contact({
        name: req.body.name,
        email: req.body.email,
        message: req.body.message
    });
    
    newContact.save()
        .then(() => res.send('<p>Thank you for contacting us!</p>'))
        .catch(err => res.status(400).send("Error saving data!"));
});

app.post('/order', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' }); // Check if user is logged in
    }

    
    const { name, price, description } = req.body;
    const userEmail = req.session.userName;
    const newOrder = new Order({ name, price, description, order_by:userEmail });
    newOrder.save()
        .then(() =>  res.status(201).json({ message: 'Order placed successfully!' }))
        .catch(err => res.status(500).json({ message: 'Failed to place order' }));
  
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
