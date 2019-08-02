var express = require('express');
var joi = require('joi'); 
var authHelper = require('./authHelper');
var ObjectId = require('mongodb').ObjectID;

var router = express.Router();


router.post("/", authHelper.checkAuth, function(req,res,next){
    
    var schema = {
        artistName : joi.string().alphanum().max(40).required(),
        genre : joi.any().valid("ROCK","POP","METAL"),
        description : joi.string().min(30).max(256).required(),
        price : joi.string().regex(/^[0-9]+$/),
        per : joi.any().valid("HR","SET"),
        email: joi.string().email().min(7).max(50).required(),
        phone: joi.string().regex(/^[0-9]+$/)
    }

    joi.validate(req.body, schema, function(err){
        
        if(err)
            return next(err)

        var artist = {
            artistName : req.body.artistName,
            genre : req.body.genre,
            description : req.body.description,
            price : req.body.price,
            per : req.body.per,
            email: req.body.email,
            phone: req.body.phone,
            rating : 0,
            reviewCount : 0
        }

        req.db.collection.insertOne(artist, function(err,resultArtist){
            if(err)
                return next(err)

            req.db.collection.findOneAndUpdate({type : "USER_TYPE", _id : ObjectId(req.auth.userId)},
                {$set : {artistPostId : resultArtist.ops[0]._id.toHexString()}},
                function(err,resultUser){
                    if (err) {
                        return next(err);
                    } else if (resultUser.ok != 1) {
                        return next(new Error('User Update failure'));
                    }
                    
                    res.status(201).json(resultArtist.ops[0]);
                })
            
        })
    })

})

router.delete("/:id", authHelper.checkAuth, function(req,res,next){

    req.db.collection.findOneAndUpdate({type : "USER_TYPE", _id : ObjectId(req.auth.userId), artistPostId : req.params.id},
    {$set : {artistPostId : null}},
    function(err,resultUser){
        if(err){
            return next(err);
        } else if (resultUser.ok != 1) {
            return next(new Error('User Update failure'));
        }

        req.db.collection.findOneAndDelete({ type : "ARTIST_TYPE", _id : ObjectId(req.params.id)}, function(err,resultArtist){
            if(err){
                return new(err)
            }else if(resultArtist.ok != 1){
                return next(new Error('Artist Delete failure'));
            }
            
            res.status(201).json({msg : 'Artist deleted'})
        })
    })
})

router.get("/:genre", function (req,res,next){

    req.db.collection.find({type : "ARTIST_TYPE", genre : req.params.genre}).toArray(function (err, docs) {

        if (err)
            return next(err);

        res.status(200).json(docs);
    })
})

router.put("/:id", authHelper.checkAuth, function (req,res,next){

    req.db.collection.findOne({type : "USER_TYPE", _id : ObjectId(req.auth.userId), artistPostId : req.params.id}, function(err,doc){
        if(err)
            return next(err);

        if(!doc)
            return next(new Error("Update request denied"));
});