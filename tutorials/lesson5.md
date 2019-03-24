# User Authentication: Lesson 4: Authentication

Our next step is to setup the login process. We're going to use tokens to
authorize users. A user who wants to log in supplies a username and password. If
this is correct, the server returns a token. In subsequent API calls, the user
sends along the token to prove they are authorized.

Our tokens will be JSON Web Tokens.

## JSON Web Tokens

A JSON Web Token (JWT) is a signed JSON objects. The server creates a secret password, then uses this as input to an algorithm that will securely sign the JSON object and encode it so it can be sent over the network.

In our case, we sign a JWT that contains the user ID of the user. We send this token to the web browser. Then, if the web browser sends this same token to us in a later request, we can check the signature to be sure it wasn't modified in any way. If it is intact, then we know we previously authorized this web browser to login as that user.

It is possible for someone to intercept a JWT and then send it to the server. This will let them impersonate a logged in user! To avoid this, you should always use encryption, meaning HTTPS for your connections. We will skip this for our labs but for a production site it is critical that you do this.

I have written a library for JWT that you can find in `server/auth.js`. This has several important methods:

- `generateToken(data,expires)` : This generates a JWT. The data parameter is a JavaScript object. The expires parameter is an expiration time such as "24h" for 24 hours.
- `verifyToken`: This is an Express middleware that will expect to find a cookie with a JWT in it. It decodes the JWT, verifies the signature, and if it is correct, places a new property in `req.user` containing the user account for that user.
- `removeOldTokens`: This is a function that, given an array of tokens, will
  return a new array with only valid tokens. It tests each token and removes any
  that are expired.

## Cookies

Cookies are used in HTTP to send data from a web browser to a web server. The web server first tells the web server to "set" a cookie. Then, in every subsequent request, the browser will include this data and send it to the web server.

Here is an example of how server sending a header in an HTTP request to set a cookie:

```
Set-Cookie: qwerty=219ffwef9w0f; Domain=somecompany.com; Path=/; Expires=Wed, 30 Aug 2019 00:00:00 GMT
```

Here is what the web browser will send back every time it visits this site (as long as the cookie is not expired):

```
Cookie: qwerty=219ffwef9w0f; Domain=somecompany.com; Path=/; Expires=Wed, 30 Aug 2019 00:00:00 GMT
```

In our case, we put the JWT in the cookie. This way, the browser will always send us the cookie, and we can use this JWT to prove that it has logged in.

To use cookies, we need to setup the cookie parsing middleware in `server/server.js`:

```
var cookieParser = require("cookie-parser");
app.use(cookieParser());
```

**Put this before the API setup for tickets and users.**

## Login tokens

We want to keep track of the valid tokens for each user. We'll modify the user
schema at the top of `/server/users.js` to add an array of tokens for each user:

```
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  tokens: [],
});
```

In the same file, modify the `toJSON` method to remove the tokens when we send the user record through the API:

```
userSchema.methods.toJSON = function() {
  var obj = this.toObject();
  delete obj.password;
  delete obj.tokens;
  return obj;
}
```

In the same file, after the `toJSON` method, add these new methods:

```
userSchema.methods.addToken = function(token) {
  this.tokens.push(token);
}

userSchema.methods.removeToken = function(token) {
  this.tokens = this.tokens.filter(t => t != token);
}

userSchema.methods.removeOldTokens = function() {
  this.tokens = auth.removeOldTokens(this.tokens);
}
```

The `addToken` method adds a token to the array and the `removeToken` method
removes a token from the array using the filter function. The `removeOldTokens`
method removes any expired tokens. This functionality is provided by the `auth`
library, which I have written for you.

## Login endpoint

To create a login endpoint, add the following to `/server/users.js`, and be sure to put it **before the export statement**:

```
// login
router.post('/login', async (req, res) => {
  if (!req.body.username || !req.body.password)
    return res.sendStatus(400);

  try {
    //  lookup user record
    const existingUser = await User.findOne({
      username: req.body.username
    });
    if (!existingUser)
      return res.status(403).send({
        message: "username or password is wrong"
      });

    // check password
    if (!existingUser.comparePassword(req.body.password))
      return res.status(403).send({
        error: "username or password is wrong"
      });

    login(existingUser, res);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
```

Like with the registration endpoint, we check whether the form was filled out completely, and return a 400 error if it wasn't.

Next, we check if we can find a record for a user with this username. If we can't find this, we return a 403 error.

Next, we check the password, using the `comparePassword` function we wrote earlier. Notice that we return the same 403 error, and same error message, as when the username is wrong. We don't want to tell an attacker whether they got a username correct.

Finally, we call the login function.

## Login function

We are going to write a separate function to login users because we will want
to use it elsewhere. In `server/users.js`, add the following login function.

```
async function login(user, res) {
  let token = auth.generateToken({
    id: user._id
  }, "24h");

  user.removeOldTokens();
  user.addToken(token);
  await user.save();

  return res
    .cookie("token", token, {
      expires: new Date(Date.now() + 86400 * 1000)
    })
    .status(200).send(user);
}
```

