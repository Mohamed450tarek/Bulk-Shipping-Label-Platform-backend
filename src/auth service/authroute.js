 const express = require("express");
const {
    signup,
    login,
    forgotPassword,
    verifyPassResetCode,
    resetPassword,
    // googleLogin,
    // profilePicture,
    protect
} = require("./authcontroller.js");

//const { arcjetProtection } = require("../shared/middleware/arcjet.middleware.js");

const router = express.Router();

//router.use(arcjetProtection);

router.post("/signup", signup);
router.post("/login", login);
router.post('/forgotPassword', forgotPassword);
router.post('/verifyResetCode', verifyPassResetCode);
router.put('/resetPassword', resetPassword);
//router.put('/googlelogin',  googleLogin);

//router.put("/update-profile", protect,  profilePicture);

router.get("/check", protect, (req, res) => res.status(200).json(req.user));

module.exports = router;