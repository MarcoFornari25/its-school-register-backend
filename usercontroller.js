const crypto = require('crypto')
const con = require('./connector');
const jwt = require('jsonwebtoken');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()


function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user

        next()
    })
}

function initUserRoutes(app) {

    app.get('/getallusers', authenticateToken, async (req, res) => {
        pagenumber = (req.query.pagenumber - 1) * req.query.pagesize;
        pagesize = (req.query.pagenumber * req.query.pagesize) - 1;
        try {
            const [data] = await con.execute(`select * from users LIMIT ${pagenumber},${pagesize}`);

            res.json(data);
        } catch (err) {
            console.log("Getallusers Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.get('/getuser', authenticateToken, async (req, res) => {
        try {
            const [data] = await con.execute(`select * from users where id = ? LIMIT 1`, [req.user.userid]);
            res.json(data);
        } catch (err) {
            console.log("Getuser Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.post('/createuser', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {

            //user validation
            const validation = await con.query(`select id from users where fiscalcode = ?`, [requestbody.fiscalcode]);
            if (validation[0].length < 1) {
                var hash = crypto.createHash('sha256').update(requestbody.password).digest('hex');
                //user creation
                const [data] = await con.execute(`insert into users (password,lastname,firstname,phone,email,active,fiscalcode) values (?,?,?,?,?,?,?)`, [hash, requestbody.lastname, requestbody.firstname, requestbody.phone, requestbody.email, requestbody.active, requestbody.fiscalcode]);
                res.json(data);
            } else {
                res.json({ error: true, errormessage: "FISCALCODE_EXISTS" });
            }

        } catch (err) {
            console.log("Createuser Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.post('/login', jsonParser, async (req, res) => {
        let requestbody = req.body;
        try {
            var hash = crypto.createHash('sha256').update(requestbody.pwd).digest('hex');
            const [data] = await con.query(`select u.id, urc.id_role, urc.id_course from users u
            inner join users_roles_courses urc on urc.id_user = u.id
            where u.email = ? and u.password = ? and u.active = 1`, [requestbody.email, hash]);
            if (data.length == 0) {
                res.json({ error: true, errormessage: "INVALID_USERPWD" });
            } else {
                const payload = { username: requestbody.email, userid: data[0]["id"], roles: data };
                const token = generateAccessToken(payload);
                res.json({ error: false, errormessage: "", token: token });
            }
        } catch (err) {
            console.log("Login Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.patch('/updateuser/:id', jsonParser, authenticateToken, async (req, res) => {
        let patchid = req.params.id;
        let requestbody = req.body;
        try {

            //data validation
            let validation = await con.query(`select id from users where id = ?`, [requestbody.fiscalcode, patchid]);
            if (validation[0].length > 0) {
                res.json({ error: true, errormessage: "INVALID_FISCALCODE" });
                return;
            }

            validation = await con.query(`select id from users where fiscalcode = ? and id <> ?`, [patchid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_USER_ID" });
                return;
            }

            //update user
            const data = await con.execute(`update users set lastname = ?, firstname = ?, phone = ?, active = ?, fiscalcode = ? where id = ?`, [requestbody.lastname, requestbody.firstname, requestbody.phone, requestbody.email, requestbody.active, requestbody.fiscalcode, patchid]);
            res.json(data);

        } catch (err) {
            console.log("Updateuser Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.post('/updatepwd', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {

            //data validation
            const validation = await con.query(`select id from users where email = ?`, [requestbody.email]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_USER" });
                return;
            }

            //update user password
            var hash = crypto.createHash('sha256').update(requestbody.password).digest('hex');
            const data = await con.execute(`update users set password = ? where id = ?`, [hash, validation[0][0].id]);
            res.json(data);

        } catch (err) {
            console.log("Updatepwd Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.delete('/deleteuser/:id', authenticateToken, async (req, res) => {
        let deleteid = req.params.id;
        try {

            //data validation
            const validation = await con.query(`select id from users where id = ?`, [deleteid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_USER_ID" });
                return;
            }

            //delete user
            const data = await con.execute(`delete from users where id = ?`, [deleteid]);
            res.json(data);
        } catch (err) {
            console.log("Deleteuser Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })
}

module.exports = initUserRoutes;