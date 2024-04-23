const express = require('express'); // Importing Express framework for creating web applications
const bodyParser = require('body-parser'); // dMidleware to parse incoming request bodies
const mongoose = require('mongoose'); // MongoDB object modeling tool designed to work in an asynchronous environment
const bcrypt = require('bcrypt'); // Library for hashing passwords
const session = require('express-session'); // Middleware for managing sessions
const path = require('path'); // Utility for working with file and directory paths

const app = express(); // Creating an Express application
const port = 3000; // Port number for the server to listen on

app.use(bodyParser.urlencoded({ extended: false })); // Parse urlencoded request bodies
app.use(bodyParser.json()); // Parse JSON request bodies

app.use(session({ // Configure session middleware
    secret: 'secret', // Secret used to sign the session ID cookie
    resave: false, // Do not save session for each request
    saveUninitialized: true, // Save uninitialized session
    cookie: { secure: false } // Cookie settings
}));

mongoose.connect('mongodb://localhost:27017/CHEF', { // Connect to MongoDB database
    useNewUrlParser: true, // MongoDB connection options
    useUnifiedTopology: true
});

app.use(express.static('public')); // Serve static files from the 'public' directory

// Routes for registering and logging in
app.get('/register', (req, res) => { // Serve registration form
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => { // Serve login form
    res.sendFile(path.join(__dirname, 'public','login.html'));
});

// Define MongoDB schemas and models
const contactSchema = new mongoose.Schema({ // Schema for storing contact information
    name: String,
    email: String,
    message: String
});
const Contact = mongoose.model('Contact', contactSchema);

const userSchema = new mongoose.Schema({ // Schema for storing user information
    email: { type: String, unique: true }, // Email is unique
    password: String
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({ // Schema for storing order information
    name: String,
    price: Number,
    description: String,
    order_by: String // Store the email of the user who placed the order
});
const Order = mongoose.model('Order', orderSchema);

// Register endpoint
app.post('/register', async (req, res) => { // Handle registration POST request
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10); // Hash the password
        const newUser = new User({ email: req.body.email, password: hashedPassword }); // Create a new user with hashed password
        await newUser.save(); // Save the new user to the database
        res.redirect('/login.html'); // Redirect to login page after successful registration
    } catch {
        res.redirect('/register.html'); // Redirect back to registration page in case of error
    }
});

// Login endpoint
app.post('/login', async (req, res) => { // Handle login POST request
    const user = await User.findOne({ email: req.body.email }); // Find user by email
    if (user && await bcrypt.compare(req.body.password, user.password)) { // Check if password is correct
        req.session.userId = user._id; // Set user session
        req.session.userName = user.email; // Store the user's email in the session
        res.redirect('/'); // Redirect to the home page
    } else {
        res.redirect('/login.html'); // Redirect back to login page in case of authentication failure
    }
});

// Get user info endpoint
app.get('/getuserinfo', (req, res) => { // Endpoint to get user info
    if (req.session.userId) {
        res.json({ userName: req.session.userName }); // Send user's email if authenticated
    } else {
        res.status(401).json({ error: 'Not Authenticated' }); // Send error if not authenticated
    }
});

// Logout endpoint
app.get('/logout', (req, res) => { // Handle logout request
    req.session.destroy(err => { // Destroy session
        if (err) {
            return res.status(500).send('Failed to log out'); // Send error message if logout fails
        }
        res.redirect('/login'); // Redirect to login page after logout
    });
});

// Submit form endpoint
app.post('/submit-form', (req, res) => { // Handle form submission
    const newContact = new Contact({ // Create new contact object
        name: req.body.name,
        email: req.body.email,
        message: req.body.message
    });
    
    newContact.save() // Save contact to the database
        .then(() => res.send('<p>Thank you for contacting us!</p>')) // Send success message
        .catch(err => res.status(400).send("Error saving data!")); // Send error message if saving fails
});

// Order endpoint
app.post('/order', async (req, res) => { // Handle order submission
    if (!req.session.userId) { // Check if user is authenticated
        return res.status(401).json({ message: 'Not authenticated' }); // Send error if not authenticated
    }

    const { name, price, description } = req.body; // Extract order details from request body
    const userEmail = req.session.userName; // Get user's email from session
    const newOrder = new Order({ name, price, description, order_by: userEmail }); // Create new order object
    newOrder.save() // Save order to the database
        .then(() =>  res.status(201).json({ message: 'Order placed successfully!' })) // Send success message
        .catch(err => res.status(500).json({ message: 'Failed to place order' })); // Send error message if saving fails
});

app.listen(port, () => { // Start the server
    console.log(`Server running on http://localhost:${port}`); // Log server start message
});
