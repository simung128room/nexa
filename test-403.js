const express = require("express");
const app = express();
app.get("/api/test-403", (req, res) => res.status(403).json({ error: "test 403" }));
app.get("/api/test-401", (req, res) => res.status(401).json({ error: "test 401" }));
app.listen(3001, () => console.log("Test server running on 3001"));
