var dateformat = require('dateformat');
var HealthCheck = require('healthcheck').HealthCheck;
var Table = require('cli-table');
var instances = $();
var card_ids = $();
var forward_proxy = 'loren.jfrog.team:8079'

$.getJSON("http://loren.jfrog.team/data.json", function(data){
    // Store all the card nodes
    data.forEach(function(item, i) {
	instances = instances.add(createInstance(item));
        item.backend.forEach(function(child, j) { 
            for (key in child) {
                createBackendInstance(item, key, child[key]);
            }
        });
    });
});

var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
                aCallback(anHttpRequest.responseText);
        }

        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
    }
}

function createBackendInstance(item, key, data) {
    var instance = new HealthCheck({
	servers: [
	    forward_proxy+'/http://localhost:'+data
	],
	delay: 3000,
	timeout: 3000,
	failcount: 1,
	https: false,
	logger: function(list) {
	    var table = new Table({
		head: ['name', 'owner pid', 'action time', 'concurrent', 'since', "status", 'is down?']
	    });
	    var servers = Object.keys(list);

	    servers.forEach(function(s) {
	        var hc = list[s];
		var action_time = dateformat(hc.action_time, 'HH:MM:ss');
		var since = dateformat(hc.since, 'HH:MM:ss');
		table.push([s, hc.owner, action_time, hc.concurrent, since, hc.last_status, hc.down]);
	    });
	    //console.log(table.toString());
	}
    });

    function healthcheck() {
        if (item.platform) {            
            var client = new HttpClient();
            client.get('http://'+forward_proxy+'/'+item.url+item.platform_hc, function(response) {
                var obj = JSON.parse(response);
                console.log(obj.router.state+key);
                var serviceId = item.id+"_"+key;
                if(obj.router.state == 'HEALTHY' && key == 'Router') {
                    console.log(document.getElementById(item.id+"_"+key).innerHTML)
                    document.getElementById(serviceId).innerHTML = obj.router.node_id
                }
            });                                                                                  
        } else {
            var iconId = item.id+"_"+data;
	    var status = "cloud_queue";
	    if(!instance.is_down(forward_proxy+"/http://localhost:"+data)) {
	        status = "check";
                if ( document.getElementById(iconId).classList.contains('red-text') ) 
                    document.getElementById(iconId).classList.remove('red-text');
                document.getElementById(iconId).classList.add('green-text');
	    } else {
	        //console.log(item.id+"'s "+key+" is down.");
	        status = "clear";
                if ( document.getElementById(iconId).classList.contains('green-text') ) 
                    document.getElementById(iconId).classList.remove('green-text');
                document.getElementById(iconId).classList.add('red-text');
	    }
            //console.log("what is data"+data);
	    document.getElementById(iconId).innerHTML = status; 
        }
        setTimeout(healthcheck, 3000);
    }
    healthcheck();
}

function createInstance(cardData) {
    var instance = new HealthCheck({
        servers: [
	    forward_proxy+'/'+cardData.url
	],
	delay: 3000,
	timeout: 3000,
	failcount: 1,
	send: cardData.healthcheck,
	expected: cardData.health_expected_response,
	https: false,
	logger: function(list) {
	    var table = new Table({
		head: ['name', 'owner pid', 'action time', 'concurrent', 'since', "status", 'is down?']
	    });
	    var servers = Object.keys(list);

	    servers.forEach(function(s) {
		var hc = list[s];
		var action_time = dateformat(hc.action_time, 'HH:MM:ss');
	        var since = dateformat(hc.since, 'HH:MM:ss');
		table.push([s, hc.owner, action_time, hc.concurrent, since, hc.last_status, hc.down]);
	    });
	    //console.log(table.toString());
	}
    });
    function healthcheck() {
	var status = "cloud_queue";
	if(!instance.is_down(forward_proxy+"/"+cardData.url)) {
	    status = "cloud_done";
            if ( document.getElementById(cardData.id).classList.contains('red-text') ) 
                document.getElementById(cardData.id).classList.remove('red-text');
            document.getElementById(cardData.id).classList.add('green-text');
	} else {
	    //console.log(cardData.url+" is down.");
	    status = "cloud_off";
            if ( document.getElementById(cardData.id).classList.contains('green-text') ) 
                document.getElementById(cardData.id).classList.remove('green-text');
            document.getElementById(cardData.id).classList.add('red-text');
	}
	document.getElementById(cardData.id).innerHTML = status;
        // spec is the key that defines the version's key when a JSON is returned
	var spec = cardData.version_spec;
        var client = new HttpClient();
        client.get('http://'+forward_proxy+'/'+cardData.url+cardData.version_call, function(response) {
            var obj = JSON.parse(response);
            console.log("version:"+obj[spec]);
            var ret = document.getElementById(cardData.frontTitle).innerHTML.replace(cardData.frontTitle,'');
            //console.log(ret);
            document.getElementById(cardData.frontTitle).innerHTML = cardData.backTitle+":"+obj[spec];
        });
	setTimeout(healthcheck, 3000);
    }
    healthcheck();
}
