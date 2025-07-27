const express = require("express");
const session = require("express-session");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = 3000; 

// Set up session
app.use(session({
  secret: "pokemon_secret_key",
  resave: false,
  saveUninitialized: false
}));

// Serve static files from Client folder
app.use(express.static(path.join(__dirname, "Client")));

// Route: GET /
app.get("/", async (req, res) => {
  // If user is logged in → redirect to HomePage
  if (req.session.userId) {
    return res.redirect("/HomePage.html");
  }

  try {
    // Read project info from JSON file
    const data = await fs.readJson(path.join(__dirname, "Data", "project_info.json"));

    // Build the HTML dynamically
    const studentList = data.students.map(s => `<li>${s.name} - ${s.id}</li>`).join("");
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pokémon Project Introduction</title>
        <link rel="stylesheet" href="Introduction.css" />
      </head>
      <body>
        <div class="container">
          <h1>Welcome to the Pokémon Project</h1>

          <div id="student-info">
            <h2>Students:</h2>
            <ul>${studentList}</ul>
          </div>

          <div id="project-description">
            <h3>Description:</h3>
            <p>${data.description}</p>
          </div>

          <div id="buttons">
            <a href="/RegisterPage.html" class="btn">Register</a>
            <a href="/LoginPage.html" class="btn">Login</a>
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error("Failed to read project info:", err);
    res.status(500).send("Server Error");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
