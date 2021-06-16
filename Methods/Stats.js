const db = require('../db.js');
let getTotalQuestions = (level) => new Promise((resolve, reject) => {
    let totalByLevel = 0;
    const getQuestionSum = "SELECT COUNT(id) AS TOTAL FROM question WHERE level = ?";
    db.execute(getQuestionSum, [level], (err, rows) => {
        if (err) {
            reject(err);
        }
        else {
            totalByLevel = rows[0].TOTAL;
            resolve(totalByLevel.toString());
        }
    });
});
let getTotalTypes = (level, type) => new Promise((resolve, reject) => {
    let totalByType = 0;
    const getTypes = 'SELECT COUNT(question.id) AS TOTAL FROM `question` WHERE level = ? AND type = ?';
    db.execute(getTypes, [level, type], (err, rows) => {
        if (err) {
            reject(err);
        }
        else {
            totalByType = rows[0].TOTAL;
            resolve(totalByType.toString());
        }
    })

})
let getUnresolved = (userid) => new Promise((resolve, reject) => {
    const getUnresolvedQuery = 'SELECT * FROM `question` WHERE id NOT IN (SELECT questions_id FROM question_passed WHERE user_id = ?) ORDER BY question.level';
    db.execute(getUnresolvedQuery, [userid], (err, result) => {
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
let getAllInfo = (userid, level) => new Promise((resolve, reject) => {
    let totalByLevel = 0;
    const getLevels = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ?'
    db.execute(getLevels, [userid, level], (err, rows) => {
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
    db.execute(getTypes, [userid, level, type], (err, rows) => {
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
    db.execute(getNicknameQuery, [userid], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
    })
})
let getRating = (userid) => new Promise ((resolve, reject) => {
    let currRating = 0;
    const getRatingByIdQuery = 'SELECT rating FROM user WHERE user_id = ?';
    db.execute(getRatingByIdQuery, [userid], (err, result) => {
        if(err) reject(err);
        else {
            currRating = result[0].rating.toString();
            resolve(currRating);
        }
    })
})
module.exports = {
    getTotalQuestions,
    getTotalTypes,
    getAllInfo,
    getAllTypes,
    getNameSurname,
    getUnresolved,
    getRating
}