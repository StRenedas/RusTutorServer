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

let getCorrectByLevel = (userid, level) => new Promise ((resolve, reject) => {
    let correctByLevel = 0;
    const getByLevelQuery = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ?';
    db.query(getByLevelQuery, [userid, level], (err, qsum) => {
        if (err) {
            reject(err);
        }
        else {
            correctByLevel = qsum[0];
            resolve(correctByLevel);
        }
    });
});
/*let getAllCorrects = (userid) => new Promise ((resolve, reject) => {
    let levels = [1,2,3];
    let correctByLevel = [];
    console.log(userid);
    const getByLevelQuery = 'SELECT COUNT(question.id) AS CORRECT FROM `question` WHERE id IN (SELECT questions_id FROM question_passed WHERE user_id = ?) AND level = ?';
    for (let i = 0; i < levels.length; i++) {
         db.query(getByLevelQuery, [userid, levels[i]], (err, qsum) => {
            if (err) {
                reject(err);
            }
            else {
                correctByLevel.push(qsum[0]);
                console.log(correctByLevel);
            }
        });
    }
    console.log(correctByLevel);
    resolve(correctByLevel);
});*/
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

/*let getResolvedQuestionsById = (user) => new Promise((resolve, reject) => {
    const correctAnswers = 'SELECT *, COUNT(question_passed.questions_id) AS correct FROM `user`' +
        'RIGHT JOIN question_passed ON user.user_id = question_passed.user_id GROUP BY question_passed.user_id';
    db.query(correctAnswers, user.user_id, (err, results) => {
        if (err) {
            reject(err);
        }
        else {
            resolve(user.correct = results[0].correct, user.user_id = undefined);
        }
    })
})*/

module.exports = {
    getTotalQuestions,
    getAllUsers,
    getCorrectByLevel,
/*    getAllCorrects,*/
    /*getResolvedQuestionsById*/
}