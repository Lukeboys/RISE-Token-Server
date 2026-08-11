const express = require("express");
const cors = require("cors");
const fs = require("fs");

const ADMIN = require("./admin.json");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("admin"));

const DB_FILE = "./database.json";

function loadDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function generateToken() {
    return (
        "RISE-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()
    );
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/admin/index.html");
});

app.post("/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === ADMIN.username &&
        password === ADMIN.password
    ) {
        return res.json({
            success: true
        });
    }

    res.json({
        success: false
    });

});

app.post("/admin/create-token", (req, res) => {

    const owner = req.body.owner || "Unknown";

    const db = loadDB();

    const token = generateToken();

    db.tokens.push({
        token,
        owner,
        device_id: null,
        status: "active",
        created_at: Date.now()
    });

    saveDB(db);

    res.json({
        success: true,
        token
    });

});

app.get("/admin/tokens", (req, res) => {

    const db = loadDB();

    res.json(db.tokens);

});

app.post("/admin/revoke", (req, res) => {

    const { token } = req.body;

    const db = loadDB();

    const found = db.tokens.find(
        t => t.token === token
    );

    if (!found) {
        return res.json({
            success: false,
            message: "Token tidak ditemukan"
        });
    }

    found.status = "revoked";

    saveDB(db);

    res.json({
        success: true
    });

});

app.post("/verify", (req, res) => {

    const { token, device_id } = req.body;

    const db = loadDB();

    const found = db.tokens.find(
        t => t.token === token
    );

    if (!found) {
        return res.json({
            success: false,
            message: "Token tidak ditemukan"
        });
    }

    if (found.status !== "active") {
        return res.json({
            success: false,
            message: "Token tidak aktif"
        });
    }

    if (found.device_id === null) {

        found.device_id = device_id;

        saveDB(db);

    }

    if (found.device_id !== device_id) {

        return res.json({
            success: false,
            message: "Token dipakai perangkat lain"
        });
    }

    res.json({
        success: true,
        owner: found.owner
    });

});

app.get("/health", (req, res) => {
    res.json({
        status: "online",
        service: "RISE Token Server"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`RISE Token Server Running On Port ${PORT}`);
});
