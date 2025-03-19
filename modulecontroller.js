const con = require('./connector');
const jwt = require('jsonwebtoken');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

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

function initModuleRoutes(app) {

    app.post('/createmodule', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {

            //data validation
            const validation = await con.query(`select id from modules where name = ?`, [requestbody.name]);
            if (validation[0].length < 1) {
                //module creation
                const [data] = await con.execute(`insert into modules (name,total_hours) values (?,?)`, [requestbody.name, requestbody.total_hours]);
                res.json(data);
            } else {
                res.json({ error: true, errormessage: "MODULE_EXISTS" });
            }

        } catch (err) {
            console.log("Createmodule Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.patch('/updatemodule/:id', jsonParser, authenticateToken, async (req, res) => {
        let patchid = req.params.id;
        let requestbody = req.body;
        try {

            //data validation
            let validation = await con.query(`select id from modules where id = ?`, [patchid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_MODULE_ID" });
                return;
            }

            validation = await con.query(`select id from modules where name = ? and id <> ?`, [requestbody.name, patchid]);
            if (validation[0].length > 0) {
                res.json({ error: true, errormessage: "COURSE_EXISTS" });
                return;
            }

            //update module
            const data = await con.execute(`update modules set name = ?, total_hours = ? where id = ?`, [requestbody.name, requestbody.total_hours, patchid]);
            res.json(data);

        } catch (err) {
            console.log("Updatemodule Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.delete('/deletemodule/:id', authenticateToken, async (req, res) => {
        let deleteid = req.params.id;
        try {

            //data validation
            const validation = await con.query(`select id from modules where id = ?`, [deleteid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_MODULE_ID" });
                return;
            }

            //delete module
            const data = await con.execute(`delete from modules where id = ?`, [deleteid]);
            res.json(data);
        } catch (err) {
            console.log("Deletemodule Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })


    app.get('/getallmodules', authenticateToken, async (req, res) => {
        pagenumber = (req.query.pagenumber - 1) * req.query.pagesize;
        pagesize = (req.query.pagenumber * req.query.pagesize) - 1;
        try {
            const [data] = await con.execute(`select * from modules LIMIT ${pagenumber},${pagesize}`);

            res.json(data);
        } catch (err) {
            console.log("Getallmodules Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.get('/getusermodules', authenticateToken, async (req, res) => {
        try {
            const [data] = await con.execute(`select distinct m.* from modules m 
            inner join users_modules um on um.id_module = m.id
            where um.id_user = ?`, [req.user.userid]);
            res.json(data);
        } catch (err) {
            console.log("Getusersmodules Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.post('/linkmodule', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {
            //data validation
            let validation = await con.query(`select * from users_modules where id_user = ? and id_module = ?`, [requestbody.id_user, requestbody.id_module]);
            if (validation[0].length > 0) {
                res.json({ error: true, errormessage: "LINK_EXISTS" });
                return;
            }
            validation = await con.query(`select id from modules where id = ?`, [requestbody.id_module]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "MODULE_NOT_EXISTS" });
                return;
            }
            validation = await con.query(`select id from users where id = ?`, [requestbody.id_user]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "USER_NOT_EXISTS" });
                return;
            }

            //add role/module
            const data = await con.execute(`INSERT INTO users_modules (id_module, id_user) VALUES (?,?)`, [requestbody.id_module, requestbody.id_user]);
            res.json(data);
        } catch (err) {
            console.log("linkmodule Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.post('/unlinkmodule', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {
            //data validation
            let validation = await con.query(`select * from users_modules where id_user = ? and id_module = ?`, [requestbody.id_user, requestbody.id_module]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "LINK_NOT_EXISTS" });
                return;
            }

            //remove user/module
            const data = await con.execute(`DELETE FROM users_modules WHERE id_user = ? AND id_module = ?`, [requestbody.id_user, requestbody.id_module]);
            res.json(data);
        } catch (err) {
            console.log("unlinkmodule Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })
}

module.exports = initModuleRoutes;