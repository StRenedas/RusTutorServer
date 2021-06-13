const PORT = process.env.PORT || 3001;
const express = require("express");
const bodyParser = require("body-parser")
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require("./db");
const config = require("./config");
const stats = require('./Methods/Stats')
const app = express();
app.use(cors());
app.use(bodyParser());
/* ------------------ ROOT ROUTE ---------------------- */
app.get("/", (req, res) => {
    res.send("welcome on root");
});
/* ------------------ RATINGS ROUTE ---------------------- */
app.post("/ratings", checkToken, (req, res) =>  {
    let sql_query = 'SELECT * FROM user WHERE is_admin = 0 ORDER BY rating DESC';
    db.query(sql_query, (err, result) => {
        let Users = []
        let resolved = []
        if(err) throw err;
        for (let i = 0; i < result.length; i++) {
            Users.push({id: result[i].user_id, username: result[i].name_surname, email: result[i].email, rating: result[i].rating, resolved: resolved });
        }
        console.log(Users);
        res.send(Users);
    })
});
app.post("/stats", (req, res) => {
    let id = req.body.userid;
    let username = ''
    let getUnresolved = 'SELECT * FROM `question` WHERE id NOT IN (SELECT questions_id FROM question_passed WHERE user_id = ?) ORDER BY question.level';
    stats.getNameSurname(id)
        .then(name => {
            username = name;
        })
    db.query(getUnresolved, [id], (err, result) => {
        let Errors = [];
        if (err) throw err;
        else {
            for (let i = 0; i < result.length; i++) {
                Errors.push({value: result[i].value, qid: result[i].id, type: result[i].type, level: result[i].level})
            }
        }
        res.send(Errors);
    })
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
                    const token = jwt.sign({userid: result[0].gotUserid, username: gotUsername}, config.JWTSECRET, {expiresIn: 60*60})
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
/* ------------------ GET TASKS ROUTE ---------------------- */
app.post('/tasks', checkToken, (req, res) => {
    const type = req.body.type;
    const level = req.body.level;
    const user_id = req.body.userid;
    console.log('User ' + user_id + 'tries to get level ' + level + 'and type ' + type + 'tasks')
    const queryParams = [level, type];
    const getTasksQuery = 'SELECT * FROM question WHERE level = ? AND type = ?';
    db.query(getTasksQuery, queryParams, (err, result) => {
        if(err) {
            res.send('Query error, please try again');
        }
        else {
            let Tasks = [];
            if (type === 1) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points});
                    console.log(Tasks);
                }
                res.send(Tasks);
            }
            if (type === 2) {
                let opts = [];
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points, options: opts});
                }
                res.send(Tasks);
            }
            if (type === 3) {
                let opts = [];
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points, options: opts});
                }
                res.send(Tasks);
            }
        }
    })
})
/* ------------------ CHECK ANSWERS ROUTE ---------------------- */
app.post('/process', checkToken, (req, res) => {
    let userId = req.body.userid;
    let answers = req.body.answers;
    let rating = req.body.rating;
    if (answers.length === 0) {
        res.send('No answers provided!')
    }
    const checkAnswerQuery = 'SELECT question_id, value from answer WHERE question_id = ?';
    const getPointsQuery = 'SELECT points from question WHERE id = ?';
    const updateRatingQuery = 'UPDATE user SET rating = ? WHERE user_id = ?'
    const updatePassedQuery = 'INSERT INTO question_passed (user_id, questions_id) VALUES (?, ?)'
    for(let i = 0; i < answers.length; i++) {
        db.query(checkAnswerQuery, answers[i].qid, (err, result) => {
            if(err) {
                res.send('no such question')
            }
            else {
                if (result[0].value.toLowerCase() === answers[i].ans.toLowerCase()) {
                    console.log('Question ' + answers[i].qid + ' is answered correctly!')
                    db.query(getPointsQuery, result[0].question_id, (err, result) => {
                        console.log(rating);
                        rating+=result[0].points;
                        const userToUpdate = [rating, userId];
                        db.query(updateRatingQuery, userToUpdate, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                db.query(updatePassedQuery, [userId, answers[i].qid])
                            }
                        })
                    })
                }
                else if (result[0].value !== answers[i].ans){
                    console.log('Question ' + answers[i].qid + ' is answered wrong!');
                }

            }
        })
    }
    db.query('SELECT rating FROM user WHERE user_id = ?', userId, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(result[0].rating);
            res.send({ updatedRating: result[0].rating});
        }
    })
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
/* ------------------ GET OPTIONS ROUTE ---------------------- */
app.post("/options", (req, res) => {
    const qid = req.body.id;
    console.log('Requested options for task ' + qid);
    db.query('SELECT value FROM variant WHERE question_id = ? UNION ALL SELECT value FROM answer WHERE question_id = ? ORDER BY RAND()', [qid, qid], (err, result) => {
       if (err) console.log(err);
       else {
           let opt = []
           for (let i = 0; i < result.length; i++) {
               opt.push(result[i].value);
           }
           console.log(opt);
           res.send(opt);
       }
    })
})
app.post("/rating", checkToken, (req, res) => {
    const userId = req.body.userid;
    db.query('SELECT rating FROM user WHERE user_id = ?', userId, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(result[0].rating);
            res.send({ updatedRating: result[0].rating});
        }
    })
})

/*app.post('/test2', async (req, res) => {
    let id = req.body.userid;
    let corrsum = [];
    for (let i = 1; i < 4; i++) {
        await stats.getCorrectByLevel(id, i).then((correctByLevel) => {
            corrsum.push(correctByLevel);
        }).catch((err) => {
            console.log(err);
        })
    }
    res.send(corrsum);
})
app.post('/test3', async (req, res) => {
    let id = req.body.userid;
    let level = req.body.level;
    let corrT = [];
    for (let i = 1; i < 4; i++) {
        await stats.getCorrectByType(id, level, i).then((correctByType) => {
            corrT.push(correctByType);
        }).catch((err) => {
            console.log(err);
        })
    }
    res.send(corrT);
})*/
app.post('/statistics', async (req, res) => {
    let UserTasks = [];
    const id = req.body.userid;
    for (let i = 1; i < 4; i++) {
        await stats.getAllInfo(id, i)
            .then(totalByLevel => {
            UserTasks.push({level: i, total: totalByLevel});
            console.log(UserTasks);
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
    console.log(UserTasks);
    res.send(UserTasks)
})
app.post('/name', (req, res) => {
    const id = req.body.userid;
    stats.getNameSurname(id).then(name => {
        res.send(name);
    })
})
function checkToken (req, res, next) {
    const authHeader = req.body.token;
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, config.JWTSECRET, (err) => {
        if (err) return res.sendStatus(403);
        else next();
     })
};
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}.`);
});