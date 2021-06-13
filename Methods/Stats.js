const db = require('../db.js');
let getTotalQuestions = () => new Promise((resolve, reject) => {
    const getQuestionSum = "SELECT *, COUNT(id) as TotalQuestions FROM question";
    db.query(getQuestionSum, function (err, result) {
        if (err) {
            reject(err);
        }
        else {
            resolve(result);
        }
    });
});

let getUnresolved = (userid) => new Promise((resolve, reject) => {
    const getUnresolvedQuery = 'SELECT * FROM `question` WHERE id NOT IN (SELECT questions_id FROM question_passed WHERE user_id = ?) ORDER BY question.level';
    db.query(getUnresolvedQuery, [userid], (err, result) => {
        let Errors = [];
        if (err) reject(err);
        else {
            for (let i = 0; i < result.length; i++) {
                Errors.push({value: result[i].value, qid: result[i].id, type: result[i].type, level: result[i].level})
            }
            resolve(Errors)
        }
    })
})

let getCorrectByType = (userid, level, type) => new Promise ((resolve, reject) => {
    let correctByType = 0;
    const getByTypeQuery = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ? AND type = ?';
    db.query(getByTypeQuery, [userid, level, type], (err, rows) => {
        if (err) {
            reject(err);
        }
        else {
            correctByType = rows[0].CORRECT;
            resolve(correctByType.toString());
        }
    })
});
let getAllUsers = () => new Promise((resolve, reject) => {
    const getUsers =
        "SELECT *, COUNT(question_passed.questions_id) AS correct FROM `user`"+
        'RIGHT JOIN question_passed ON user.user_id = question_passed.user_id GROUP BY question_passed.user_id';
    db.query(getUsers, function (err, result) {
        if (err) {
            reject(err);
        }
        else {
            resolve(result);
        }
    })
});
let getAllInfo = (userid, level) => new Promise((resolve, reject) => {
    let totalByLevel = 0;
    const getLevels = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ?'
    db.query(getLevels, [userid, level], (err, rows) => {
        if (err) {
            reject(err);
        }
        else {
            totalByLevel = rows[0].CORRECT;
            resolve(totalByLevel.toString());
        }
    })
})
let getAllTypes = (userid, level, type) => new Promise((resolve, reject) => {
    let totalByType = 0;
    const getTypes = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ? AND type = ?';
    db.query(getTypes, [userid, level, type], (err, rows) => {
        if (err) {
            reject(err);
        }
        else {
            console.log(rows[0].CORRECT);
            totalByType = rows[0].CORRECT;
            resolve(totalByType.toString());
        }
    })

})
let getNameSurname = (userid) => new Promise((resolve, reject) => {
    const getNicknameQuery = 'SELECT name_surname FROM user WHERE user_id = ?';
    db.query(getNicknameQuery, [userid], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
    })
})

module.exports = {
    getTotalQuestions,
    getAllUsers,
/*    getCorrectByLevel,*/
    getCorrectByType,
    getAllInfo,
    getAllTypes,
    getNameSurname,
    getUnresolved
}