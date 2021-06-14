const db = require('../db');
let getQuestions = (level, type) => new Promise ((resolve, reject) => {
    const queryParams = [level, type];
    const getTasksQuery = 'SELECT * FROM question WHERE level = ? AND type = ? ORDER BY RAND() LIMIT 9';
    let Tasks = [];
    db.query(getTasksQuery, queryParams, (err, result) => {
        if(err) {
            reject(err);
        }
        else {
            if (type === 1) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points});
                }

                resolve(Tasks);
            }
            if (type === 2) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points, options: []});
                }
                resolve(Tasks);
            }
            if (type === 3) {
                for (let i = 0; i < result.length; i++) {
                    Tasks.push({id: result[i].id, value: result[i].value, points: result[i].points, options: []});
                }
                resolve(Tasks);
            }
        }
    })
});
let getOptions = (qid) => new Promise ((resolve, reject) => {
    console.log('Requested options for task ' + qid);
    db.query('SELECT value FROM variant WHERE question_id = ? UNION ALL SELECT value FROM answer WHERE question_id = ? ORDER BY RAND()', [qid, qid], (err, result) => {
        if (err) reject(err);
        else {
            let opt = []
            for (let i = 0; i < result.length; i++) {
                opt.push(result[i].value);
            }
            console.log(opt);
            resolve(opt);
        }
    })
})
let checkAnswers = (answer) => new Promise ((resolve, reject) => {
    console.log(answer);
    const checkAnswerQuery = 'SELECT question_id, value from answer WHERE question_id = ?';
    db.query(checkAnswerQuery, answer.qid, (err, result) => {
        if(err) reject(err);
        else {
            if (result[0].value.toLowerCase() === answer.ans.toLowerCase()) {
                resolve(answer.qid)
            }
            else resolve(null);
        }
    })
})
let getPoints = (qid) => new Promise ((resolve, reject) => {
    const getPointsQuery = 'SELECT points from question WHERE id = ?';
    db.query(getPointsQuery, qid, (err, result) => {
        if(err) reject(err);
        else {
            resolve(result[0].points);
        }
    })
});
let updateRating = (newpts, userid) => new Promise((resolve, reject) => {
    const updateRatingQuery = 'UPDATE user SET rating = ? WHERE user_id = ?';
    db.query(updateRatingQuery, [newpts, userid], (err, result) => {
        if(err) reject(err);
        else {
            resolve('Rating updated');
        }
    })
})
let updatePassed = (userid, correct) => new Promise((resolve, reject) => {
    let msg = 'success'
    const updatePassedQuery = 'INSERT INTO question_passed (user_id, questions_id) VALUES (?, ?)'
    db.query(updatePassedQuery, [userid, correct], (err, result) => {
        if (err) reject(err);
        else {
            resolve(msg);
        }
    });
})
module.exports = {
    getQuestions,
    getOptions,
    checkAnswers,
    getPoints,
    updateRating,
    updatePassed,
}
