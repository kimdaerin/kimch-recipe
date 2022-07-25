const express = require('express')
const app = express()
const bodyParser= require('body-parser');
const { Db } = require('mongodb');
app.use(bodyParser.urlencoded({extended: true}))

const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

const methodOverride = require('method-override');
const e = require('express');
app.use(methodOverride('_method'))

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const { use } = require('passport');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

require('dotenv').config()



var db;
  MongoClient.connect(process.env.DB_URL, function(err, client){
  if (err) return console.log(err)
  db = client.db('todoapp');
  app.listen(process.env.PORT, function() {
    console.log('listening on 8080')
  })
}) 






app.get('/', function(요청,응답){
  응답.sendFile(__dirname + '/index.html');
})

app.get('/write', function(요청, 응답) { 
    응답.sendFile(__dirname +'/write.html');
});

app.post('/add', function (요청, 응답) {

  db.collection('counter').findOne({name : '게시물개수'}, function(에러, 결과){
    var 총게시물갯수 = 결과.totalPost;

    db.collection('post').insertOne({ _id : (총게시물갯수 + 1), 제목 : 요청.body.title, 날짜 : 요청.body.date }, function (에러, 결과) {
      db.collection('counter').updateOne({name:'게시물개수'},{ $inc: {totalPost:1} },function(에러, 결과){
	    if(에러){return console.log(에러)}
        응답.send('전송완료');
      })
    })

  })
})


app.get('/list', function(요청, 응답){
    db.collection('post').find().toArray(function(에러,결과){
        console.log(결과)
        응답.render('list.ejs', {posts: 결과});
    });
    
});



app.delete('/delete', function(요청,응답){
    console.log(요청.body)
    요청.body._id = parseInt(요청.body._id);

    db.collection('post').deleteOne(요청.body, function(에러,결과){
        console.log('삭제완료');
        응답.status(200).send({message:'성공했습니다'});
    })
})




app.get('/detail/:id', function(요청,응답){
    db.collection('post').findOne({_id: parseInt(요청.params.id)}, function(에러, 결과){
        
        console.log(결과);
        응답.render('detail.ejs', { data: 결과 });
    })
   
});



app.get('/edit/:id', function(요청,응답){
    db.collection('post').findOne({_id: parseInt(요청.params.id)}, function(에러,결과){
        응답.render('edit.ejs', {post :결과});
    })
});



app.put('/edit', function(요청,응답){
    db.collection('post').updateOne({_id: parseInt(요청.body.id)}, {$set : {제목: 요청.body.title, 날짜:요청.body.date}}, function(에러, 결과){
        응답.redirect('/list')
    })
})







app.put('/edit', function(요청,응답){
  db.collection('post').updateOne({id: parseInt(요청.params.id)}, {$set : {제목: 요청.body.title, 날짜:요청.body.date}}, 
  function(에러, 결과){
    응답.redirect('/list')
  });
})









app.get('/login', function(요청,응답){
        응답.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
    failuerRedirect:'/fail'
}), function(요청,응답){
    응답.redirect('/mypage');
});


app.get('/mypage', 로그인했니, function(요청,응답){
    console.log(요청.user)
    응답.render('mypage.ejs', {사용자:요청.user})
})

function 로그인했니(요청, 응답, next){
    if (요청.user){ //로그인 후 세션이 있으면 요청.user가 항상 있음
        next()
    } else {
        응답.send('로그인 안하셨는데요')
    }
}


passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (입력한아이디, 입력한비번, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
      if (에러) return done(에러)
  
      if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
      if (입력한비번 == 결과.pw) {
        return done(null, 결과)
      } else {
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
}));

passport.serializeUser(function (user, done) { //id를 이용해 세션을 저장시키는 코드(로그인 성공시 발동)
    done(null, user.id)
  });
  
  passport.deserializeUser(function (아이디, done) { //로그인한 유저의 개인정보를 db에서 찾는 역할, 디비에서 위에 있는 user.id 유저를 찾은뒤에 유저정보를 done(null, {요기에 넣음})
        db.collection('login').findOne({id: 아이디}, function(에러, 결과){
            done(null, 결과)
        })                                        
  }); 

  app.post('/register', function(요청,응답){
    db.collection('login').insertOne({id: 요청.body.id, pw:요청.body.pw }, function(에러, 결과){
      응답.redirect('/');
  })

  app.get('/search', (요청, 응답)=>{

    var 검색조건 = [
      {
        $search: {
          index: 'titleSearch',
          text: {
            query: 요청.query.value,
            path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
          }
        }
      },
    ] 
    console.log(요청.query);
    db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
      console.log(결과)
      응답.render('search.ejs', {posts : 결과})
    });
  })
})

app.use('/shop', require('./routes/shop.js'));

app.use('/board/sub', require('./routes/board.js'));



