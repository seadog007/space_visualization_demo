var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var raw = require('./log.json');
var data = [];

(function() {
  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // If the value is negative...
    if (value < 0) {
      return -decimalAdjust(type, -value, exp);
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
})();


raw.forEach(function(current){
  data[current["sys.exec.out.time"]] = current;
  data[current["sys.exec.out.time"]]["sys.exec.out.time"] = Math.round10(current["sys.exec.out.time"], -1);
});

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'public')));

var sending = new Set();

io.on('connection', function(socket) {

  socket.on('start', function() {
    if(!sending.has(socket)){
      socket.time = 0;
      sending.add(socket);
    }
  });

  socket.on('stop', function() {
    sending.delete(socket);
  });

});

setInterval(function(){
  for (let socket of sending) {
    socket.time = Math.round10(socket.time + 0.1, -1)
    if(data[socket.time]){
      socket.emit('data', data[socket.time]);
    }else{
      sending.delete(socket);
      socket.emit('complete');
    }
  }
}, 100);
