// FINAL WORKING app.js
// ✅ Import required modules
const express = require("express"); // Web framework for creating the server and handling routes
const session = require("express-session"); // Middleware for managing user sessions
const fs = require("fs-extra"); // File system module with promise support and extra methods
const path = require("path"); // Utility for handling and transforming file paths
const axios = require("axios"); // HTTP client for making API requests (e.g., to PokéAPI)
const bcrypt = require("bcrypt"); // Library for hashing and comparing passwords securely
const { Parser } = require("json2csv"); // CSV parser for converting JSON data to CSV format

// ✅ Predefined list of popular Pokémon IDs (used for Popular Pokémons page)
const POPULAR_IDS = [1, 6, 7, 9, 12, 25, 59, 94, 132, 133, 134, 143, 149, 150, 151, 493];

// ✅ Initialize Express app
const app = express();

// ✅ Define the port number for the server to listen on
const PORT = process.env.PORT || 3000;

// ✅ Define the path to the JSON file that stores all user data
const USERS_FILE = path.join(__dirname, "Data", "users.json");

// ✅ Create an in-memory Set to track online users by their userId
const onlineUsers = new Set();

// ✅ Configure session middleware
app.use(session({
  secret: "pokemon_secret_key",      // Session encryption key (should be complex and secret)
  resave: false,                     // Don't force saving session if nothing changed
  saveUninitialized: false           // Don't create session for unauthenticated users
}));

// ✅ Built-in middleware to parse JSON bodies in incoming requests
app.use(express.json());

// ✅ Serve static files (HTML, CSS, JS, images) from the "client" folder
app.use(express.static(path.join(__dirname, "client")));

// ✅ Custom middleware: protects routes by checking if the user is logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    // If session doesn't have a userId → reject access
    return res.status(401).json({ error: "Unauthorized" });
  }
  next(); // User is logged in → proceed to next middleware/route
}



// ✅ Root page – Introduction or redirect to /home if already logged in
app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/home"); // If user is logged in, go to home
  res.sendFile(path.join(__dirname, "client", "Introduction.html")); // Otherwise show intro
});

// ✅ Login page (public)
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "LogInPage.html"));
});

// ✅ Register page (public)
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "RegisterPage.html"));
});

// ✅ Home page – protected, must be logged in
app.get("/home", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client", "HomePage.html"));
});

// ✅ Favorites page – protected
app.get("/favorites", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client", "Favorites.html"));
});

// ✅ Popular Pokémons page – protected
app.get("/popular_pokemons", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client", "popular_pokemons.html"));
});

// ✅ Individual Pokémon details – protected
app.get("/pokemon/:id", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client", "PokemonDetails.html"));
});

// ✅ Arena: VS Bot – protected
app.get("/arena/vs-bot", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client/arena", "vs-bot.html"));
});

// ✅ Arena: VS Human – protected
app.get("/arena/vs-human", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client/arena", "vs-human.html"));
});

// ✅ Arena: Leaderboard – protected
app.get("/arena/leaderboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client/arena", "LeaderBoard.html"));
});

// ✅ Arena: Fights History – protected
app.get("/arena/fight_history", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "client/arena", "FightsHistory.html"));
});




/**
 * @route   GET /api/pokemon/random
 * @access  Protected (requires login)
 * @desc    Returns a random Pokémon (ID 1–150) with its basic battle stats.
 * 
 * ✅ This endpoint is used when the bot (AI opponent) needs a random Pokémon for battle.
 * ✅ It fetches data from the external PokéAPI.
 * ✅ The returned data includes: id, name, image, and stats (HP, Attack, Defense, Speed).
 * 
 * 📥 Request: No body needed.
 * 📤 Response:
 * {
 *   id: 25,
 *   name: "pikachu",
 *   image: "https://...",
 *   stats: {
 *     hp: 35,
 *     attack: 55,
 *     defense: 40,
 *     speed: 90
 *   }
 * }
 */

app.get("/api/pokemon/random", requireLogin, async (req, res) => {
  try {
    // 🎲 Get random Pokémon ID from 1 to 150
    const id = Math.floor(Math.random() * 150) + 1;

    // 🌐 Fetch data from PokéAPI
    const r = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const p = r.data;

    // 🧮 Extract individual stats by name
    const getStat = name => p.stats.find(s => s.stat.name === name)?.base_stat || 0;

    // ✅ Send simplified Pokémon object to client
    res.json({
      id: p.id,
      name: p.name,
      image: p.sprites.front_default,
      stats: {
        hp: getStat("hp"),
        attack: getStat("attack"),
        defense: getStat("defense"),
        speed: getStat("speed")
      }
    });

  } catch (err) {
    // ❌ Handle errors (e.g., API unreachable or ID not found)
    console.error("Failed to load random Pokémon:", err.message);
    res.status(404).json({ error: "Bot not found" });
  }
});