This function does the following:

- Creates a JSON Web Token that contains their user ID and that expires in 24 hours.
- Removes any old tokens.
- Adds the new token to the list of valid tokens for the user.
- Sets a cookie that contains this token.
- Sends a 200 OK response.
- Sends the user record for the logged in user.

Note that we put the expiration time into the JWT _and_ the cookie. This is just to simplify cookie expiration for the browser. If the browser keeps the cookie past its expiration time the JWT will still be invalid after 1 day.

## Registration refactor

We want to have users be logged in automatically after they register. So
modify the registration endpoint as follows:

```
   // create new user
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    await user.save();
    login(user, res);
  } catch (error) {
```

## Logout endpoint

We also want a way for a user to log out. Add the following endpoint to `/server/users.js`:

```
// Logout
router.delete("/", auth.verifyToken, async (req, res) => {
  // look up user account
  const user = await User.findOne({
    _id: req.user_id
  });
  if (!user)
    return res.clearCookie('token').status(403).send({
      error: "must login"
    });

  user.removeToken(req.token);
  await user.save();
  res.clearCookie('token');
  res.sendStatus(200);
});
```

The logout endpoint calls `auth.verifyToken` to ensure the user is authorized (logged in). It also looks up the user record to be sure one exists. It then removes
the token from the array of valid tokens, saves the user record, clears the cookie,
and sens back a 200 OK.

## Get logged in user

We will eventually also need functionality fo a user to check if they are logged in. They can call this endpoint to get their user record. This will only succeed if they are logged in.

```
// Get current user if logged in.
router.get('/', auth.verifyToken, async (req, res) => {
  // look up user account
  const user = await User.findOne({
    _id: req.user_id
  });
  if (!user)
    return res.status(403).send({
      error: "must login"
    });

  return res.send(user);
});
```

## Login from front end

We have already setup the login form on our front end, so we just need to fill in the `login` method in `public/script.js`:

```
    async login() {
      this.error = "";
      try {
        let response = await axios.post("/api/users/login", {
          username: this.username,
          password: this.password
        });
        this.user = response.data;
        // close the dialog
        this.toggleForm();
      } catch (error) {
        this.error = error.response.data.message;
      }
    },
```

We use `axios` to call the API and send the username and password in the body of the request. If this succeeds, we set the user property and close the dialog.

## Logout from front end

We can also fill in the `logout` method in `public/script.js`:

```
async logout() {
  try {
    let response = await axios.delete("/api/users");
    this.user = null;
  } catch (error) {
    // don't worry about it
  }
},
```

We use `axios` to call the API and then clear the user property.

## Get user when refreshing

Finally, we need to fill in the `getUser` method:

```
    async getUser() {
      try {
        let response = await axios.get("/api/users");
        this.user = response.data;
      } catch (error) {
        // Not logged in. That's OK!
      }
    },
```

This uses `axios` to check if we are logged in and, if so, return the record for this user. Since we have setup cookies, this request will have a cookie attached to it and we'll stay logged in even if we refresh the page.

And we need to be sure to call `getUser` from within the `created` hook:

```
  created() {
    this.getUser();
    this.getTickets();
  },
```

## Testing

Open the Developer Tools and use the Network tab. Watch your requests as you use the application to login. You can see the cookie being set on the request to the `/api/users/login` endpoint:

![login cookie](/screenshots/login-cookie.png)

You can likewise see this cookie being sent in subsequent requests:

![cookie sent](/screenshots/cookie-sent.png)

## Deleting tickets only if authorized

Now that we have setup registration and login, we can modify our tickets code
to only let logged in users delete tickets. A the top of `/server/tickets.js`,
add the following:

```
const auth = require("./auth.js");
```

This loads the authentication library. Then, later in the file, modify the
DELETE endpoint:

```
router.delete('/:id', auth.verifyToken, async (req, res) => {
```

This ensures that only users with a valid token can delete tickets.

## Deleting Tickets

We need to modify the `deleteTicket` method in `/public/script.js` so that if an error occurs we toggle the login form.

```
    async deleteTicket(ticket) {
      try {
        let response = await axios.delete("/api/tickets/" + ticket._id);
        this.getTickets();
      } catch (error) {
        this.toggleForm();
      }
    }
```

## Testing

You should only be able to delete tickets if you are logged in. If you are not logged in, the error will cause the login dialog to display.

## Closing the dialog with escape

It is convenient to be able to close a modal dialog with the Escape key. We can do this with just a few lines of code. In `public/index.html`, modify the `app` div so it has this extra event handler:

```
  <div id="app" @keydown.esc="closeForm">
```

This triggers when the escape key is pressed. Then add this event handler to `public/scripts.js`:

```
closeForm() {
  this.showForm = false;
},
```

Notice that we can't use `toggleForm` because then the form would also open if we pressed the escape key.
