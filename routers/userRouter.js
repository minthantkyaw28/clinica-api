require("dotenv").config();

const express = require("express");
const router = express.Router();


//Parsing incoming data
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());


//Password Crypting
const bcrypt = require("bcrypt");


//Adding Mongo Database to Express
const { MongoClient, ObjectId } = require("mongodb");
const mongo = new MongoClient(process.env.MONGODB_URI);
