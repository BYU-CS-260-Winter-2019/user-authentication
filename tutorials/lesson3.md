# User Authentication: Lesson 3: Salting and Hashing Passwords

We are going to use a popular library for salting and hashing passwords, called `bcrypt`. Let's install this. Be sure you are in the **top level of your project directory**.

We are also installing cookie-parser, which we'll use for login.

```
npm install bcrypt cookie-parser
```

## Schema and model

Our first step is to create a schema and a model for users.

Create a new file called `server/users.js` and place the following there:

```
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const auth = require("./auth.js");

const SALT_WORK_FACTOR = 10;

//
// Users
//

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
```

If we leave this alone, we will be storing passwords in plain text. **This is evil and wrong and we must repent.**

## Salting and hashing

To make sure we do the right thing, we will use a `save` hook in Mongoose. This hook will be called every time a user record is saved, allowing us to be sure to salt and hash the password first.

Here is the code for this hook:

```
userSchema.pre('save', async function(next) {
  // only hash the password if it has been modified (or is new)
  if (!this.isModified('password'))
    return next();

  try {
    // generate a salt
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);

    // hash the password along with our new salt
    const hash = await bcrypt.hash(this.password, salt);

    // override the plaintext password with the hashed one
    this.password = hash;
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
});
```

The `bcrypt.genSalt()` function generates a random salt for the user. The parameter given to this function controls how long the function takes. We want the attacker to have to spend some time guessing your password so they can't crack it fast if they steal your database. Setting this factor properly takes some practice and depends on balancing how long it takes an attacker versus how fast you want to authenticate users.

The `bcrypt.hash` function hashes the password with the salt. Note that it includes the salt with the password, so we don't have to separately store the salt in the database.

Note that this function is middleware for Mongoose. We use the `next` parameter to tell Mongoose to move on to the next piece of the middleware.

## Comparing Passwords

We also need a function to compare the password a user gives us with the hashed and salted password in the database. We can do this by adding a method to the schema:

```
userSchema.methods.comparePassword = async function(password) {
  try {
    const isMatch = await bcrypt.compare(password, this.password);
    return isMatch;
  } catch (error) {
    return false;
  }
};
```

This method uses the `bcrypt.compare` function to compare the user's password with the hashed and salted password in the database. It will hash and salt the supplied password before checking for a match. Remember, the hashed and salted password in the database includes the salt, so this function has all it needs to do the comparison.

## Finish the schema and model

To wrap up, we do a few more things. First, we include a method that strips out the hashed and salted password whenever we create a user record to JSON. This prevents us from sending the password (even if it is salted and hashed) to anyone using our API.

```
userSchema.methods.toJSON = function() {
  var obj = this.toObject();
  delete obj.password;
  return obj;
}
```

Next, we create the model:

```
const User = mongoose.model('User', userSchema);
```

## API

To test our code, we're going to create one API endpoint, which we'll also use later to register a new user account:

```
// create a new user
router.post('/', async (req, res) => {
  if (!req.body.username || !req.body.password)
    return res.status(400).send({
      message: "username and password are required"
    });


  try {

    //  check to see if username already exists
    const existingUser = await User.findOne({
      username: req.body.username
    });
    if (existingUser)
      return res.status(403).send({
        message: "username already exists"
      });

    // create new user
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    await user.save();
    return res.send(user);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
```

Notice we are using `router.post` here, because we are going to have our API inside of a module, just like in the `tickets.js` API. We're also using a route of `/` because we will configure the prefix for this router below in `server.js`.

We first check if the HTTP request body contains a username and password. If either is empty, we return a 400 error.
The 400 code means the request was not formatted properly.

Next, we check if the username already exists. If it does, we return a 403 error. The 403 code means the request is not authorized.

Finally, we create a new user and save their record in the database. **When we call the save method, the save hook will automatically salt and hash the password.**

## Including the API

In `users.js`, at the very end, we need:

```
module.exports = router;
```

In `server.js`, we need the following:

```
const tickets = require("./tickets.js");
app.use("/api/tickets", tickets);
const users = require("./users.js");
app.use("/api/users", users);
```

## Testing

Let's run the server:

```
cd server
node server.js
```

Then we can use curl to test it:

```
curl -X POST -d '{"username":"test","password":"badpassword"}' -H "Content-Type: application/json" localhost:3000/api/users
```

Now use robomongo and you can see the salted and hashed password in the database:

![salted and hashed password in Mongo](/screenshots/robo1.png)
