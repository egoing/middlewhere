var $ = jquery = require('jquery');
var AWS = require('aws-sdk');
var config = require('./config.json')[location.host];

(function(d, s, id){
 var js, fjs = d.getElementsByTagName(s)[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement(s); js.id = id;
 js.src = "//connect.facebook.net/en_US/sdk.js";
 fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function refreshFileList(){
    var s3 = new AWS.S3();
    s3.listObjects({Bucket:config.s3.bucketName}, function(e, d){
        var lis = '';
        for(var i=0; i<d.Contents.length; i++){
          lis += '<li>'+d.Contents[i].Key+'</li>';
        }
        $('#file_list').html(lis);  
    })  
}
function refreshDataList(){
    var dynamodb = new AWS.DynamoDB();
    var params = {
        TableName : config.dynamodb.tableName
    }
    dynamodb.scan(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        var trs = data.Items.map(function(v){
            var country  = v.country ? v.country.S : '';
            return `<tr><td>${v.name.S}</td><td>${country}</td></tr>`;
        })
        $('#data_list').html(trs);
    });
}

function cognito_auth(provider, accessToken){
    if(!AWS.config.credentials.params.Logins){
        AWS.config.credentials.params.Logins = {};
    }
    AWS.config.credentials.params.Logins[provider] = accessToken;
    AWS.config.credentials.expired = true;
    AWS.config.credentials.get(function(){

    })
}
window.checkLoginState = function(){
    FB.getLoginStatus(function(r){
        cognito_auth('graph.facebook.com', r.authResponse.accessToken);
    })
}
window.fbAsyncInit = function() {
    FB.init({
        appId      : config.facebook.appId,
        xfbml      : true,
        version    : 'v2.5'
    });
    checkLoginState();
};



AWS.config.region = config.cognito.region; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: config.cognito.identityPoolId,
});
AWS.config.credentials.get(function(){
    refreshDataList();
    refreshFileList();
});

$('#upload_form').submit(function(e){
    e.preventDefault();
    var S3 = new AWS.S3();
    var file = $('#fileChooser')[0].files[0];
    S3.putObject({Bucket:config.s3.bucketName, Key:AWS.config.credentials.identityId+'/'+file.name, Body:file}, function(e,d){
        refreshFileList();
    });
})

$('#data_form').submit(function(e){
    e.preventDefault();
    var $this = $(this);
    var name = $this.find('[name="name"]').val();
    var country = $this.find('[name="country"]').val();
    var dynamodb = new AWS.DynamoDB();
    var params = {
        TableName : config.dynamodb.tableName,
        Item:{
            "user":{S:AWS.config.credentials.identityId},
            "name":{S:name},
            "country":{S:country}
        }
    }
    dynamodb.putItem(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);   
        refreshDataList(); 
    });
})

$('#data_refresh').click(function(){
    refreshDataList();
})






