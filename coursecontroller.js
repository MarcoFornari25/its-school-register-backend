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

function initCourseRoutes(app) {

    app.post('/createcourse', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {

            //course validation
            const validation = await con.query(`select id from courses where name = ? and year = ?`, [requestbody.name, requestbody.year]);
            if (validation[0].length < 1) {
                //course creation
                const [data] = await con.execute(`insert into courses (name,year,period) values (?,?,?)`, [requestbody.name, requestbody.year, requestbody.period]);
                res.json(data);
            } else {
                res.json({ error: true, errormessage: "COURSE_EXISTS" });
            }

        } catch (err) {
            console.log("Createcourse Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.patch('/updatecourse/:id', jsonParser, authenticateToken, async (req, res) => {
        let patchid = req.params.id;
        let requestbody = req.body;
        try {

            //data validation
            let validation = await con.query(`select id from courses where id = ?`, [patchid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_COURSE_ID" });
                return;
            }

            validation = await con.query(`select id from courses where name = ? and year = ? and id <> ?`, [requestbody.name, requestbody.year, patchid]);
            if (validation[0].length > 0) {
                res.json({ error: true, errormessage: "COURSE_EXISTS" });
                return;
            }

            //update course
            const data = await con.execute(`update courses set name = ?, year = ?, period = ? where id = ?`, [requestbody.name, requestbody.year, requestbody.period, patchid]);
            res.json(data);

        } catch (err) {
            console.log("Updatecourse Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.delete('/deletecourse/:id', authenticateToken, async (req, res) => {
        let deleteid = req.params.id;
        try {

            //data validation
            const validation = await con.query(`select id from courses where id = ?`, [deleteid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_COURSE_ID" });
                return;
            }

            //delete course
            const data = await con.execute(`delete from courses where id = ?`, [deleteid]);
            res.json(data);
        } catch (err) {
            console.log("Deletecourse Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })


    app.get('/getallcourses', authenticateToken, async (req, res) => {
        pagenumber = (req.query.pagenumber - 1) * req.query.pagesize;
        pagesize = (req.query.pagenumber * req.query.pagesize) - 1;
        try {
            const [data] = await con.execute(`select * from courses LIMIT ${pagenumber},${pagesize}`);

            res.json(data);
        } catch (err) {
            console.log("Getallcourses Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.get('/getusercourses', authenticateToken, async (req, res) => {
        try {
            const [data] = await con.execute(`select distinct c.* from users_roles_courses urc 
          inner join courses c on urc.id_course = c.id
          where urc.id_user = ?`, [req.user.userid]);
            res.json(data);
        } catch (err) {
            console.log("Getuserscourses Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.post('/linkcourse', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {
            //data validation
            let validation = await con.query(`select * from users_roles_courses where id_user = ? and id_role = ? and id_course = ?`, [requestbody.id_user, requestbody.id_role, requestbody.id_course]);
            if (validation[0].length > 0) {
                res.json({ error: true, errormessage: "LINK_EXISTS" });
                return;
            }
            validation = await con.query(`select id from courses where id = ?`, [requestbody.id_course]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "COURSE_NOT_EXISTS" });
                return;
            }
            validation = await con.query(`select id from users where id = ?`, [requestbody.id_user]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "USER_NOT_EXISTS" });
                return;
            }
            validation = await con.query(`select id from roles where id = ?`, [requestbody.id_role]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "ROLE_NOT_EXISTS" });
                return;
            }

            //add role/course
            const data = await con.execute(`INSERT INTO users_roles_courses (id_user, id_role, id_course) VALUES (?,?,?)`, [requestbody.id_user, requestbody.id_role, requestbody.id_course]);
            res.json(data);
        } catch (err) {
            console.log("linkcourse Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.post('/unlinkcourse', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {
            //data validation
            let validation = await con.query(`select * from users_roles_courses where id_user = ? and id_role = ? and id_course = ?`, [requestbody.id_user, requestbody.id_role, requestbody.id_course]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "LINK_NOT_EXISTS" });
                return;
            }

            //remove role/course
            const data = await con.execute(`DELETE FROM users_roles_courses WHERE id_user = ? AND id_role = ? AND id_course = ?`, [requestbody.id_user, requestbody.id_role, requestbody.id_course]);
            res.json(data);
        } catch (err) {
            console.log("unlinkcourse Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

}

module.exports = initCourseRoutes;