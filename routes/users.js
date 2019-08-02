var express = require('express');
var bcrypt = require('bcryptjs');
var joi = require('joi'); 
var authHelper = require('./authHelper');
var ObjectId = require('mongodb').ObjectID;

var router = express.Router();


router.post("/",function(req,res,next){

    var schema = {
        displayName : joi.string().alphanum().min(3).max(50).required(),
        email: joi.string().email().min(7).max(50).required(),
        password: joi.string().regex(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/).required()
    }

    joi.validate(req.body, schema, function(err){
        if(err)
            return next(new Error('Invalid field: display name 3 to 50 alpanumeric, valid email, password 7 to 15 (one number, one special character)'))
        
        req.db.collection.findOne({type : "USER_TYPE", email : req.body.email}, function(err,doc){
            if(err)
                return next(err);

            if(doc)
                return next(new Error("Email account already registered"));
            
            var user  = {
                type : "USER_TYPE",
                displayName : req.body.displayName,
                email : req.body.email,
                passwordHash : null,
                date : Date.now(),
                artistPostId : null,
                savedArtists : []
            }

            bcrypt.hash(req.body.password, 10, function (err,hash){
                
                if (err)
                    return next(err)
                
                user.passwordHash = hash;

                req.db.collection.insertOne(user, function(err,result){
                    if(err)
                        return next(err)
                    
                    res.status(201).json(result.ops[0]);
                })
            })
        })
    })
})

router.delete("/:id", authHelper.checkAuth, function(req,res,next){


    if(req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account deletion'))
    
    req.db.collection.findOneAndDelete({type : "USER_TYPE", _id : ObjectId(req.auth.userId)},function(err,result){
        if (err) {
            return next(err);
        } else if (result.ok != 1) {
            return next(new Error('Account deletion failure'));
        }

        res.status(200).json({ msg: "User Deleted" });
    })
})

router.get("/:id", authHelper.checkAuth, function(req,res,next){

    if(req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account '))

    req.db.collection.findOne({type : "USER_TYPE", _id : ObjectId(req.auth.userId)},function(err,doc){

        if (err)
          return next(err);
        
        var profile = {
            email: doc.email,
            displayName: doc.displayName,
            date: doc.date,
            artistPostId: docartistPostId,
            savedArtists: doc.savedArtists
        };
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        res.status(200).json(profile);
    })
})

router.post("/:id/savedArtists/:aid", authHelper.checkAuth, function(req,res,next){
    
    if(req.params.id != req.auth.userId)
        return next(new Error("Invalid request for account"))

    req.db.collection.findOneAndUpdate({ type: 'USER_TYPE', _id: ObjectId(req.auth.userId) },
      { $addToSet: { savedArtists: req.params.aid } },
      { returnOriginal: false },
      function (err, result) {
        if (err) {
          return next(err);
        } else if (result.ok != 1) {
          return next(new Error('Story save failure'));
        }

        res.status(200).json(result.value);
    });
})

router.delete("/:id/savedArtists/:aid", authHelper.checkAuth, function(req,res,next){
    
    if(req.params.id != req.auth.userId)
        return next(new Error("Invalid request for account"))

    req.db.collection.findOneAndUpdate({ type: 'USER_TYPE', _id: ObjectId(req.auth.userId) },
      { $pull: { savedArtists: req.params.aid } },
      { returnOriginal: false },
      function (err, result) {
        if (err) {
          return next(err);
        } else if (result.ok != 1) {
          return next(new Error('Story save failure'));
        }

        res.status(200).json(result.value);
    });
})