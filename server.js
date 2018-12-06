//8000. portta web sunucusu çalıştırır
var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8000, function(){
    console.log('Server running on 8000...');
});


var mongo = require('mongodb').MongoClient;
var client = require('socket.io').listen(8080).sockets;//8080 portunu dinle
var crypto = require('crypto');

//Veritabanına bağlan
mongo.connect('mongodb://127.0.0.1:27017/chat', { useNewUrlParser: true }, function(err, database){
  if(err){
      console.log(err);
  }
  //İstemci bağlandı
  client.on('connection', function(socket) {

    var cols = database.db('chat');
    var col = cols.collection('messages');
    //Durumu Gönder
    var sendStatus = function(s) {
      socket.emit('status',s)
    }

    //Mesajları gönder
    col.find().limit(100).sort({_id: 1}).toArray(function(error, result) { //Tersten sıralı son 100'ü getir
      if(error) throw error;
      for (var i = 0; i < result.length; i++) {
        result[i].name = decrypt(result[i].name);
        result[i].message = decrypt(result[i].message);
      }
      socket.emit('output', result)
    });

    //Data girişi bekleniyor
    socket.on('input', function(data){

      var name = data.name;
      var message = data.message;
      var whitespacePattern = /^\s*$/; //data'nın boş gelmemesi için
      //İstemciye durum bilgisi gönder
      if(whitespacePattern.test(name) || whitespacePattern.test(message)){
        sendStatus('Adınızı ve mesajınızı giriniz!')
      }
      else {
        col.insert({name: encrypt(name), message:encrypt(message)}, function(){
          //Son girilen mesajı herkese gönder
          client.emit('output', [data]);
          //İlgili kullanıcıya durumu gönder
          sendStatus({
            message: "Mesaj Gönderildi",
            clear: true
          });
        });
      }

    });
  });
});

var algorithm = "aes-256-cbc";
var key = "passwordpasswordpasswordpassword";// 24 karakter
var iv = "vectorvector1234";//16 karakter

var  encrypt = function (text){
  var cipher = crypto.createCipheriv(algorithm, key, iv);
  var encrypt = cipher.update(text, 'utf8', 'hex');
  encrypt += cipher.final('hex');
  return encrypt;
}

var decrypt = function (text){
  var decipher = crypto.Decipheriv(algorithm, key, iv);
  var decrypt = decipher.update(text, 'hex', 'utf8');
  decrypt += decipher.final('utf8');
  return decrypt;
}
