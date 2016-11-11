var fs = require('fs');
var url = require('url');
var cron = require('cron');
var PythonShell = require('python-shell');

/*Do I need raven?
var raven = require('raven');
var ravenClient = new raven.Client('https://020405d8e6ce4c66aca28d5fb76d486b:dd028890ac2145898c9d73bbc04dbc90@app.getsentry.com/82686');
ravenClient.patchGlobal();*/

var cronJob = cron.job("0 0 * * *", function(){
  PythonShell.run('run_cnns.py', function (err) {
    if (err) console.log(err);
    console.log('Finished updating CNN accuracy');
  });
});
cronJob.start();

var respond = function (response, responseData, err, errorMessage) {
  if (err || errorMessage) {
    if (err) {
      if (typeof err === 'object') {
        if (err.message) {
          err = err.message;
        } else {
          err = JSON.stringify(err);
        }
      }
      err = errorMessage + ': ' + err;
    } else {
      err = errorMessage;
    }
    console.log(err); // eslint-disable-line no-console
    // return a 400 error
    response.writeHead(400, {'Content-Type': 'text/json'});
    response.write(JSON.stringify({'error' : true, 'msg' : err}));
    response.end();
    return;
  }
  if (!responseData) {
    responseData = {
      error : false
    };
  }
  response.writeHead(200, {'Content-Type': 'text/json'});
  response.write(JSON.stringify(responseData));
  response.end();
};

exports.setupRouter = function (db, router, errorFlag) {

    router.get('/',function(req,res){
        res.sendFile('home.html',{'root': __dirname + '/templates'});
    });

    router.get('/about',function(req,res){
      res.sendFile('about.html',{'root':__dirname + '/templates'})
    });

    router.get('/cnn_accuracies',function(req,res){
      db.cnn_accuracies(function(bound_data,err){
        if (err){
          res.writeHead(400, {'Content-type':'text/html'})
          res.end('err')
        } else {
          res.end(bound_data); 
        }
      })
    });

    router.get('/random_image',function(req,res){
      db.locateRandomImage(function(bound_data){
        var random_image_path = bound_data[0];
        var random_image_label = bound_data[1];
        var id = bound_data[2];
        var high_score = bound_data[3];
        var clicks_to_go = bound_data[4];
        var click_goal = bound_data[5];
          fs.readFile(random_image_path, {encoding: 'base64'}, function(err,content){
            if (err){
              res.writeHead(400, {'Content-type':'text/html'})
              res.end('err')
            } else {
              res.writeHead(200,{'Content-type':'image/jpg'});
              res.end(random_image_path + '!' + random_image_label + '!' + high_score + '!' + clicks_to_go  + '!' + click_goal + 'imagestart' + content); 
            }
          });
          });
    });

    router.post('/clicks', function(req,res){
      var clicks = req.body.clicks;
      var label = req.body.image_id;
      var score = req.body.score;
      db.updateClicks(label,clicks,score,
        respond.bind(null, res),
        respond.bind(null, res, null));
    });
}
