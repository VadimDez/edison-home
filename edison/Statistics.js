// Model
var mongoose = require('mongoose');

module.exports = mongoose.model('Statistics', {
    temperature: Number,
    noise: Number,
    light: Number,
    date: Date
});