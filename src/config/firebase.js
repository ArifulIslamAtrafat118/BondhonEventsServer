const admin = require("firebase-admin");
const serviceAccount = require("../../bondhonevents-firebase-adminsdk-fbsvc-daa07b4084.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


module.exports = admin;