const PORT = process.env.PORT || 3001;
const express = require("express");
const bodyParser = require("body-parser")
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require("./db");
const config = require("./config");
const stats = require('./Methods/Stats');
const questions = require('./Methods/Questions');
const app = express();
app.use(cors());
app.use(bodyParser());
/* ------------------ ROOT ROUTE ---------------------- */
app.get("/", (req, res) => {
    res.send("welcome on root");
});
/* ------------------ RATINGS ROUTE ---------------------- */
app.get("/users", checkToken, (req, res) =>  {
    let sql_query = 'SELECT * FROM user WHERE is_admin = 0 ORDER BY rating DESC';
    db.query(sql_query, (err, result) => {
        let Users = []
        if(err) throw err;
        for (let i = 0; i < result.length; i++) {
            Users.push({id: result[i].user_id, username: result[i].name_surname, email: result[i].email, rating: result[i].rating, resolved: [] });
        }
        console.log(Users);
        res.send(Users);
    })
});
/* ------------------ STATS ROUTE ---------------------- */
app.get("/errors/:userid", checkToken , async (req, res) => {
    let id = req.params.userid;
    let username = '';
    let Errors = [];
    await stats.getNameSurname(id)
        .then(name => {
            username = name.name_surname;
        }).catch(err => {
            console.log(err);
    })
    await stats.getUnresolved(id)
        .then(errors => {
            Errors = errors;
        }).catch(err => {
            console.log(err);
    })
    res.send([Errors, username]);
});
/* ------------------ SIGNIN ROUTE ---------------------- */
app.post("/login", (req, res) => {
    let gotUsername = req.body.logusername;
    let gotPassword = req.body.logpassword;
    let sql_query = 'SELECT `user_id`, `username`, `rating`, `is_admin` FROM `user` WHERE username = ?';
    let checkPasswordQuery = 'SELECT password FROM user WHERE username = ?'
    db.query(sql_query, gotUsername, (err, rows) => {
        if(rows.length>0 && rows[0].username === gotUsername) {
            let gotUserid = rows[0].user_id;
            let isAdmin = rows[0].is_admin;
            let gotUserRating = rows[0].rating;
            db.query(checkPasswordQuery, gotUsername, (err, result) => {
                if(err) {
                    res.send(err);
                }
                else if(bcrypt.compareSync(gotPassword, result[0].password)) {
                    const token = jwt.sign({userid: result[0].gotUserid, username: gotUsername, isAdmin: isAdmin}, config.JWTSECRET, {expiresIn: 60*60})
                    console.log('User ' + gotUsername + ' authenticated');
                    res.send({userid: gotUserid, username: gotUsername, rating: gotUserRating,  isadmin: isAdmin, token: `Bearer ${token}`});
                }
                else {
                    console.log('passwords do not match');
                    res.send({auth_error: 'Wrong password!'});
                }
            })
        }
        else {
            console.log('No such user');
            res.send({auth_error: 'User is not found!'});
        }
    })
});
/* ------------------ SIGNUP ROUTE ---------------------- */
app.post("/register", (req, res) => {
    let username = req.body.username;
    let name = req.body.name;
    const salt = bcrypt.genSaltSync(10);
    let password = bcrypt.hashSync(req.body.password, salt);
    let user = [username, password, name];
    let sql_getallusers = "SELECT username from user WHERE username = ?";
    db.query(sql_getallusers, username, (err, rows) => {
        if(rows.length>0 && rows[0].username === username) {
            console.log('username found');
            res.send({auth_error: 'Please choose another username!'})
        }
        else {
            let sql_template = 'INSERT INTO user (username, password, name_surname) VALUES (?,?,?)';
            db.query(sql_template, user, (err) => {
            if(err) throw err;
            console.log('registered');
            res.send('Registration successful!');
            })
        }
    })
});
/* ------------------ CHECK ANSWERS ROUTE ---------------------- */
app.post('/check', checkToken , async (req, res) => {
    let userId = req.body.userid;
    let answers = req.body.answers;
    let rating = 0;
    await stats.getRating(userId)
        .then(currRating => {
        rating = parseInt(currRating, 10);
        console.log(rating);
    }).catch(err => console.log(err));
    let corrects = [];
    for (let i = 0; i < answers.length; i++) {
        await questions.checkAnswers(answers[i])
            .then(cid => {
                corrects.push(cid)
            }).catch(err => console.log(err));
    }
    corrects = corrects.filter(item => item!==null);
    for (let i = 0; i < corrects.length; i++) {
        await questions.getPoints(corrects[i])
            .then(pts => {
                rating += pts
            })
            .catch(err => console.log(err));
    }
    await questions.updateRating(rating, userId);
    for (let i = 0; i < corrects.length; i++) {
        await questions.updatePassed(userId, corrects[i])
            .then(value => {
                console.log(value);
            })
            .catch(err => console.log(err));
    }
    res.send(corrects);
})
/* ------------------ ADD TASKS ROUTE ---------------------- */
app.post('/task', checkToken, (req, res) => {
    const level = req.body.level;
    const value = req.body.text;
    const answer = req.body.answer.toLowerCase();
    const type = req.body.type;
    const points = req.body.points;
    let addTaskQuery = "INSERT INTO question (type, level, value, points) VALUES (?,?,?,?)";
    db.query(addTaskQuery, [type, level, value, points], (err) => {
        if (err) {
            console.log(err);
        } else {
            db.query("SELECT MAX(id) AS lastQuestionId FROM question", (err, result) => {
                const number = result[0].lastQuestionId;
                const answerToInsert = [number, answer]
                db.query("INSERT INTO answer (question_id, value) VALUES (?,?)", answerToInsert, (err) => {
                    if (err) console.log(err);
                    if (req.body.options) {
                        for (let i = 0; i < req.body.options.length; i++) {
                            db.query('INSERT INTO variant (question_id, value) VALUES (?,?)', [number, req.body.options[i]], (err) => {
                                if (err) console.log(err);
                                else console.log('Option inserted!');
                            })
                        }
                        res.send('Question inserted!')
                    }
                    else {
                        console.log('inserted');
                        res.send('Question inserted!')
                    }
                })
            });
        }
    })
})
/* ------------------ GET RATING ROUTE ---------------------- */
app.get("/rating/:userid", checkToken, (req, res) => {
    const userId = req.params.userid;
    db.query('SELECT rating FROM user WHERE user_id = ?', userId, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(result[0].rating);
            res.send({ updatedRating: result[0].rating});
        }
    })
})
/* ------------------ GET STATISTICS ROUTE ---------------------- */
app.get('/statistics/:userid', checkToken,  async (req, res) => {
    let UserTasks = [];
    const id = req.params.userid;
    for (let i = 1; i < 4; i++) {
        await stats.getAllInfo(id, i)
            .then(totalByLevel => {
            UserTasks.push({level: i, total: totalByLevel});
        }).catch((err) => {
            console.log(err);
        })
    }
    for (let j = 0; j < UserTasks.length; j++) {
        for (let i = 1; i < 4; i++) {
            await stats.getAllTypes(id, UserTasks[j].level, i)
                .then(totalByType => {
                    if (i === 1) {
                        UserTasks[j].translate = totalByType;
                    }
                    if (i === 2) {
                        UserTasks[j].pics = totalByType;
                    }
                    if (i === 3) {
                        UserTasks[j].choice = totalByType;
                    }
                })
                .catch((err) => {
                    console.log(err);
                })
        }
    }
    res.send(UserTasks)
})
/* ------------------ GET TOTAL ROUTE ---------------------- */
app.get('/total', checkToken ,  async (req, res) => {
    let TotalTasks = [];
    for (let i = 1; i < 4; i++) {
        await stats.getTotalQuestions(i)
            .then(totalByLevel => {
                TotalTasks.push({level: i, total: totalByLevel});
            }).catch((err) => {
                console.log(err);
            })
    }
    for (let j = 0; j < TotalTasks.length; j++) {
        for (let i = 1; i < 4; i++) {
            await stats.getTotalTypes(TotalTasks[j].level, i)
                .then(totalByType => {
                    if (i === 1) {
                        TotalTasks[j].translate = totalByType;
                    }
                    if (i === 2) {
                        TotalTasks[j].pics = totalByType;
                    }
                    if (i === 3) {
                        TotalTasks[j].choice = totalByType;
                    }
                })
                .catch((err) => {
                    console.log(err);
                })
        }
    }
    res.send(TotalTasks);
})
/* ------------------ FORM QUESTIONS ROUTE ---------------------- */
app.post('/questions', checkToken, async (req, res) => {
    const type = req.body.type;
    const level = req.body.level;
    let newTasks = [];
    await questions.getQuestions(level, type)
        .then(Tasks => {
            newTasks = Tasks;
        }).catch(err => {console.log(err)});
    for (let i = 0; i < newTasks.length; i++) {
        await questions.getOptions(newTasks[i].id)
            .then(opts => {
                newTasks[i].options = opts;
            }).catch(err => console.log(err));
    }
    res.send(newTasks);
})
/* ------------------ FORM RESULTS ROUTE ---------------------- */
app.post('/results', async (req, res) => {
    const corrs = req.body.corrs;
    let corrects = []
    for (let i = 0; i < corrs.length; i++) {
        await questions.getCorrects(corrs[i])
            .then(obj => {
                corrects.push(obj)
            })
            .catch(err => console.log(err))
    }
    res.send(corrects);
})
function checkToken (req, res, next) {
    const authHeader = req.headers['authorization'];
    const role = req.headers['user-role'].toString();
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, config.JWTSECRET, (err) => {
        if (err) return res.sendStatus(403);
        else {
            const decoded = jwt.decode(token);
            const tokenRole = decoded.isAdmin.toString();
            if (role !== tokenRole) {
                console.log(role, tokenRole);
                return res.sendStatus(403);
            }
            else {
                next();
            }
            /*next();*/
        }
     })
}
/*function checkAdmin (req, res, next) {
    const role = req.body.role;
    const token = res.locals.token;
    const decoded = jwt.decode(token);
    const tokenRole = decoded.isAdmin;
    if (role !== tokenRole) {
        return res.sendStatus(403);
    }
    else {
        next();
    }
}
function checkStudent(req, res, next) {
    const role = req.body.role;
    const token = res.locals.token;
    const decoded = jwt.decode(token);
    const tokenRole = decoded.isAdmin;
    if (role !== tokenRole) {
        return res.sendStatus(403);
    }
    else {
        next();
    }
}*/
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}.`);
});