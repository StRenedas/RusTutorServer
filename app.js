const PORT = process.env.PORT || 3001;
const express = require("express");
const bodyParser = require("body-parser")
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require("./db");
const config = require("./config");
const app = express();
app.use(cors());
app.use(bodyParser());
/* ------------------ ROOT ROUTE ---------------------- */
app.get("/", (req, res) => {
    res.send("welcome on root");
});
/* ------------------ RATINGS ROUTE ---------------------- */
app.get("/ratings", (req, res) =>  {
    let sql_query = 'SELECT * FROM users WHERE is_admin = 0';
    db.query(sql_query, (err, result) => {
        let Users = []
        if(err) throw err;
        
        for (let i = 0; i < result.length; i++) {
            Users.push({id: result[i].user_id, username: result[i].username, rating: result[i].rating});
        }
        console.log(Users);
        res.send(Users);
    })
});
/* ------------------ SIGNIN ROUTE ---------------------- */
app.post("/login", (req, res) => {
    let gotUsername = req.body.logusername;
    let gotPassword = req.body.logpassword;
    let sql_query = 'SELECT `user_id`, `username`, `rating`, `is_admin` FROM `users` WHERE username = ?';
    let checkPasswordQuery = 'SELECT password FROM users WHERE username = ?'
    db.query(sql_query, gotUsername,(err, rows, result) => {
        if(rows.length>0) {
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
                    res.send('wrong password');
                }
            })
        }
        else {
            console.log('No such user');
            res.send('Username is not found! Please register first!');
        }
    })
});
/* ------------------ SIGNUP ROUTE ---------------------- */
app.post("/register", (req, res) => {
    let username = req.body.username;
    const salt = bcrypt.genSaltSync(10);
    let password = bcrypt.hashSync(req.body.password, salt);
    let email = req.body.email;
    let user = [username, password, email];
    let sql_getallusers = "SELECT username from Users WHERE username = ?";
    db.query(sql_getallusers, username, (err, rows) => {
        if(rows.length>0) {
            console.log('username found');
            res.send('Please choose another username!')
        }
        else {
            let sql_template = 'INSERT INTO users (username, password, email) VALUES (?,?,?)';
            db.query(sql_template, user, (err, result) => {
            if(err) throw err;
            console.log('registered');
            res.send('Registration successfull!');
            })
        }
    })
});
/* ------------------ GET TASKS ROUTE ---------------------- */
app.post('/tasks', (req, res) => {
    const type = req.body.type;
    const level = req.body.level;
    const user_id = req.body.userid;
    console.log('User ' + user_id + 'tries to get level ' + level + 'and type ' + type + 'tasks')
    const queryParams = [user_id, level, type];
    const getTasksQuery = 'SELECT * FROM `question` WHERE id NOT IN (SELECT questions_id FROM questions_passed WHERE user_id = ?) AND level = ? AND type = ?';
    db.query(getTasksQuery, queryParams, (err, result) => {
        if(err) {
            res.send('Query error, please try again');
        }
        else {
            let Tasks = [];
            if (type === 1) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points});
                }
                res.send(Tasks);
            }
            if (type === 3 || type === 2) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points, options: []});
                }
                res.send(Tasks);
            }
        }
    })
})
/* ------------------ CHECK ANSWERS ROUTE ---------------------- */
app.post('/process',(req, res) => {
    let userId = req.body.userid;
    let answers = req.body.answers;
    console.log(answers);
    let rating = req.body.rating;
    const checkAnswerQuery = 'SELECT question_id, value from answer WHERE question_id = ?';
    const getPointsQuery = 'SELECT points from question WHERE id = ?';
    const updateRatingQuery = 'UPDATE users SET rating = ? WHERE user_id = ?'
    const updatePassedQuery = 'INSERT INTO questions_passed (user_id, questions_id) VALUES (?, ?)'
    for(let i = 0; i < answers.length; i++) {
        db.query(checkAnswerQuery, answers[i].qid, (err, result) => {
            if(err) {
                res.send('no such question')
            }
            else {
                if (result[0].value === answers[i].ans) {
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
    db.query('SELECT rating FROM users WHERE user_id = ?', userId, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(result[0].rating);
            res.send({ updatedRating: result[0].rating});
        }
    })
})
/* ------------------ ADD TASKS ROUTE ---------------------- */
app.post('/task', (req, res) => {
    const level = req.body.level;
    const value = req.body.text;
    const answer = req.body.answer;
    const type = req.body.type;
    const points = req.body.points;
    let addTaskQuery = "INSERT INTO question (type, level, value, points) VALUES (?,?,?,?)";
    db.query(addTaskQuery, [type, level, value, points], (err, result, rows) => {
        if (err) {
            console.log(err);
        } else {
            db.query("SELECT MAX(id) AS lastQuestionId FROM question", (err, result, rows) => {
                const number = result[0].lastQuestionId;
                const answerToInsert = [number, answer]
                db.query("INSERT INTO answer (question_id, value) VALUES (?,?)", answerToInsert, (err, result, rows) => {
                    if (err) console.log(err);
                    else {
                        console.log('inserted');
                        res.send('Question successfully inserted!')
                    }
                    if (req.body.options) {
                        for (let i = 0; i < req.body.options.length; i++) {
                            db.query('INSERT INTO options (question_id, value) VALUES (?,?)', [number, req.body.options[i]], (err, result) => {
                                if (err) console.log(err);
                                else console.log('Option inserted!');
                            })
                        }
                        res.send('Question inserted!')
                    }

                })
            });
        }
    })
})
/* ------------------ GET OPTIONS ROUTE ---------------------- */
app.post("/options",(req, res) => {
    const qid = req.body.id;
    console.log('Requested options for task ' + qid);
    db.query('SELECT value FROM options WHERE question_id = ? UNION ALL SELECT value FROM answer WHERE question_id = ? ORDER BY RAND()', [qid, qid], (err, result) => {
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
app.post("/rating", (req, res) => {
    const userId = req.body.userid;
    db.query('SELECT rating FROM users WHERE user_id = ?', userId, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log(result[0].rating);
            res.send({ updatedRating: result[0].rating});
        }
    })
})
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}.`);
});