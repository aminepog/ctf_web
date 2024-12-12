const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const crypto = require("crypto");
const mysql = require("mysql2");
let comments = [];
const app = express();
const PORT = 5500;
let flag = "FLAG{dom_xss}";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "rootroot",
  database: "CTF",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL.");
});

const generateToken = () => {
  const randomString = crypto.randomBytes(16).toString("hex");
  return Buffer.from(randomString).toString("base64");
};

app.get("/dynamic.js", (req, res) => {
  const token = generateToken();
  const obfuscatedScript = `
    (function(){
      const token = "${token}";
      localStorage.setItem("ctfToken", token);
    })();
  `;
  res.set("Content-Type", "application/javascript");
  res.send(obfuscatedScript);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM USERS WHERE username='${username}' AND password='${password}'`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error:", err);
      return res.send("<h1>Something went wrong.</h1>");
    }

    if (results.length > 0) {
      res.send(`
                <h1>Congratulations!</h1>
                <p>Your flag is: FLAG{SQL_INJECTION_PREVENTED}</p>
            `);
    } else {
      res.send("<h1>Invalid credentials. Try again.</h1>");
    }
  });
});

app.get("/validate", (req, res) => {
  const { token, isAdmin } = req.query;

  if (!token || !isAdmin || isAdmin !== "true") {
    return res.send("<h1>Access Denied. Try again.</h1>");
  }

  const decodedToken = Buffer.from(token, "base64").toString("ascii");
  if (decodedToken.length === 32) {
    res.send(`
      <h1>Congratulations!</h1>
      <p>Your flag is: FLAG{TOKEN_VALIDATION_SUCCESS}</p>
    `);
  } else {
    res.send("<h1>Invalid token. Try again.</h1>");
  }
});

app.post("/redirect", (req, res) => {
  const submittedUrl = req.body.url;
  const decodedUrl = decodeURIComponent(submittedUrl);

  if (submittedUrl === decodedUrl) {
    if (decodedUrl === "http://example.com") {
      return res.send(
        "<h1>Permission Denied. You must encode the URL to pass this challenge.</h1>"
      );
    }
  }

  if (decodedUrl === "http://example.com") {
    return res.send(
      "<h1>Congratulations! Here is your flag: FLAG{CORRECT_URL}</h1>"
    );
  }
});

app.post("/submit-comment", (req, res) => {
  const userComment = req.body.comment;
  comments.push(userComment);

  res.send(`
        <h1>Submit a Comment</h1>
        <form action="/submit-comment" method="POST">
            <textarea name="comment" placeholder="Enter your comment" required></textarea>
            <button type="submit">Submit</button>
        </form>

        <h2>Previous Comments</h2>
        <div id="comments">
            ${comments.map((comment) => `<p>${comment}</p>`).join("")}
        </div>

        <p>Hint: The flag is hidden in a JavaScript variable. Try finding it in the comments.</p>
            <script>
            var flag = "${flag}";
        </script>
    `);
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
