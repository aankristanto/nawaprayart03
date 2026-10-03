const express = require('express');
const handlebars = require('express-handlebars');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql');
// const fs = require('fs');
// const sha1 = require('sha1');

// create function express
const app = express();
const port = 5123;


// set environment variable
process.env.NODE_ENV === "production";
process.env.TZ = 'Asia/Jakarta';

// app configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
//app.use(express.static('public'));
app.use(express.static('public', { maxAge: '31556952000' }));
app.set('view engine', 'handlebars');

// create handlebars helper function
var hbs = handlebars.create({
    helpers: {
        inc: function (value, options) {
            return parseInt(value) + 1;
        },
        isMultipleOf: function (index, multiple, options) {
            return (index % multiple === 0) ? options.fn(this) : options.inverse(this);
        },
        eq: function (a, b, options) {
            const sama = String(a) === String(b);
            return sama ? options.fn(this) : options.inverse(this);
        }
    }
});

// set engine handlebars
app.engine('handlebars', hbs.engine);
app.enable('view cache');
app.set('view cache', true);
app.set("views", "./views");

// db configuration connection
var koneksi = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rt03_nawapraya'
});

koneksi.connect((err) => {
    if (err) throw err;
    console.log("Database Connected");
});

app.use(session({
    name: 'RT03_NAWAPRAYA',
    secret: 'valueintegritypassion',
    saveUninitialized: true,
    resave: false,
    cookie: {
        secure: false
    }
}));


app.get('/', (req, res) => {
    const session = req.session;
    if (session.user) {
        res.redirect('/home');
    } else {
        res.render('login', {
            layout: 'default',
            title: 'Nawapraya RT03 - Portal Warga'
        });
    }
});


app.post('/app/auth/loginaction', (req, res) => {
    const loginblock = req.body.inputusername;
    const loginphone = req.body.inputpassword;
    if (loginblock && loginphone) {
        koneksi.query(`SELECT * FROM users WHERE ID_BLOK = ? AND NO_TELP = ?`, [loginblock, loginphone], (err, hasil) => {
            if (err) throw err;
            if (hasil.length > 0) {
                req.session.user = {
                    block: hasil[0].ID_BLOK,
                    name: hasil[0].NAMA_KK,
                    phone: hasil[0].NO_TELP,
                    level: hasil[0].LEVEL
                };
                res.redirect('/home');
            } else {
                res.redirect('/login');
            }
        });
    } else {
        res.redirect('/');
    }
});



app.get('/home', (req, res) => {
    const session = req.session;
    if (session.user) {
        const loginname = session.user.name;
        const loginblock = session.user.block;
        const loginphone = session.user.phone;
        const loginlevel = session.user.level;
        res.render('Index', {
            layout: 'home',
            title: 'Nawapraya RT03 - Portal Warga',
            name: loginname,
            block: loginblock,
            phone: loginphone,
            level: loginlevel
        });
    } else {
        res.redirect('/');
    }
});


app.get('/app/iuran-bulanan/view', (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect('/');

    const tahuniuran = req.query.tahun || new Date().getFullYear();

    let sql = `
        SELECT ib.ID_TRX, ib.ID_BLOK, u.NAMA_KK, ib.TAHUN, ib.BULAN, ib.NOMINAL
        FROM iuran_bulanan ib
        LEFT JOIN users u ON u.ID_BLOK = ib.ID_BLOK
        WHERE ib.TAHUN = ?`;
    const params = [tahuniuran];

    if (user.level !== 'ADMIN') {
        sql += ' AND ib.ID_BLOK = ?';
        params.push(user.block);
    }
    sql += ' ORDER BY ib.ID_BLOK';

    koneksi.query(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan pada server');
        }
        res.render('page-iuran-bulanan', {
            layout: 'home',
            title: 'Nawapraya RT03 - Iuran Bulanan Warga',
            name: user.name,
            block: user.block,
            phone: user.phone,
            level: user.level,
            tahuniuran,
            dataIuranBulanan: rows
        });
    });
});


app.get('/app/iuran-sampah/view', (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect('/');

    const tahuniuran = req.query.tahun || new Date().getFullYear();

    let sql = `
        SELECT ib.ID_TRX, ib.ID_BLOK, u.NAMA_KK, ib.TAHUN, ib.BULAN, ib.NOMINAL
        FROM iuran_sampah ib
        LEFT JOIN users u ON u.ID_BLOK = ib.ID_BLOK
        WHERE ib.TAHUN = ?`;
    const params = [tahuniuran];

    if (user.level !== 'ADMIN') {
        sql += ' AND ib.ID_BLOK = ?';
        params.push(user.block);
    }
    sql += ' ORDER BY ib.ID_BLOK';

    koneksi.query(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Terjadi kesalahan pada server');
        }
        res.render('page-iuran-sampah', {
            layout: 'home',
            title: 'Nawapraya RT03 - Iuran Sampah Warga',
            name: user.name,
            block: user.block,
            phone: user.phone,
            level: user.level,
            tahuniuran,
            dataIuranSampah: rows
        });
    });
});



// route to handle page 404
app.use((req, res) => {
    res.redirect('/');
});


// listen protocol to variable port
app.listen(port, () => {
    console.log(`Nawapraya RT 03 App is running on port ${port}`)
});
