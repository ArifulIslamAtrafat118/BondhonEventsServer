require("dotenv").config();


const app=require("./src/app");

const connectDB=require("./src/config/db");

const {
    setCollection
}=require("./src/controllers/event.controller");



const PORT=process.env.PORT || 4000;



const startServer=async()=>{


    const db=await connectDB();


    setCollection(db);



    app.listen(PORT,()=>{

        console.log(
            `Server running on PORT ${PORT}`
        );

    });

}



startServer();