/**
 * @route   GET /api/projectinfo
 * @access  Public
 * @desc    Fetches the project description and student information.
 * 
 * ✅ This endpoint reads the JSON file `Data/project_info.json`.
 * ✅ It's typically used to populate dynamic content in the Introduction.html page.
 * 
 * 📥 Request: No parameters or body required.
 * 📤 Response Example:
 * {
 *   description: "This is a Pokémon web app project...",
 *   students: [
 *     { name: "Anan Farhat", id: "123" },
 *     { name: "Another Student", id: "456" }
 *   ]
 * }
 */

app.get("/api/projectinfo", async (req, res) => {
  try {
    // 📁 Read and parse project_info.json file from Data folder
    const data = await fs.readJson(path.join(__dirname, "Data", "project_info.json"));

    // ✅ Send the JSON content to the client
    res.json(data);
  } catch (err) {
    // ❌ If the file doesn't exist or reading fails, return error
    console.error("Error loading project info:", err);
    res.status(500).json({ error: "Could not load project info" });
  }
});



/**
 * @route   POST /register
 * @access  Public
 * @desc    Registers a new user by validating input, checking for duplicates, hashing the password,
 *          creating a new user object, storing it in the JSON file, and starting a session.
 *
 * 📥 Request Body:
 * {
 *   "firstName": "Anan",
 *   "email": "anan@example.com",
 *   "password": "MySecure123!"
 * }
 *
 * 📤 Success Response:
 * { "success": true }
 *
 * ❌ Error Responses:
 * - { success: false, errors: { firstName/email/password: "error message" } }
 * - { success: false, error: "email_exists" }
 * - { success: false, error: "username_exists" }
 * - { success: false, error: "server_error" }
 */

app.post("/register", async (req, res) => {
  const { firstName, email, password } = req.body;
  const errors = {};

  // ✅ Validate first name: only letters & spaces, max 50 chars
  if (!firstName || firstName.length > 50 || /[^a-zA-Z ]/.test(firstName))
    errors.firstName = "Only letters, max 50 chars";

  // ✅ Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email))
    errors.email = "Invalid email";

  // ✅ Validate password: 7–15 chars, upper+lower+special
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z]).{7,15}$/;
  if (!password || !passwordRegex.test(password))
    errors.password = "Password must be 7-15 chars, include upper/lower/special";

  // ❌ If any validation errors, return them immediately
  if (Object.keys(errors).length)
    return res.json({ success: false, errors });

  try {
    // ✅ Make sure users.json file exists
    await fs.ensureFile(USERS_FILE);

    let users = [];
    try {
      // ✅ Try reading existing users
      users = await fs.readJson(USERS_FILE);
    } catch {
      // 🧼 If read fails (file empty or invalid), keep users as []
    }

    // ❌ Check for duplicate email
    if (users.find(u => u.email === email))
      return res.json({ success: false, error: "email_exists" });

    // ❌ Check for duplicate username (case-insensitive)
    if (users.find(u => u.firstName.toLowerCase() === firstName.toLowerCase()))
      return res.json({ success: false, error: "username_exists" });

    // ✅ Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create new user object
    const newUser = {
      id: Date.now(), // unique ID based on timestamp
      firstName,
      email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${firstName}`, // 🧠 Avatar URL via DiceBear
      favorites: [],
      score: { bot: 0, human: 0, total: 0 },
      history: [],
      createdAt: new Date()
    };

    // ✅ Add to users array and write back to file
    users.push(newUser);
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });

    // ✅ Create session for new user
    req.session.userId = newUser.id;
    req.session.firstName = newUser.firstName;

    // 🎉 Success
    res.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, error: "server_error" });
  }
});





/**
 * @route   GET /api/avatar
 * @access  Private (requires user to be logged in)
 * @desc    Returns the current user's avatar URL based on their first name.
 *
 * 🧠 Avatar is generated using DiceBear's "bottts" style with PNG format.
 *
 * 📤 Success Response:
 * { "avatarUrl": "https://api.dicebear.com/9.x/bottts/png?seed=Anan" }
 *
 * ❌ Error Responses:
 * - { error: "Unauthorized" } – if no user session
 * - { error: "User not found" } – if user ID not in users.json
 * - { error: "Failed to load avatar" } – on server failure
 */

app.get("/api/avatar", async (req, res) => {
  try {
    const userId = req.session.userId;

    // ❌ Reject if user is not logged in
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // ✅ Ensure users file exists
    await fs.ensureFile(USERS_FILE);

    // ✅ Read all users from file
    const users = await fs.readJSON(USERS_FILE);

    // 🔍 Find the user by their session userId
    const user = users.find(u => u.id === userId);

    // ❌ If no match, user doesn't exist
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🎨 Generate DiceBear avatar URL with the user's first name as the seed
    const avatarUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(user.firstName)}`;

    // ✅ Return avatar URL
    res.json({ avatarUrl });
  } catch (err) {
    console.error("Error generating avatar:", err);
    res.status(500).json({ error: "Failed to load avatar" });
  }
});




