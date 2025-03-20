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

function initLessonRoutes(app) {

    app.post('/createlesson', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        try {

            //data validation
            const validation = await con.query(`select id from modules where name = ?`, [requestbody.name]);
            if (validation[0].length < 1) {
                //lesson creation
                const [data] = await con.execute(`insert into modules (name,total_hours) values (?,?)`, [requestbody.name, requestbody.total_hours]);
                res.json(data);
            } else {
                res.json({ error: true, errormessage: "MODULE_EXISTS" });
            }

        } catch (err) {
            console.log("Createlesson Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.patch('/updatelesson/:id', jsonParser, authenticateToken, async (req, res) => {
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

            //update lesson
            const data = await con.execute(`update modules set name = ?, total_hours = ? where id = ?`, [requestbody.name, requestbody.total_hours, patchid]);
            res.json(data);

        } catch (err) {
            console.log("Updatelesson Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }

    })

    app.delete('/deletelesson/:id', authenticateToken, async (req, res) => {
        let deleteid = req.params.id;
        try {

            //data validation
            const validation = await con.query(`select id from modules where id = ?`, [deleteid]);
            if (validation[0].length < 1) {
                res.json({ error: true, errormessage: "INVALID_MODULE_ID" });
                return;
            }

            //delete lesson
            const data = await con.execute(`delete from modules where id = ?`, [deleteid]);
            res.json(data);
        } catch (err) {
            console.log("Deletelesson Error: " + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.get('/getalllessons', authenticateToken, async (req, res) => {
        pagenumber = (req.query.pagenumber - 1) * req.query.pagesize;
        pagesize = (req.query.pagenumber * req.query.pagesize) - 1;
        try {
            const [data] = await con.execute(`select * from modules LIMIT ${pagenumber},${pagesize}`);

            res.json(data);
        } catch (err) {
            console.log("Getalllessons Error:" + err);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    })

    app.get('/getuserlessons', authenticateToken, async (req, res) => {
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

    //generate Lessons
    app.post('/generatelessons', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        let startdate = requestbody.startdate;
        let enddate = requestbody.enddate;
        let day = requestbody.day;
        let starthour = requestbody.starthour;
        let startminute = requestbody.startminute;
        let endhour = requestbody.endhour;
        let endminute = requestbody.endminute;
        let id_module = requestbody.id_module;

        try {
            //validation module
            const moduleValidation = await con.query(`SELECT id FROM modules WHERE id = ?`, [id_module]);
            if (moduleValidation[0].length < 1) {
                return res.json({ error: true, errormessage: "INVALID_MODULE_ID" });
            }
            //validation date
            let startDateObj = new Date(startdate);
            let endDateObj = new Date(enddate);


            if (startDateObj > endDateObj) {
                return res.json({ error: true, errormessage: "START_DATE_AFTER_END_DATE" });
            }
            // Validazione dell'orario di inizio e fine
            if (starthour > endhour || (starthour === endhour && startminute >= endminute)) {
                return res.json({ error: true, errormessage: "INVALID_TIME_RANGE" });
            }


            let currentDate = new Date(startdate);
            let endDate = new Date(enddate);


            generatedLessons = [];


            while (currentDate <= endDate) {
                if (currentDate.getDay() === day) {
                    let year = currentDate.getFullYear();
                    let month = currentDate.getMonth();
                    let date = currentDate.getDate();


                    //lezioni
                    let lessonsStartDate = new Date(year, month, date, requestbody.starthour, requestbody.startminute);
                    let lessonsEndDate = new Date(year, month, date, requestbody.endhour, requestbody.endminute);


                    const moduleValidation = await con.query(`select id from lessons where id_module = ? and ? between startdate and enddate
            or ? between startdate and enddate`, [id_module, lessonsStartDate, lessonsEndDate]);
                    if (moduleValidation[0].length < 1) {
                        let [data] = await con.execute(`INSERT INTO lessons (id_module, startdate, enddate, argument, note) VALUES (?, ?, ?, ?, ?)`,
                            [id_module, lessonsStartDate, lessonsEndDate, null, null]);


                        generatedLessons.push({ id: data.insertId, id_module, lessonsStartDate, lessonsEndDate });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1); 
            }
            res.json(generatedLessons);
        } catch (error) {
            console.error(error);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    });





    app.get('/getcalendar', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //recupera il calendario
        //filtrato per anno/mese
    })

    app.post('/generateevents', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //genera degli eventi ripetitivi, da data a data e per quale giorno
    })

    app.post('/signpresence', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        let date = requestbody.date;
        let userId = requestbody.date;
        let moduleId = requestbody.date;
        try {
            // check if data it's inside the body
            if (!date) {
                return res.json({ error: true, errormessage: "DATE_REQUIRED" });
            }
    
            // data validation
            let presenceDate = new Date(date);
    
    
            // Controllo se la data è nel futuro (puoi personalizzare questa logica come preferisci)
            let currentDate = new Date();
            if (presenceDate > currentDate) {
                return res.json({ error: true, errormessage: "FUTURE_DATE_NOT_ALLOWED" });
            }
    
            // validation id module and id user
            const userValidation = await con.query(`SELECT id FROM users WHERE id = ?`, [userId]);
            if (userValidation[0].length < 1) {
                return res.json({ error: true, errormessage: "INVALID_USER_ID" });
            }
    
            const moduleValidation = await con.query(`SELECT id FROM modules WHERE id = ?`, [moduleId]);
            if (moduleValidation[0].length < 1) {
                return res.json({ error: true, errormessage: "INVALID_MODULE_ID" });
            }
    
            let [data] = await con.execute(`
                INSERT INTO presence (user_id, module_id, presence_date) 
                VALUES (?, ?, ?)`,
                [userId, moduleId, presenceDate]
            );
    
            // Risposta di successo
            res.json({ success: true, message: "Presence signed successfully", presenceId: data.insertId });
        } catch (error) {
            console.error(error);
            res.json({ error: true, errormessage: "GENERIC_ERROR" });
        }
    });
    


    app.get('/getlessonpresences', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //recupera l'elenco delle presenze
        //dato l'id lezione
    })

    app.get('/getuserpresences', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //recupera l'elenco delle presenze
        //dell'utente corrente, da data a data
    })

    app.get('/getmodulepresences', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //recupera l'elenco delle presenze
        //per il modulo indicato; opzionale filtro per utente
    })

    app.get('/calculateuserpresences', jsonParser, authenticateToken, async (req, res) => {
        let requestbody = req.body;
        //recupera l'elenco delle presenze
        //utente e calcola la percentuale presenze rispetto al totale ore di ogni modulo
    })

}

module.exports = initLessonRoutes;