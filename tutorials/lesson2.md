# User Authentication: Lesson 2: Storing Passwords

If you want to keep track of users in your application, you will
generally have a separate database table or document collection for
your users. You will want to store things like:

| Field                     | Value           |
| ------------------------- | --------------- |
| username or email address | emma            |
| password                  | a5rx8fc2nf!ae   |
| first name                | Emma            |
| last name                 | Smith           |
| birthday                  | Date 2019-03-22 |

You can store whatever information you need for your users. But when it comes to passwords:

## Do not store passwords in plain text

If you store passwords in plain text, and an attacker is able to break into your server, then they will have access to all of your users' passwords.

Even worse, many users re-use their passwords on a variety of sites, so the attacker may have their username and password to some important sites.

Surprisingly, many companies make this mistake:

- [Plain wrong: Millions of utility customers’ passwords stored in plain text](https://arstechnica.com/tech-policy/2019/02/plain-wrong-millions-of-utility-customers-passwords-stored-in-plain-text/)

- [T-Mobile Stores Part of Customers' Passwords In Plaintext, Says It Has 'Amazingly Good' Security](https://motherboard.vice.com/en_us/article/7xdeby/t-mobile-stores-part-of-customers-passwords-in-plaintext-says-it-has-amazingly-good-security)

- [Facebook Stored Millions of Passwords in Plaintext—Change Yours Now](https://www.wired.com/story/facebook-passwords-plaintext-change-yours/)

## Hashing

The first step is to hash passwords. You need to use a **cryptographic hash function** for this.

A cryptographic hash function is also called a one-way hash function because it can only be (reasonably) computed in one direction. You input a string (for example, a password), and it outputs a hash of that string:

```
SHA256(a5rx8fc2nf!ae) = 49402B3FCB0EC597A7A151477875DA72B0967D26057A0EA084B24017E9B8BE98
```

You can play with this [online hash generator](https://passwordsgenerator.net/sha256-hash-generator/) to see how this works.

Your table for this user would contain:

# Salting

The second step is to use a different, random number (called a salt) for each user in your database. You concatenate the password with the salt and then hash that. For example:

```
salt = 7a305cG$8a
password = a5rx8fc2nf!ae
SHA256(7a305cG$8aa5rx8fc2nf!ae) = 3D0E170796C685D0161FE69BA623BB2290D3F3FA1560A0793E5A94A82D016A3C
```

Your table for this user would contain:

| Field                     | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| username or email address | emma                                                             |
| password                  | 3D0E170796C685D0161FE69BA623BB2290D3F3FA1560A0793E5A94A82D016A3C |
| salt                      | 7a305cG\$8a                                                      |

When the user wants to login, they give the server their username and password (e.g. by filling out a form, which sends a POST request to your server). The server does the following:

- Find the user record for that username.
  - If it doesn't exist, return a 403 error.
- Get the salt for this user from the user's record in the database.
- Compute the salted hash of the user's password.
- Compare the salted hash with the one stored in the database for that user.
  - If they do not match, return a 403 error.
- Return a 200 OK.

**Every user has a unique salt that is stored in the database with their user record.**

## Why is salting necessary?

Let's imagine you only store the hash of your user's passwords, without salting them. This is better than storing them in plaintext, but why is this not safe?

An attacker, _ahead of time_, can hash every possible dictionary word, combinations of words, and any other common rules for constructing a password. They can hash known passwords that are online from past server breaches:

| Password Guess                 | Hash                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| password                       | 5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8 |
| password1                      | 0B14D501A594442A01C6859541BCB3E8164D183D32937B851835442F69D5C94E |
| admin                          | 8C6976E5B5410415BDE908BD4DEE15DFB167A9C873FC4BB8A81F6F2AB448A918 |
| popcornpoppingontheapricottree | A9BF0D7110669A0F4610D15E6ABB58F0461128FA2DB2B13C7F366B4826916AA9 |
| a5rx8fc2nf!ae                  | 49402B3FCB0EC597A7A151477875DA72B0967D26057A0EA084B24017E9B8BE98 |

Then, when an attacker steals your password database, they simply compare your hashes to their pre-computed hashes. Any matches reveal the password. This is known as a _rainbow table attack_.

## Why does salting work better?

If you salt your passwords with a separate, long, random number for each user, then the attacker cannot precompute hashes of passwords. Instead, they have to steal your password database, find the salt for each individual user, and then for every password they want to check they have to concatenate it with that user's salt and run the hash algorithm.

In other words, the attacker who learns a password for one user learns nothing about any other user, even if they use the same password! Users who have the same password will have a different salt. Different salts will result in different hashes.
