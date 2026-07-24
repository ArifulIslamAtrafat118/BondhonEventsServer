const admin = require("../config/firebase");


const firebaseTokenVerify = async(req,res,next)=>{

    const authHeader = req.headers?.authorization;


    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).send({
            message:"Unauthorized Access"
        });
    }


    const token = authHeader.split(" ")[1];


    try{

        const decoded = await admin.auth().verifyIdToken(token);

        req.decoded = decoded;

        next();

    }
    catch(error){

        console.log("Token verification failed:",error);

        res.status(401).send({
            message:"Unauthorized Access"
        });
    }

}



const emailVerify = (req,res,next)=>{


    if(req.query.email !== req.decoded.email){

        return res.status(403).send({
            message:"Forbidden Access!"
        });
    }


    next();

}



module.exports={
    firebaseTokenVerify,
    emailVerify
}