/**
 * @route   POST /login
 * @access  Public
 * @desc    Authenticates user with email and password.
 *
 * 🧾 Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "UserPassword123!"
 * }
 *
 * ✅ On Success:
 * - Starts a session with user ID and first name
 * - Adds the user to the onlineUsers set
 * - Returns: { success: true }
 *
 * ❌ On Failure:
 * - { success: false, error: "missing_fields" } – if email/password not provided
 * - { success: false, error: "invalid_credentials" } – if email or password is wrong
 * - { success: false, error: "server_error" } – on file or hashing error
 */

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // ❌ If missing email or password
  if (!email || !password)
    return res.json({ success: false, error: "missing_fields" });

  try {
    // ✅ Read users from file
    const users = await fs.readJson(USERS_FILE);

    // 🔍 Find user by email
    const user = users.find(u => u.email === email);

    // ❌ No such email found
    if (!user) return res.json({ success: false, error: "invalid_credentials" });

    // 🔐 Compare provided password with stored hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: "invalid_credentials" });

    // ✅ Store user info in session
    req.session.userId = user.id;
    req.session.firstName = user.firstName;

    // 🟢 Mark user as online
    onlineUsers.add(user.firstName);

    // ✅ Send success response
    res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "server_error" });
  }
});




/**
 * @route   POST /api/logout
 * @access  Private (requires existing session)
 * @desc    Logs out the currently logged-in user by:
 *   - Destroying their session
 *   - Removing them from the onlineUsers set
 *
 * ✅ On Success:
 * - Session is destroyed
 * - User is removed from the `onlineUsers` set
 * - Returns: { success: true }
 *
 * ❌ On Failure:
 * - If session destruction fails, returns: { success: false }
 */

app.post("/api/logout", (req, res) => {
  // 📝 Save the username before session is destroyed
  const username = req.session.firstName;

  // 🔥 Destroy session
  req.session.destroy(err => {
    if (err) {
      // ❌ Error while destroying session
      return res.status(500).json({ success: false });
    }

    // 🧹 Remove user from online list if they existed
    if (username) {
      onlineUsers.delete(username);
    }

    // ✅ Successfully logged out
    res.json({ success: true });
  });
});




/**
 * @route   GET /api/online-users
 * @access  Private (session required)
 * @desc    Returns a list of users who are currently online, EXCLUDING the logged-in user.
 *
 * ✅ Request Requirements:
 * - User must be logged in (checked via session).
 *
 * ✅ Response:
 * {
 *   online: [
 *     { firstName: "Ash", avatar: "https://...", id: 123 },
 *     ...
 *   ]
 * }
 *
 * ❌ Errors:
 * - 401 if user is not logged in
 * - 404 if session user not found in user list
 * - 500 if server fails to load users.json
 */

