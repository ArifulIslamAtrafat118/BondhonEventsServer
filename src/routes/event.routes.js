const router=require("express").Router();

const {
    getUpcomingEvents,
    searchEvents,
    createEvent,
    getEventDetails,
    joinedEvents,
    manageEvents,
    updateEvent,
    deleteEvent
}=require("../controllers/event.controller");


const {
    firebaseTokenVerify,
    emailVerify
}=require("../middlewares/auth.middleware");




router.get(
"/upcoming-events",
getUpcomingEvents
);



router.get(
"/search",
searchEvents
);



router.get(
"/event-details/:id",
firebaseTokenVerify,
emailVerify,
getEventDetails
);



router.get(
"/joined-events/:uid",
firebaseTokenVerify,
emailVerify,
joinedEvents
);



router.get(
"/manage-my-events/:uid",
firebaseTokenVerify,
emailVerify,
manageEvents
);



router.post(
"/create-events",
firebaseTokenVerify,
emailVerify,
createEvent
);



router.put(
"/update-events/:id",
firebaseTokenVerify,
emailVerify,
updateEvent
);



router.delete(
"/event/delete/:id",
firebaseTokenVerify,
emailVerify,
deleteEvent
);



module.exports=router;