const express = require('express')
var cors = require('cors')
const app = express()
const port = 3000
const defineUserRoutes = require('./usercontroller');
const defineCourseRoutes = require('./coursecontroller');
const defineModuleRoutes = require('./modulecontroller');
const defineLessonRoutes = require('./lessoncontroller');

//generate jwt secret key (one time - copy to env variables)
//let secreykey = require('crypto').randomBytes(64).toString('hex');
//console.log(secreykey);

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}

// Enable CORS for all routes
app.use(cors(corsOptions));

defineUserRoutes(app);
defineCourseRoutes(app);
defineModuleRoutes(app);
defineLessonRoutes(app);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