app.get("/api/online-users", async (req, res) => {
  // ✅ Reject if no active session
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 🔄 Load all users
    const users = await fs.readJson(USERS_FILE);

    // 👤 Find current user by session ID
    const currentUser = users.find(u => u.id === req.session.userId);

    if (!currentUser) {
      // ❌ Session user not found in storage
      return res.status(404).json({ error: "User not found" });
    }

    // 🌐 Build the list of online users (excluding self)
    const online = Array.from(onlineUsers)
      .filter(name => name !== currentUser.firstName) // ⛔ Skip current user
      .map(name => {
        // 🔍 Find user object by name
        const user = users.find(u => u.firstName === name);
        return user
          ? {
            firstName: user.firstName,
            avatar: user.avatar,
            id: user.id // ✅ Include ID for client use
          }
          : null; // 🚫 If user not found in data, return null
      })
      .filter(Boolean); // 🚿 Remove null entries

    // ✅ Send the online users list
    res.json({ online });

  } catch (err) {
    console.error("Error in /api/online-users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});





/**
 * @route   GET /api/session
 * @access  Private (session required)
 * @desc    Validates current user session and returns basic user data (ID, name, avatar).
 *
 * ✅ Request Requirements:
 * - Must be logged in (uses `requireLogin` middleware).
 *
 * ✅ Response:
 * {
 *   userId: 123,
 *   firstName: "Ash",
 *   avatar: "https://api.dicebear.com/..."
 * }
 *
 * ❌ Errors:
 * - 401 if no session (handled by requireLogin)
 * - 404 if session ID not found in users file
 */

app.get("/api/session", requireLogin, async (req, res) => {
  // 📂 Load users.json to validate the user
  const users = await fs.readJson(USERS_FILE);

  // 🔍 Find user by session ID
  const user = users.find(u => u.id === req.session.userId);

  if (!user) {
    // ❌ Session refers to a non-existent user
    return res.status(404).json({ error: "User not found" });
  }

  // ✅ Return basic session user info
  res.json({
    userId: user.id,
    firstName: user.firstName,
    avatar: user.avatar // 🖼️ Include avatar for client display
  });
});




/**
 * @route   GET /api/search?q={query}
 * @access  Private (must be logged in)
 * @desc    Searches for Pokémon by:
 *          1. Direct name or ID
 *          2. Type name (e.g., "fire")
 *          3. Ability name (e.g., "overgrow")
 *
 * ✅ Query Parameters:
 *   - q: required string (name, ID, type, or ability)
 *
 * ✅ Response:
 *   An array of matching Pokémon objects:
 *   [
 *     {
 *       id: 25,
 *       name: "pikachu",
 *       image: "...",
 *       types: ["electric"],
 *       abilities: ["static", "lightning-rod"],
 *       isFavorite: true/false
 *     },
 *     ...
 *   ]
 *
 * ❌ Errors:
 *   - 401: Unauthorized (handled by middleware)
 *   - 400: Missing search query
 *   - []: No Pokémon matched
 */

app.get("/api/search", requireLogin, async (req, res) => {
  const query = req.query.q?.toLowerCase(); // 📝 Normalize the query string (name, ID, type, etc.)
  if (!query) return res.status(400).json({ error: "Missing search query" });

  const userId = req.session.userId;
  const users = await fs.readJson(USERS_FILE);
  const user = users.find(u => u.id === userId);

  const isFavorite = id => user.favorites.some(p => p.id === id); // 🟡 Helper to check if a Pokémon is in user's favorites

  try {
    // 🔍 1. Try direct search by name or ID
    const r = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
    const p = r.data;

    return res.json([
      {
        id: p.id,
        name: p.name,
        image: p.sprites.front_default,
        types: p.types.map(t => t.type.name),
        abilities: p.abilities.map(a => a.ability.name),
        isFavorite: isFavorite(p.id)
      }
    ]);
  } catch {
    // ❌ If direct match fails, continue with type/ability search
  }

  // 🔄 2. Try search by type or ability
  for (const type of ["type", "ability"]) {
    try {
      const r = await axios.get(`https://pokeapi.co/api/v2/${type}/${query}`); // 🔎 e.g., /type/fire or /ability/overgrow
      const results = r.data.pokemon.slice(0, 20); // ⛔ Limit to 20 results for performance

      // 🔁 Fetch full Pokémon data for each match
      const all = await Promise.all(
        results.map(p => axios.get(p.pokemon.url).then(r => r.data))
      );

      // 🟢 Return enriched Pokémon list
      return res.json(
        all.map(p => ({
          id: p.id,
          name: p.name,
          image: p.sprites.front_default,
          types: p.types.map(t => t.type.name),
          abilities: p.abilities.map(a => a.ability.name),
          isFavorite: isFavorite(p.id)
        }))
      );
    } catch {
      // ❌ Ignore and try the next type (ability/type)
    }
  }

  // ❌ No match found
  return res.json([]);
});





/**
 * @route   GET /api/pokemon/:id
 * @access  Private (requires login)
 * @desc    Fetch detailed data for a specific Pokémon by its ID.
 *
 * ✅ Route Parameter:
 *   - id: number (the Pokémon's unique ID)
 *
 * ✅ Response:
 *   {
 *     id: 25,
 *     name: "pikachu",
 *     image: "https://...",
 *     stats: {
 *       hp: 35,
 *       attack: 55,
 *       defense: 40,
 *       speed: 90
 *     },
 *     types: ["electric"],
 *     abilities: ["static", "lightning-rod"]
 *   }
 *
 * ❌ Errors:
 *   - 401: Unauthorized (if not logged in)
 *   - 404: If Pokémon ID is invalid or not found
 */

app.get("/api/pokemon/:id", requireLogin, async (req, res) => {
  try {
    // 🟡 Fetch Pokémon data by ID from the PokéAPI
    const r = await axios.get(`https://pokeapi.co/api/v2/pokemon/${req.params.id}`);
    const p = r.data;

    // 🔧 Helper function to extract base stat by name (e.g., "attack")
    const getStat = name => p.stats.find(s => s.stat.name === name)?.base_stat || 0;

    // ✅ Build and return structured Pokémon object
    res.json({
      id: p.id,
      name: p.name,
      image: p.sprites.front_default,
      stats: {
        hp: getStat("hp"),
        attack: getStat("attack"),
        defense: getStat("defense"),
        speed: getStat("speed")
      },
      types: p.types.map(t => t.type.name),
      abilities: p.abilities.map(a => a.ability.name)
    });

  } catch (err) {
    // ❌ Catch errors (e.g., invalid ID)
    console.error("Details fetch failed:", err.message);
    res.status(404).json({ error: "Pokémon not found" });
  }
});



/**
 * ✅ Function: hasReachedDailyFightLimit(user)
 * ---------------------------------------------
 * @param {Object} user - A user object from users.json
 *
 * @desc  Checks whether the user has already played 5 battles today.
 *        This function is used to enforce a daily fight limit.
 *
 * ✅ Input:
 *   - user.history: Array of fight records, each with a `date` field (format: YYYY-MM-DD)
 *
 * ✅ Returns:
 *   - true  → if the user has fought 5 or more battles today
 *   - false → otherwise
 */

function hasReachedDailyFightLimit(user) {
  // 🔸 Get today's date in format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  // 🔍 Filter user's fight history to only include fights from today
  const todayFights = user.history?.filter(f => f.date === today) || [];

  // ❌ Limit is 5 fights per day
  return todayFights.length >= 5;
}





/**
 * ✅ Route: POST /api/battle/vs
 * -----------------------------
 * @desc  Handles a battle request between the current user and a human or bot opponent.
 *
 * ✅ Expects in req.body:
 *   - playerPokemon: Object representing the player's selected Pokémon (with name, stats, etc.)
 *   - opponentPokemon: Object representing the opponent's selected Pokémon
 *   - opponentType: string → either "human" or "bot"
 *
 * ✅ Middleware:
 *   - requireLogin → ensures the user is authenticated
 *
 * ✅ Flow:
 *   1. Validate that required data is present.
 *   2. Find the user from users.json.
 *   3. Check if the user has reached their daily fight limit.
 *   4. Call `handleBattle()` to calculate result and update user data.
 *
 * ✅ Returns:
 *   - JSON object with:
 *       - result: "win" | "lose" | "tie"
 *       - playerScore: number
 *       - opponentScore: number
 *       - (plus updates user’s score and history)
 */

app.post("/api/battle/vs", requireLogin, async (req, res) => {
  try {
    // ✅ Destructure the incoming battle payload
    const { playerPokemon, opponentPokemon, opponentType } = req.body;

    // 🔎 Validate required data
    if (!playerPokemon || !opponentPokemon || !opponentType) {
      return res.status(400).json({ error: "Missing battle data" });
    }

    // 📂 Read user data
    const users = await fs.readJson(USERS_FILE);

    // 🔍 Find the current user from session
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ⛔ Check for daily fight limit (5 per day)
    if (hasReachedDailyFightLimit(user)) {
      return res.status(403).json({ error: "Daily fight limit reached (5/day)" });
    }

    // 🧠 Call the battle handler (this does score calculation and saves history)
    console.log("Calling handleBattle with:", user.id, playerPokemon.name, opponentPokemon.name, opponentType);
    const resultData = await handleBattle(user.id, playerPokemon, opponentPokemon, opponentType);

    // ✅ Return the result
    res.json(resultData);

  } catch (err) {
    console.error("Unified battle error:", err);
    res.status(500).json({ error: "Server error during battle" });
  }
});




/**
 * ✅ Function: handleBattle(playerId, playerPokemon, opponentPokemon, opponentType = "bot")
 * -----------------------------------------------------------------------------------------
 * @desc   Simulates a battle between the logged-in user's Pokémon and an opponent's Pokémon (bot or human).
 *
 * @param  {number} playerId - ID of the logged-in user
 * @param  {object} playerPokemon - The user's selected Pokémon (must include stats)
 * @param  {object} opponentPokemon - The opponent's Pokémon
 * @param  {string} opponentType - "bot" or "human" (default: "bot")
 *
 * ✅ What it does:
 *   - Calculates battle scores based on Pokémon stats
 *   - Determines winner ("win", "lose", "tie")
 *   - Updates user's fight history
 *   - Updates user's score (3 points for win, 1 for tie, 0 for loss)
 *   - Saves changes back to users.json
 *
 * ✅ Returns:
 *   - { result, playerScore, opponentScore }
 */

async function handleBattle(playerId, playerPokemon, opponentPokemon, opponentType = "bot") {
  // 📂 Load all users from file
  const users = await fs.readJson(USERS_FILE);

  // 🔍 Find the current user
  const user = users.find(u => u.id === playerId);
  if (!user) throw new Error("User not found");

  // 🧮 Score function based on weighted stats + small randomness
  const score = p =>
    p.stats.hp * 0.3 +
    p.stats.attack * 0.4 +
    p.stats.defense * 0.2 +
    p.stats.speed * 0.1 +
    Math.random() * 10;

  // ⚔️ Calculate scores for both players
  const playerScore = score(playerPokemon);
  const opponentScore = score(opponentPokemon);

  // 🧠 Determine result (tie if scores are close)
  let result;
  if (Math.abs(playerScore - opponentScore) < 2) result = "tie";
  else result = playerScore > opponentScore ? "win" : "lose";

  // 📝 Log the outcome
  console.log(`[BATTLE - ${opponentType.toUpperCase()}] ${playerPokemon.name} vs ${opponentPokemon.name} → ${result}`);

  // 📅 Get today's date for fight history
  const today = new Date().toISOString().slice(0, 10);
  user.history = user.history || [];

  // 🕹️ Record this fight in user's history
  user.history.push({
    date: today,
    opponent: opponentType,
    playerPokemon: {
      id: playerPokemon.id,
      name: playerPokemon.name
    },
    opponentPokemon: {
      id: opponentPokemon.id,
      name: opponentPokemon.name
    },
    result
  });

  // 🏅 Initialize score object if missing
  if (!user.score) user.score = { bot: 0, human: 0, total: 0 };

  // ➕ Update score based on result
  if (result === "win") {
    user.score[opponentType] += 3;
    user.score.total += 3;
  } else if (result === "tie") {
    user.score[opponentType] += 1;
    user.score.total += 1;
  }
  // ❌ lose → no points awarded

  // 💾 Save updated users back to file
  await fs.writeJson(USERS_FILE, users, { spaces: 2 });

  // 🔁 Return result and scores
  return { result, playerScore, opponentScore };
}











/**
 * ✅ Route: GET /users/:userId/favorites
 * --------------------------------------
 * @desc   Fetches a user's list of favorite Pokémon.
 *         Optionally enriches each Pokémon with detailed stats if `?enrich=true` is passed.
 *
 * @access Protected (requireLogin middleware)
 *
 * @params
 *   - :userId — the ID of the user whose favorites to retrieve
 *   - query param `enrich=true` — if present, enriches Pokémon with stats from PokéAPI
 *
 * ✅ What it does:
 *   - Finds the user by ID
 *   - Returns raw favorites OR
 *   - If enrich=true → fetches full Pokémon data (hp, attack, defense, speed)
 *
 * ✅ Returns:
 *   - Array of Pokémon objects (either raw or enriched with stats)
 */

app.get("/users/:userId/favorites", requireLogin, async (req, res) => {
  const userId = req.params.userId;

  // 📂 Read all users from the JSON file
  const users = await fs.readJson(USERS_FILE);

  // 🔍 Find the user by matching ID
  const user = users.find(u => String(u.id) === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const favorites = user.favorites || [];

  // 🔁 Check if enrichment is requested via query param
  const enrich = req.query.enrich === "true";

  if (!enrich) {
    // 🟢 If not enriching, return raw favorites (name, image, types, abilities)
    return res.json(favorites);
  }

  // 🟡 If enrichment is requested, fetch detailed stats from PokéAPI for each Pokémon
  const enrichedFavorites = await Promise.all(
    favorites.map(async (pokemon) => {
      try {
        // 🔗 Call PokéAPI to get full stats
        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);

        const stats = {
          hp: data.stats.find(s => s.stat.name === "hp")?.base_stat || 0,
          attack: data.stats.find(s => s.stat.name === "attack")?.base_stat || 0,
          defense: data.stats.find(s => s.stat.name === "defense")?.base_stat || 0,
          speed: data.stats.find(s => s.stat.name === "speed")?.base_stat || 0
        };

        // 🔄 Return enriched Pokémon with stats
        return {
          id: pokemon.id,
          name: pokemon.name,
          image: pokemon.image,
          stats
        };
      } catch (err) {
        // ❌ If PokéAPI fails for this Pokémon, log and skip
        console.error(`Failed to fetch stats for Pokémon ID ${pokemon.id}:`, err.message);
        return null;
      }
    })
  );

  // ✅ Filter out failed fetches and return the enriched list
  res.json(enrichedFavorites.filter(Boolean));
});




//Get the popular Pokémon list
/**
 * ✅ Route: GET /api/popular-pokemons
 * -----------------------------------
 * @desc   Returns a list of hand-picked popular Pokémon (based on predefined IDs).
 *         The Pokémon are fetched from the external PokéAPI.
 *
 * @access Protected (requireLogin middleware)
 *
 * ✅ What it does:
 *   - Uses the constant POPULAR_IDS (list of Pokémon IDs)
 *   - Sends parallel requests to PokéAPI to fetch full data for each ID
 *   - Extracts and returns: id, name, official image, types, and abilities
 *
 * ✅ Returns:
 *   - Array of objects like:
 *     {
 *       id: 6,
 *       name: "charizard",
 *       image: "https://...",
 *       types: ["fire", "flying"],
 *       abilities: ["blaze", "solar-power"]
 *     }
 */

app.get("/api/popular-pokemons", requireLogin, async (req, res) => {
  try {
    // 🔁 Create an array of axios GET requests for each popular Pokémon ID
    const requests = POPULAR_IDS.map(id =>
      axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`)
    );

    // ⏱️ Send all requests in parallel
    const responses = await Promise.all(requests);

    // 🧹 Map and extract required data from each response
    const popular = responses.map(r => ({
      id: r.data.id,
      name: r.data.name,
      image: r.data.sprites.other["official-artwork"].front_default, // 🎨 Official artwork image
      types: r.data.types.map(t => t.type.name),
      abilities: r.data.abilities.map(a => a.ability.name),
    }));

    // ✅ Send the formatted result back to client
    res.json(popular);
  } catch (err) {
    // ❌ Handle API or network failures
    console.error("Error fetching popular Pokémon:", err.message);
    res.status(500).json({ error: "Failed to fetch popular Pokémons" });
  }
});




/**
 * ✅ Route: POST /users/:userId/favorites
 * ---------------------------------------
 * @desc   Adds a Pokémon to the user's favorites list.
 *
 * @access Protected (requireLogin middleware)
 *
 * ✅ Request Body:
 *   {
 *     id: Number,           // Pokémon ID
 *     name: String,         // Pokémon name
 *     image: String,        // URL to Pokémon image
 *     types: Array<String>, // [Optional] for client use
 *     abilities: Array<String> // [Optional] for client use
 *   }
 *
 * ✅ What it does:
 *   - Finds the user by userId
 *   - Checks if they already have the Pokémon in favorites
 *   - Limits the list to max 10 favorites
 *   - Saves the Pokémon to their list
 *
 * ✅ Returns:
 *   - { success: true } on success
 *   - { success: false, error: "..." } on failure
 */

app.post("/users/:userId/favorites", requireLogin, async (req, res) => {
  const userId = parseInt(req.params.userId); // 🔢 Convert string to number
  const pokemon = req.body; // 📦 Pokémon to be added

  // 📂 Load users file
  const users = await fs.readJson(USERS_FILE);

  // 🔍 Find user
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // 🛡️ Ensure favorites list exists
  if (!user.favorites) user.favorites = [];

  // 🚫 Enforce max limit of 10 favorites
  if (user.favorites.length >= 10)
    return res.status(400).json({ success: false, error: "Limit reached" });

  // 🚫 Prevent duplicate favorites
  if (user.favorites.some(p => p.id === pokemon.id))
    return res.status(400).json({ success: false, error: "Already in favorites" });

  // ✅ Add and save
  user.favorites.push(pokemon);
  await fs.writeJson(USERS_FILE, users, { spaces: 2 });

  // 📤 Return success
  res.json({ success: true });
});




/**
 * ✅ Route: DELETE /users/:userId/favorites/:pokemonId
 * ----------------------------------------------------
 * @desc   Removes a specific Pokémon from the user's favorites list.
 *
 * @access Protected (requireLogin middleware)
 *
 * ✅ URL Params:
 *   - userId (Number): ID of the user
 *   - pokemonId (Number): ID of the Pokémon to remove
 *
 * ✅ What it does:
 *   - Finds the user by ID
 *   - Filters out the Pokémon with the given ID from their favorites
 *   - Saves the updated list
 *
 * ✅ Returns:
 *   - { success: true } on successful removal
 *   - { error: "..." } on failure (user not found, etc.)
 */

app.delete("/users/:userId/favorites/:pokemonId", requireLogin, async (req, res) => {
  const userId = parseInt(req.params.userId);       // 🔢 Convert userId from string to number
  const pokemonId = parseInt(req.params.pokemonId); // 🔢 Convert pokemonId from string to number

  // 📂 Load all users
  const users = await fs.readJson(USERS_FILE);

  // 🔍 Find the user
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // ❌ Remove the Pokémon from favorites
  user.favorites = user.favorites.filter(p => p.id !== pokemonId);

  // 💾 Save updated users list
  await fs.writeJson(USERS_FILE, users, { spaces: 2 });

  // ✅ Respond with success
  res.json({ success: true });
});



/**
 * ✅ Route: GET /api/history
 * --------------------------
 * @desc   Returns the battle history of the currently logged-in user.
 *
 * @access Protected (requires session via requireLogin middleware)
 *
 * ✅ What it receives:
 *   - Session cookie (automatically handled by express-session)
 *
 * ✅ What it does:
 *   - Retrieves the logged-in user's ID from session
 *   - Loads user data from users.json
 *   - Finds the matching user
 *   - Returns their battle history (or an empty array if none exists)
 *
 * ✅ Returns:
 *   - Array of battle history entries (date, opponent type, Pokémon names, result)
 *   - { error: "..." } on failure
 */

app.get("/api/history", requireLogin, async (req, res) => {
  const userId = req.session.userId; // 🔐 Get current user's ID from session

  try {
    const users = await fs.readJson(USERS_FILE); // 📂 Read all users from JSON
    const user = users.find(u => u.id === userId); // 🔍 Find the user by ID

    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Return user's history or empty array
    res.json(user.history || []);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



/**
 * ✅ Route: GET /api/leaderboard
 * ------------------------------
 * @desc   Returns a leaderboard of all users, sorted by total score.
 *
 * @access Public (doesn't require session)
 *
 * ✅ What it receives:
 *   - No request parameters or body
 *
 * ✅ What it does:
 *   - Loads all users from users.json
 *   - Calculates:
 *     - Total number of wins per user
 *     - Total number of battles
 *     - Success rate = (wins / battles) × 100
 *     - Retrieves score and avatar for display
 *   - Sorts users by score in descending order
 *
 * ✅ Returns:
 *   - Array of leaderboard entries:
 *     [
 *       { name, avatar, score, successRate },
 *       ...
 *     ]
 *   - { error: "..." } on failure
 */

app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await fs.readJson(USERS_FILE); // 📂 Load all users from JSON file

    const result = users.map(u => {
      const wins = u.history?.filter(h => h.result === "win").length || 0; // 🏆 Count wins
      const battles = u.history?.length || 0; // ⚔️ Total battles
      const successRate = battles > 0
        ? ((wins / battles) * 100).toFixed(2)
        : "0.00"; // 📈 Calculate win rate (percentage)

      return {
        name: u.firstName,
        avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${u.firstName}`, // 👤 Generate avatar
        score: u.score?.total || 0, // 🎯 Use total score (default to 0)
        successRate // 📊 Win percentage as string with 2 decimals
      };
    }).sort((a, b) => b.score - a.score); // 🔽 Sort descending by score

    res.json(result); // ✅ Send leaderboard to client
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});




/**
 * ✅ Route: GET /users/:userId/favorites/download
 * -----------------------------------------------
 * @desc   Generates and downloads the user's favorites list as a CSV file.
 *
 * @access Private (requires login session)
 *
 * ✅ What it receives:
 *   - URL parameter: userId (String) → The ID of the user requesting the download.
 *
 * ✅ What it does:
 *   - Loads all users from users.json.
 *   - Finds the user matching the given userId.
 *   - Checks if the user exists and has favorite Pokémon.
 *   - Formats the favorites list into CSV format:
 *     - Includes fields: id, name, image, types, abilities.
 *     - Joins arrays (types/abilities) into single strings.
 *   - Sends the CSV file as a downloadable attachment.
 *
 * ✅ Returns:
 *   - CSV file named "favorites.csv" containing the user's favorites.
 *   - If user not found → 404 "User not found."
 *   - If no favorites → 404 "No favorites to download."
 *   - On error → 500 "Failed to generate CSV."
 */

app.get("/users/:userId/favorites/download", requireLogin, async (req, res) => {
  const userId = String(req.params.userId);

  try {
    const users = await fs.readJson(USERS_FILE);
    const user = users.find(u => String(u.id) === userId);

    console.log("📥 Requested download for userId:", userId);
    console.log("🔍 Matched user:", user);

    if (!user) {
      return res.status(404).send("User not found.");
    }

    if (!Array.isArray(user.favorites) || user.favorites.length === 0) {
      return res.status(404).send("No favorites to download.");
    }

    const favorites = user.favorites.map(p => ({
      id: p.id,
      name: p.name,
      image: p.image || "",
      types: Array.isArray(p.types) ? p.types.join("/") : "",
      abilities: Array.isArray(p.abilities) ? p.abilities.join("/") : ""
    }));

    const fields = ["id", "name", "image", "types", "abilities"];
    const parser = new Parser({ fields });
    const csv = parser.parse(favorites);

    res.header("Content-Type", "text/csv");
    res.attachment("favorites.csv");
    res.send(csv);
  } catch (err) {
    console.error("❌ CSV download error:", err);
    res.status(500).send("Failed to generate CSV.");
  }
});





// 🚀 Start the server and listen on specified PORT
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

