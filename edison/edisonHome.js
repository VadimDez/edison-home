module.exports = {
    init: function() {
        var config = require('./config'),
            bson = require('bson'),
            mongoose = require('mongoose'),
            Statistics = require('./Statistics'),
            mraa = require("mraa"),
            jsupm_i2clcd = require('jsupm_i2clcd');

        // connect to external database
        mongoose.connect(config.db);

        // temperature sensor on Analog 0
        var temperatureSensor = new mraa.Aio(0);

        // sound sensor on Analog 1
        var soundSensor = new mraa.Aio(1);

        // light sensor on Analog 2
        var lightSensor = new mraa.Aio(2);

        // button on Digital 4
        var button = new mraa.Gpio(4);

        // set to read
        button.dir(mraa.DIR_IN);

        //Initialize Jhd1313m1 at 0x62 (RGB_ADDRESS) and 0x3E (LCD_ADDRESS)
        var LCD = new jsupm_i2clcd.Jhd1313m1 (6, 0x3E, 0x62);

        // turn off brightness
        LCD.setColor(0,0,0);

        // start
        main();
        highlight();

        function main() {
            'use strict';

            setInterval(function () {
                var temperature = getCelsius(temperatureSensor.read()),
                    darkness    = getDarknessCoefficient(lightSensor.read()),
                    noise       = soundSensor.read();

                // save to database
                sendValues(temperature, noise, darkness);

                LCD.setCursor(0,0);
                LCD.write('T:' + temperature);

                LCD.setCursor(1,0);
                LCD.write('S:' + noise);

                LCD.setCursor(1,9);
                LCD.write('L:' + darkness);
            }, 60000);
        }

        /**
         * Highlight LCD on pressing button, and keep lights for 2 sec
         */
        function highlight() {
            var timeout, state = true;
            setInterval(function () {
                // check if button is pressed
                if(button.read() !== 1)
                    return;

                // highlight
                (state) ? LCD.setColor(4,55,21) : LCD.setColor(21,74,7);

                // remove previous timeout
                clearTimeout(timeout);
                // set new timeout
                timeout = setTimeout(function() {
                    state = !state;
                    LCD.setColor(0,0,0);
                }, 2000);

            }, 400);
        }

        /**
         * Transform temperature sensor value to celsius temperature
         *
         * @param value
         * @returns {float}
         */
        function getCelsius(value) {
            // Shifting bits to get value between 0 to 1023 (10 bits)
            if (value > 1024)
                value = value >> 2; //Shift 'a' right two bits

            // get the resistance of the sensor
            var resistance = (1023 - value) * 10000 / value;
            // convert to temperature via datasheet
            return 1 / (Math.log(resistance / 10000) / 3975 + 1 / 298.15) - 273.15;
        }

        /**
         * Get coefficient of darkness from converted from sensor value
         *
         * @param value
         * @returns {float}
         */
        function getDarknessCoefficient(value) {
            return (1023-value)*10/value;
        }

        /**
         * Send values to external database
         *
         * @param {float}   temperature
         * @param {int}     noise
         * @param {float}   light
         */
        function sendValues(temperature, noise, light) {
            Statistics.create({
                temperature: temperature,
                noise: noise,
                light: light,
                date: Date.now()
            });
        }
    }
};