/*  Developed by Chavee Issariyapat                               */

if (typeof microgear === "undefined") {
    microgear = {};
}

(function()
{
    freeboard.loadDatasourcePlugin({
        "type_name"   : "nexpie_mqtt",
        "display_name": "NEXPIE MQTT",
        "description" : "NEXPIE MQTT datasource",
        "external_scripts" : [
            "js/nexpiemqtt.js"
        ],
        "settings"    : [
            {
                "name"         : "deviceid",
                "display_name" : "Device ID",
                "type"         : "text",
                "description"  : "Device ID",
                "required" : true
            },
            {
                "name"         : "accesstoken",
                "display_name" : "Access Token",
                "type"         : "text",
                "description"  : "Access Token",
                "required"     : true
            },            {
                "name"         : "topics",
                "display_name" : "Subscribed Topics",
                "type"         : "text",
                "description"  : "Topics of the messages that this datasource will consume, the default is /# which means all messages in this app ID.",
                "default_value": "/#",
                "required"     : false
            },
            {
                "name"          : "onCreatedAction",
                "display_name"  : "onCreated Action",
                "type"          : "text",
                "description"   : "JS code to run after a datasource is created"
            },
            {
                "name"          : "onConnectedAction",
                "display_name"  : "onConnected Action",
                "type"          : "text",
                "description"   : "JS code to run after a microgear datasource is connected to NETPIE"
            }

        ],

        newInstance : function(settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new netpieDatasourcePlugin(settings, updateCallback));
        }
    });


    var netpieDatasourcePlugin = function(settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var gconf = {
            key: settings.deviceid,
            secret: settings.accesstoken
        }
        if (settings.alias) gconf.alias = settings.alias;

        var data = {};
        var aliasList = {};

        function initSubscribe(toparr, toSub) {
            if (toparr && toparr.length>0) {
                for (var i=0; i< toparr.length; i++) {
                    if (toSub) {
                        self.mg.subscribe(toparr[i]);
                    }
                    else {
                        self.mg.unsubscribe(toparr[i]);
                    }
                }
            }
        }

        self.updateNow = function() {

        }

        self.onSettingsChanged = function(newSettings) {

            if (currentSettings.name && (currentSettings.name != newSettings.name)) {
                var modifiedname = newSettings.name.substring(0,16);

                if (newSettings.name != modifiedname) {
                    var text = "The datasource name should not be longer than 16 characters otherwise the associative id will be shorten i.e. now the microgear object is referenced by microgear[\""+modifiedname+"\"] and the microgear device alias is trimmed to \""+modifiedname+"\".";
                    newSettings.name = modifiedname;
                    freeboard.showDialog(text, "Warning", "I understand");
                }

                if (microgear[currentSettings.name]) {
                    delete(microgear[currentSettings.name]);
                }
                microgear[newSettings.name] = self.mg;
  
                self.mg.setAlias(newSettings.name);
            }

            if (currentSettings.topics != newSettings.topics) {
                initSubscribe(currentSettings.topics.trim().split(','), false);
                initSubscribe(newSettings.topics.trim().split(','), true);
            }

            if (currentSettings.deviceid != newSettings.deviceid || currentSettings.accesstoken != newSettings.accesstoken) {
                freeboard.showDialog("Reconfigure Device credential needs a page reloading. Make sure you save the current configuration before processding.", "Warning", "OK", "CANCEL", function() {
                    location.reload(true);
                })
            }
            currentSettings = newSettings;
        }

        self.onDispose = function() {
            delete(self.mg);
        }

        self.mg = Microgear.create(gconf);

        if(settings.name !== undefined){
            settings.name = settings.name.replace(' ','_').substring(0,16);
        }
        
        microgear[settings.name] = self.mg;


        self.mg.on('message', function(topic,msg) {

            function topcmp(pattern, intopic, opt) {
                let p = pattern.split('/');
                let t = intopic.split('/');

                let matched = true;
                let split_intopic = t;
                for (let i=0; i<p.length; i++) {
                    if (p[i] != t[i]) {
                        matched = false;
                        split_intopic = [];
                        break;
                    }
                }
                if (matched) return split_intopic;
                else return null;
            }

            if (topic && msg) {
                let obj = null;


                if (sp = topcmp('@shadow/changed', topic, {})){
                    let dskey = '#shadow'+(sp[2]?'/'+sp[2]:'');
                    if (typeof(data[dskey]) == 'undefined') {
                        data[dskey] = {};
                    }
                    try {
                        obj = JSON.parse(msg);
                    }
                    catch(e) {
                    }
                    if (typeof(obj)=='object') {
                        if (obj.event == 'merged') {
                            let m = {
                              ...data[dskey],
                              ...obj.value
                            };
                            data[dskey] = m;
                        }
                        else {
                            data[dskey] = obj.value;
                        }
                    }
                }
                else if (sp = topcmp('@private/shadow/get', topic, {})){
                    let dskey = '#shadow'+(sp[3]?'/'+sp[3]:'');
                    if (typeof(data[dskey]) == 'undefined') {
                        data[dskey] = {};
                    }
                    try {
                        obj = JSON.parse(msg);
                    }
                    catch(e) {
                    }
                    if (typeof(obj)=='object') {
                        data[dskey] = obj.value;
                    }
                }
                else if (sp = topcmp('@private/shadow/read', topic, {})){
                    let dskey = '#shadow'+(sp[3]?'/'+sp[3]:'');
                    if (typeof(data[dskey]) == 'undefined') {
                        data[dskey] = {};
                    }
                    try {
                        obj = JSON.parse(msg);
                    }
                    catch(e) {
                    }
                    if (typeof(obj)=='object') {
                        data[dskey] = obj.value;
                    }
                }


                // switch (topic) {
                //     case '@shadow/changed' :
                //             if (typeof(data['#shadow']) == 'undefined') {
                //                 data['#shadow'] = {};
                //             }
                //             try {
                //                 obj = JSON.parse(msg);
                //             }
                //             catch(e) {
                //             }
                //             if (typeof(obj)=='object') {
                //                 if (obj.event == 'merged') {
                //                     let m = {
                //                       ...data['#shadow'],
                //                       ...obj.value
                //                     };
                //                     data['#shadow'] = m;
                //                 }
                //                 else {
                //                     data['#shadow'] = obj.value;
                //                 }
                //             }
                //             break;
                //     case '@private/shadow/get' :
                //             try {
                //                 obj = JSON.parse(msg);
                //             }
                //             catch(e) {
                //             }
                //             if (typeof(obj)=='object') {
                //                 data['#shadow'] = obj.value;
                //             }

                //             break;
                // }

                updateCallback(data);
            }
        });

        self.mg.on('present', function(m) {
            var mtoken = m.gear;
            var aobj = {
                token : mtoken
            };
            var found = false;
            if (typeof(aliasList[m.alias]) != 'undefined') {
                for (var k=0; k<aliasList[m.alias].length; k++) {
                    if (aliasList[m.alias][k].token == mtoken) {
                        found = true;
                        break;
                    }
                }
            }
            else {
                aliasList[m.alias] = [];
            }
            if (!found) {
                // if the alias changed, remove the old one located under the old alias name
                if (m.type=='aliased') {
                    for (var _alias in aliasList) {
                        for (var k=0; k<aliasList[_alias].length; k++) {
                            if (aliasList[_alias][k].token == mtoken) {
                                aliasList[_alias].splice(k,1);
                            }
                        }
                    }
                }

                aliasList[m.alias].push(aobj);
            }


            for (var _alias in aliasList) {
                if (aliasList[_alias].length == 0) {
                    console.log();
                    delete aliasList[_alias];
                }
            }

            data['alias'] = aliasList;
            updateCallback(data);
        });


        self.mg.on('absent', function(m) {
            var mtoken = m.gear;

            if (typeof(aliasList[m.alias]) != 'undefined') {
                for (var k=0; k<aliasList[m.alias].length; k++) {
                    if (aliasList[m.alias][k].token == mtoken) {
                        aliasList[m.alias].splice(k,1);
                        if (aliasList[m.alias].length == 0) delete aliasList[m.alias];
                        break;
                    }
                }
            }
            data['alias'] = aliasList;
            updateCallback(data);
        });

        self.mg.on('connected', function() {
            aliasList = {};
            data['alias'] = aliasList;
            updateCallback(data);

            initSubscribe(settings.topics.trim().split(','), true);
            if (gconf.alias) {
                self.mg.setAlias(gconf.alias);
            }
            else if (settings.name) {
                self.mg.setAlias(settings.name);
            }

            if (settings.onConnectedAction) {
                var timer = setInterval(function() {
                    if (Object.getOwnPropertyNames(microgear).length > 0) {
                        clearInterval(timer);
                        eval(settings.onConnectedAction);
                    }
                },200);
            }

            if (typeof(onConnectedHandler) != 'undefined') {
                onConnectedHandler(settings.name);
            }
        })

        self.mg.on('disconnected', function() {
            aliasList = {};
            data['alias'] = aliasList;
            updateCallback(data);
        });

        if (settings.onCreatedAction) {
            eval(settings.onCreatedAction);
        }
    
        self.mg.connect(function(){

        });
    }
}());
