const router=require("express").Router();

const eventRoutes=require("./event.routes");


router.use(eventRoutes);


module.exports=router;