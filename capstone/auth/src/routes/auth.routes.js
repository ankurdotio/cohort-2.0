import { Router } from "express";
import User from "../models/user.model.js";
import passport from "passport";
import { sendAuthNotification } from "../config/mq.js";

const router = Router();


router.get('/google', passport.authenticate('google', {
    session: false,
    scope: [ 'profile', 'email' ]
}));

router.get('/google/callback', passport.authenticate('google', {
    session: false,
    failureRedirect: '/'
}), async (req, res) => {
    try {
        const { id, displayName, emails, photos } = req.user;
        let user = await User.findOne({ googleId: id });

        await sendAuthNotification({
            userId: user._id,
            action: 'google_login',
            timestamp: new Date(),
            email: emails[ 0 ].value
        })

        if (!user) {
            user = new User({
                googleId: id,
                email: emails[ 0 ].value,
                name: displayName,
                avatar: photos[ 0 ].value
            });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set token in cookie
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/'); // Redirect to your frontend after successful login
    } catch (err) {
        console.error('Error during Google authentication:', err);
        res.redirect('/'); // Redirect to your frontend on error
    }
});


export default router;