/**
* All javascript code to run the MD lockdown
* https://swiperjs.com
*
* Written 2022 Thomas Gregersen
*
* Created for OTG lite
*
* Lockdown states:
* - LOGGED_OUT
* - LOGGED_IN
* - SESSION_TIMEOUT
* - ENTER_PIN
* 
* Released on: March 22, 2023
*/

var lockdownJsVer = "1.6.5";

var SessionCheckTimeInMillis = 8000;

var userInput="";
var enterInfoAndPinMsg ="Please enter information and create a PIN code";
var enterPinMsg ="Please create a PIN code";
var sessionTimeOutEnterPinMsg = "Please enter your PIN";
var errorEnterPinMsg ="An error occured - try again<br/>Please enter new PIN code..";
var reEnterPinMsg ="Please enter the PIN again";
var pinEnteredMsg ="You entered a new PIN <br/><br/> The screen will lock in a few seconds";
var pinEnteredRetryMsg ="PIN entered wasn't the same<br/><br/> Please try again";
var pinEnteredRetryLoggedInMsg ="Wrong PIN entered<br/><br/> Please try again";
var msgText= "Please wait for the device to finish configuration<br/><br/>This popup will disappear automatically when apps are populated<br/><br/><br/><br/>________________________________";
const pincodeinput = document.querySelector("#pincode");
const usernameinput = document.querySelector("#username");
const companyinput = document.querySelector("#company");
var myTimeout = 0;
var debugmode = false;
var lastActiveApp = "";
var killSwitch = "/sdcard/SOTI/logout";
console.log("lockdown.js");

function getLockdownJsVer(){
    return lockdownJsVer;
}

function getDeviceGroup(){
    var ret = "NA";
    try{
        ret = macroJson[0].DeviceGroup;
    }catch(e){
        MobiControlLog("failed getting device group");
    }
    return ret;
}

function getHtmlVersion(){
    //var ver = lockdownHtmlVer;
    if(lockdownHtmlVer)
        return lockdownHtmlVer;
    else
        return "NA";
    //var ver = document.querySelector('meta[name="lockdownHtmlVersion"]').content;
    //MobiControlLog("html version: "+ver);
    //return ver;
}

function init(){
    var first_elm = appsPlaceHolder[0];
    console.log("init");
    populateDeviceInfo();
    //MobiControlLog("first_elm: '"+first_elm+"'");
    var enrState = getEnrollmentState();
    if(enrState==null){
        MobiControlLog("state is null", "warn");
        updateEnrollmentState("Relocated");
    }
    if(getSessionState!="sessionTimedOut"&&first_elm=="OTG_LITE")
        updateSessionStateTime();
    MobiControlLog("init", "debug");
    //first_elm = "PIN";
    if(first_elm=="login"){
        MobiControlLog("We are in login mode", "debug");
        setLockdownState("LOGGED_OUT");
        setUserPin("");
        document.getElementById("login").classList.add('login-button');
        document.getElementById("login-button-text").innerHTML="Login";
                $(".loginbutton-img").attr("src",loginButtonImage);
        var welcometext = document.getElementById("device-welcome-text"); 
        welcometext.style.display = "block"; 
    } else {
        document.getElementById("login").classList.add('logout-button');
        document.getElementById("login-button-text").innerHTML="Logout";
        $(".loginbutton-img").attr("src",logoutButtonImage);
        var welcometext = document.getElementById("device-welcome-text"); 
        welcometext.style.display = "none"; 
    }
    var state = localStorage.getItem("state");
    var lockdownstate = localStorage.getItem("lockdownstate");
    //localStorage.setItem("lockdownstate", "LOGGED_OUT");
    if(first_elm=="OTG_LITE"){
        if(lockdownstate==null){
            setLockdownState("LOGGED_OUT");
        }
        lockdownstate = localStorage.getItem("lockdownstate");
        //var state = localStorage.getItem("state");
        switch(lockdownstate){
            case "LOGGED_OUT":
                MobiControlLog("Lockdownstate: '"+lockdownstate+"' - show create PIN screen", "debug");
                stopTimer();
                showCreatePinScreen();
                document.getElementById("company").focus();
                break;
            case "LOGGED_IN":
                MobiControlLog("Lockdownstate: '"+lockdownstate+"' - just show apps... myTimeout: '"+myTimeout+"'", "debug");
                //stopTimer();
                if(myTimeout==0)
                    updateSessionStateTime();

                break;
            case "ENTER_PIN":
                MobiControlLog("Lockdownstate: '"+lockdownstate+"' - show Enter PIN screen...", "debug");
                //setSessionState("stop_timer");
                stopTimer();
                showEnterPinScreen();

                break;
            case "SESSION_TIMEOUT":
                MobiControlLog("Lockdownstate: '"+lockdownstate+"' - Change lockdownstate to ENTER_PIN", "debug");
                setLockdownState("ENTER_PIN");
                //showEnterPinScreen();

                break;
            default:
                MobiControlLog("Lockdownstate: '"+lockdownstate+"' - unknown...", "error");
        }
       
    }else if(first_elm=="PIN"){
        MobiControlLog("First element is PIN - in Shared Device OTG mode", "debug");
        if(state!="PIN-SET"){
            MobiControlLog("Shared Device OTG mode - PIN is not set", "debug");
            setLockdownState("ENTER_PIN");
            showCreatePinOnlyScreen();
        }else{
            MobiControlLog("Shared Device OTG mode PIN is set - remove PIN prompt box and show message", "debug");
            document.getElementById("popup").style.display = "block";
            document.getElementById("pin-prompt-inner").style.display = "block";
            
            document.getElementById("pin-input").style.display = "none";					
            document.getElementById("messagebox").innerHTML  = msgText;
            document.getElementById("messagebox").style.display = "block";
            document.getElementById("ok-button").style.display = "none"; 
        }
    } else{
        MobiControlLog("First element is '"+first_elm+"' - setting state to nothing", "debug");
        localStorage.setItem("state", "");
    }
    
    $(".deviceinfobutton-img").attr("src",deviceInfoButtonImage);
    generateBackGround();
    
}

function showCreatePinOnlyScreen(){
    document.getElementById("popup").style.display = "block"; 
    document.getElementById("pin-prompt-inner").style.display = "block"; 
    document.getElementById("pin-label").innerHTML  = enterPinMsg;
    document.getElementById("usernameInput").style.display = "none"; 
    document.getElementById("companyInput").style.display = "none"; 
    document.getElementById("pin-input").style.display = "block";
    document.getElementById("ok-button").style.display = "block"; 
    document.getElementById("ok-button").onclick = function() {submitMyPIN()};
   // document.querySelector('#pincode-button').disabled = true;
    document.getElementById("pin-input").focus();
}

// show blank screen with Device Info button and prompt for creating a PIN
function showCreatePinScreen(){
    MobiControlLog("showCreatePinScreen", "debug");
    enterInfoAndPinMsg ="<span style='font-weight:bold'>Welcome to "+getDeviceGroup()+"</span><br/>Please enter information and create a PIN code";
    document.getElementById("pincode").value = "";
    document.getElementById("username").value = "";
    document.getElementById("company").value = "";
    document.querySelector('#ok-button').disabled = true;
    document.getElementById("pin-input").style.display = "block";
    document.getElementById("pin-prompt-inner").style.display = "block"; 
    document.getElementById("usernameInput").style.display = "block"; 
    document.getElementById("companyInput").style.display = "block"; 
    document.getElementById("pin-label").innerHTML  = enterInfoAndPinMsg;
    document.getElementById("company").focus();
    document.getElementById("popup").style.display = "block"; 
    document.getElementById("popup-service-buttons").style.display = "block";
    document.getElementById("ok-button").style.display = "block"; 
    document.getElementById("ok-button").onclick = function() {submitMyPIN()};
    document.getElementById("login-button").style.display = "none"; 
   // document.getElementById("notuser-button").style.display = "none";
    setUserPin("");
    setUserName("");
    setCompany("");
    MobiControlLog("showCreatePinScreen DONE", "debug");
}

// show PIN prompt when session has timed out
function showEnterPinScreen(){
    MobiControlLog("showEnterPinScreen", "debug");

    //document.querySelector('#pincode-button').disabled = true;
    document.getElementById("popup").style.display = "block"; 
    document.getElementById("pin-prompt-inner").style.display = "block"; 
    document.getElementById("pin-input").style.display = "block";
    document.getElementById("usernameInput").style.display = "none"; 
    document.getElementById("companyInput").style.display = "none"; 
    document.getElementById("pin-label").innerHTML  = "<h3>"+localStorage.getItem("username")+"</h3>"+sessionTimeOutEnterPinMsg;
    document.getElementById("company").focus();
    document.getElementById("login-button").style.display = "block"; 
    document.getElementById("ok-button").style.display = "block"; 
    document.getElementById("ok-button").onclick = function() {submitMyPIN()};
    document.getElementById("pincode").value = "";
    document.getElementById("cancel-button").style.display = "block";
    document.getElementById("cancel-button").innerHTML = "Logout";
    document.getElementById("cancel-button").onclick = function() {logout(true)};
    document.getElementById("popup-service-buttons").style.display = "block";
}

/*
 * Reads the JSON file '/sdcard/SOTI/Lockdown/json/apps.json'
 * Calls PopulateApps() with the result from the apps.json in an array.
 * 
 * If apps.json doesn't exist, populateApps() is called with an empty appsArray
 * 
 */
function readAppJson(){
    var jsonPath = '/sdcard/SOTI/Lockdown/json/apps.json';
        
    var appsArray ={};
   try{ 
        
        var jsonFile = new XMLHttpRequest();
        jsonFile.addEventListener('loadend', function(e){

            var json = jsonFile.responseText;
            var myjson = JSON.parse(json);
            
            myjson.forEach((item, index) => {
                appsArray[item.packageName]= item.versionName;
            });
            populateApps(appsArray);      
        });
        
        jsonFile.open("GET", jsonPath, false);                           
        jsonFile.send(null);
    }catch(e){
        MobiControlLog("readAppJson() error - maybe '"+jsonPath+"' is not available", "error");
        populateApps(appsArray);
    }
}


function prepareAppJson(){

    var jsonPath = '/sdcard/SOTI/Lockdown/json/apps_to_install.json';
    var jsonFile = new XMLHttpRequest();
    jsonFile.addEventListener('loadend', function(e){

        var json = jsonFile.responseText;
        
        //MobiControlLog("returned apps_to_install.json file");
        
        var myjson = JSON.parse(json);
        var len = myjson.length;
        var html = "";//"<div class='status'>";
        for(e=0;e<myjson.length;e++){
            if(myjson[e].packageName.substring(12,0)=="%CustomAttr:"){
                //MobiControlLog("'%CustomAttr:' seen for "+myjson[e].appName+" - "+myjson[e].packageName);
                var macroName = myjson[e].packageName.substring((myjson[e].packageName.length-1),12);
                //MobiControlLog("macroName "+macroName);
                
                var pkgName = macroJson[0][macroName];
                //MobiControlLog("Lookup macro name for '"+macroName+"': '"+pkgName+"'");
                var app = myjson[e].appName;
                //MobiControlLog("'%CustomAttr:' seen for "+app+" - looked up in macro: "+pkgName);
                myjson[e].packageName = pkgName;
                
                var pkg = myjson[e].packageName;
                //MobiControlLog("'%CustomAttr:' seen for "+app);
                //MobiControlLog("in json changed to: "+pkg);
            }
            
        }
        //html += "</div>";
        var myjsonTxt = JSON.stringify(myjson);
        //document.getElementById("Status").innerHTML = myjsonTxt;
        updateAppVersionInfo("var appsArray = "+myjsonTxt);    
    });
    
    jsonFile.open("GET", jsonPath, false);                           
    jsonFile.send(null);

}

/*
 * Populate the swiper pages with apps and the button images (device info and login/out)
 * 
 * The arrays appsPlaceHolder, imagesPlaceHolder, exeImagesPlaceHolder and linksPlaceHolder are used to populate apps.
 * It uses the installedAppsJson to check the app version to see if the app is installed - if not installed, not shown
 *
 * 
 */
function populateApps(installedAppsJson){
    MobiControlLog("populateapps()", "debug");
    var allAppListData = [];
    var allAppListTempData = [];
    for(e=0; e<appsPlaceHolder.length; e++){
        if (void 0 != appsPlaceHolder[e].split(".")[1]) {
            var o="";
            if(imagesPlaceHolder[e] != "")
                o = imagesPlaceHolder[e];
            else
                o = exeImagesPlaceHolder[e] != "" ? exeImagesPlaceHolder[e] : defaultIcon;              
            var A = linksPlaceHolder[e];
            var p = appsPlaceHolder[e].split(".")[1];
            //console.log("p= '"+p+"'");
            if(appsPlaceHolder[e].startsWith("background")){
                backgroundImage = o;
                console.log("background image= '"+backgroundImage+"'");
            }
            if(appsPlaceHolder[e].startsWith("deviceinfo")){
                deviceInfoButtonImage = o;
                console.log("deviceInfoButtonImage image= '"+deviceInfoButtonImage+"'");
            }
            if(appsPlaceHolder[e].startsWith("loginbutton")){
                loginButtonImage = o;
                console.log("loginButtonImage image= '"+loginButtonImage+"'");
            }
            if(appsPlaceHolder[e].startsWith("logoutbutton")) {
                logoutButtonImage = o;
                console.log("logoutButtonImage image= '"+logoutButtonImage+"'");
            }
            var prefix=appsPlaceHolder[e].split(".")[0];
            var suffix=appsPlaceHolder[e].split(".")[1];
            //MobiControlLog("prefix: '"+prefix+"' - suffix: '"+suffix+"'");
            if(appsPlaceHolder[e].split(".")[1].length!=0 && appsPlaceHolder[e].split(".")[0]=="apps")
            {
                appIcon =  o;
                appName = p;
                link =  A;
                var app_pkg = linksPlaceHolder[e].split("Launch://")[1];
                var app_exe_img = exeImagesPlaceHolder[e];
                var ver = installedAppsJson[app_pkg];
                //MobiControlLog("app '"+app_pkg+"' exe img: '"+app_exe_img+"'");
                if(ver=="Not installed"){
                    //MobiControlLog("app: '"+app_pkg+"' is NOT installed so not shown on the lockscreen","debug");
                }else{
                    //MobiControlLog("app: '"+app_pkg+"' IS installed","debug");
                    appListDataNew = `<a href="${link}">
                        <div class="icon-wrap">
                            <picture><img src="${appIcon}" alt="${appName}"></picture>
                            <h3>${appName}</h3>
                        </div> 
                        </a>       
                        `;
                    appListData =  appListData = `<div class="icon-wrap">
                        <a href="${link}">                      
                                <picture><img src="${appIcon}" alt="${appName}"></picture>
                                <span>${appName}</span>
                            </a>
                        </div>`;
                    allAppListData.push(appListData);

                }
                
            }
        }
    }
    //populateDeviceInfo();
    init();

    $("#appListWrap").html(allAppListData); 
    var $span = $(".icon-wrap");
    for (var i = 0; i < $span.length; i += 12) {
        var $div = $("<div/>", {
            class: 'swiper-slide'
        });
        $span.slice(i, i + 12).wrapAll($div);
    }
    var swiper = new Swiper("#menu-carousel", {
        slidesPerView: 1,
        slidesPerGroup: 1,
        // freeMode: true,
        // grid: {
        //   rows: 6,
        //   fill: 'row',
        // },
        spaceBetween: 0,
        pagination: {
        el: ".swiper-pagination",
        clickable: true,
        },
    });
    $(window).resize(function(){
        const height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
        if (height < 490)  {
                $('#appListWrap').empty();
                $("#appListWrap").html(allAppListData); 
                var $span = $(".icon-wrap");
                for (var i = 0; i < $span.length; i += 6) {
                var $div = $("<div/>", {
                        class: 'swiper-slide'
                    });
                    $span.slice(i, i + 6).wrapAll($div);
                }
        } else {
            $('#appListWrap').empty();
                $("#appListWrap").html(allAppListData); 
                var $span = $(".icon-wrap");
                for (var i = 0; i < $span.length; i += 12) {
                var $div = $("<div/>", {
                        class: 'swiper-slide'
                    });
                    $span.slice(i, i + 12).wrapAll($div);
                }
        } 
        swiper.update();
    })
    $(window).trigger('resize');
}

function populateDeviceInfo(){
    //MobiControlLog("populateDeviceInfo", "debug");
    if(appsPlaceHolder[0]=="OTG_LITE"){
        MobiControlLog("populateDeviceInfo - populating username and company", "debug");
        document.getElementById("deviceinfo-username").innerHTML = getUserName()+" ("+getCompany()+")";
        
    }
    updateDeviceParameters();
}


function updateDeviceParameters(){
    MobiControlLog("UpdateDeviceParams","debug");


    try{
        document.getElementById("deviceinfo-html").innerHTML = "v"+getHtmlVersion();  
        document.getElementById("deviceinfo-lockdownjs").innerHTML = "v"+getLockdownJsVer(); 
    }catch(e){
        MobiControlLog("missing html version and deviceinfo-elements - it is pre 2.7","debug");
    }
    

    var readyScript = "mobicontrol.agent.version;";
    var req = executeMCscript(readyScript);
    req.addEventListener('loadend', function(e){
        agentVersion = req.responseText;
        //MobiControlLog("AgentVersion="+agentVersion);
        document.getElementById("deviceinfo-agent").innerHTML = agentVersion;     
    });

    var readyScript = "mobicontrol.os.buildNumber;";
    var req1 = executeMCscript(readyScript);
    req1.addEventListener('loadend', function(e){
        oemVersion = req1.responseText;
        //MobiControlLog("oemVersion="+oemVersion);  
        document.getElementById("deviceinfo-oem").innerHTML = oemVersion;
    });
}

function get_object_from_pkgname(array, pkgname) {
    var length = array.length;

    for (var i = 0; i < length; i += 1) {
        if (array[i].packageName == pkgname)
            return people_array[i].age;
    }
}

function deleteFile(path){
    var script = "(new mobicontrol.io.File('"+path+"')).delete();";
    var req = executeMCscript(script);
    req.addEventListener('loadend', function(e){
        if(req.responseText=="true"){
            // file exists
            MobiControlLog("file: '"+path+"' was deleted");
        }
        else{
            MobiControlLog("file: '"+path+"' doesn't exist", "debug");
        }
    });

}

function checkIfLogout(){
    var script = "(new mobicontrol.io.File('"+killSwitch+"')).exists;";
    var req = executeMCscript(script);
    req.addEventListener('loadend', function(e){
        if(req.responseText=="true"){
            // file exists
            MobiControlLog("file: '"+killSwitch+"' exists - logging out user and clear data");
            clearAllUserInfo();
            cleanupDevice();
            deleteFile(killSwitch);
        }
        else{
            MobiControlLog("file: '"+killSwitch+"' doesn't exist", "debug",false);
        }
            
    });
}

/*
 * Called when DOM is finished (jQuery function) 
 *
 * 
 * 
 */
$(function() {
    checkIfLogout();
    if(macroJson[0].lockdown_debugmode==1){
        MobiControlLog("Debugmode");
        debugmode = true;
    }
    
    MobiControlLog("called $function()", "debug");
    
    if(appsPlaceHolder[0]=="OTG_LITE"){
        console.log("OTG_LITE");
        if(getUserPin()==null){
            console.log("getUserPin()==null");
            setLockdownState("LOGGED_OUT");
            stopTimer();
            init();
        }else{
            console.log("getUserPin()!=null");
            isScreenActive();
        }
    }

    // compare apps_to_install.json with the list of apps from the lockdown and add them to allInstalledAppListData

    var jsonPath = '/sdcard/SOTI/Lockdown/json/apps_to_install.json';
    var jsonFile = new XMLHttpRequest();
    try{
        jsonFile.addEventListener('loadend', function(e){

            var json = jsonFile.responseText;
            
            //MobiControlLog("returned apps_to_install.json file");
            
            var myjson = JSON.parse(json);
            var len = myjson.length;
            var html = "";//"<div class='status'>";
            for(e=0;e<myjson.length;e++){
                if(myjson[e].packageName.substring(12,0)=="%CustomAttr:"){
                    //MobiControlLog("'%CustomAttr:' seen for "+myjson[e].appName+" - "+myjson[e].packageName);
                    var macroName = myjson[e].packageName.substring((myjson[e].packageName.length-1),12);
                    //MobiControlLog("macroName "+macroName);
                    
                    var pkgName = macroJson[0][macroName];
                    //MobiControlLog("Lookup macro name for '"+macroName+"': '"+pkgName+"'");
                    var app = myjson[e].appName;
                    //MobiControlLog("'%CustomAttr:' seen for "+app+" - looked up in macro: "+pkgName);
                    myjson[e].packageName = pkgName;
                    
                    var pkg = myjson[e].packageName;
                    //MobiControlLog("'%CustomAttr:' seen for "+app);
                    //MobiControlLog("in json changed to: "+pkg);
                }
                
            }

            var myAppsToInstall = JSON.stringify(myjson);

                
            var allInstalledAppListData = [];
            for(e=0; e<appsPlaceHolder.length; e++){
                if (void 0 != appsPlaceHolder[e].split(".")[1]) {
                            
                    var A = linksPlaceHolder[e];
                    var p = appsPlaceHolder[e].split(".")[1];
                    //console.log("p= '"+p+"'");
                    
                    if(appsPlaceHolder[e].split(".")[1].length!=0)
                    {
                        
                        appName = p;
                        link =  A;
                        var app_pkg = linksPlaceHolder[e].split("Launch://")[1];
                        try{
                            if(app_pkg.split("/")[1].length>0){
                                MobiControlLog("app '"+app_pkg+"' references a class: '"+app_pkg.split("/")[1]+"'", "debug");
                                app_pkg = app_pkg.split("/")[0];
                            }
                        }catch(e){
                            //MobiControlLog("app '"+app_pkg+"' gives an error");
                        }
                        var thisCleanAppOnLogout="1";
                        var thisBroadcastIntentOnLogout="none";
                        try{
                            thisCleanAppOnLogout = myjson[myjson.map(item => item.packageName).indexOf(app_pkg)].cleanAppOnLogout;
                            //MobiControlLog("myjson '"+app_pkg+"' references cleanAppOnLogout: '"+thisCleanAppOnLogout+"'", "debug");
                            thisBroadcastIntentOnLogout = myjson[myjson.map(item => item.packageName).indexOf(app_pkg)].broadcastIntentOnLogout;
                            //MobiControlLog("myjson '"+app_pkg+"' references broadcastIntentOnLogout: '"+thisBroadcastIntentOnLogout+"'", "debug");
                        }catch(e){

                        }
                        //MobiControlLog("app: '"+app_pkg+"'");
                        if(app_pkg && app_pkg!="undefined")
                        {
                            var mydata = {
                                "packageName": app_pkg,
                                "appName": appName,
                                "minVersionName":"0",
                                "cleanAppOnLogout":thisCleanAppOnLogout,
                                "broadcastIntentOnLogout": thisBroadcastIntentOnLogout,
                            }
                            allInstalledAppListData.push(mydata); 
                        }        
                    }
                }
            }
            if(appsPlaceHolder[0]!="login"){
                //MobiControlLog("calling getAppsVersion to update the version of apps in the apps.json file");
                var txtFile = new XMLHttpRequest();
                var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/getappsversion.cmd";
                try{
                    txtFile.addEventListener('loadend', function(e){

                        var script_array="var appsArray = "+JSON.stringify(allInstalledAppListData)+";";  

                        var sotijs = txtFile.responseText;
                    
                        //MobiControlLog("returned script: "+sotijs);
                    
                        if(txtFile.responseText.length>10){ // if there is a file to load.. 
                            
                            var readyScript = script_array+" "+txtFile.responseText;

                            var req = executeMCscript(readyScript);
                        
                            req.addEventListener('loadend', function(e){
                                
                                readAppJson();
                                    
                            });
                            
                            
                        }else{
                            MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error");
                            localStorage.setItem("state", "");
                        }
                            
                    });
                    
                    txtFile.open("GET", scriptPath, false);                           
                    txtFile.send(null);
                }catch(e){
                    MobiControlLog("calling getAppsVersion error - maybe '"+scriptPath+"' is not available", "debug");
                    readAppJson();
                }
            }else  
            {
                MobiControlLog("This is login... populating apps with nothing", "debug");
                populateApps("[]");
            }
        });
        
        jsonFile.open("GET", jsonPath, false);                           
        jsonFile.send(null);
    }catch(e){
        MobiControlLog("calling json file error - maybe '"+jsonPath+"' is not available", "debug");
        readAppJson();
    }

    
    
});

function removeAllChildrenFromNode (node) {
    var shell;
    // do not copy the contents
    shell = node.cloneNode(false);
    if (node.parentNode) {
        node.parentNode.replaceChild(shell, node);
    }
    return shell;
}

function generateBackGround() {
    //MobiControlLog("generating background");
    $("body").css("background-color", backgroundColor);
    if(enableBackgroundImage){
        $("body").css({"background-image": "url("+backgroundImage+")","background-size":"cover"});
    }
}




function isScreenActive(){
    if(appsPlaceHolder[0]!="OTG_LITE"){
        MobiControlLog("isScreenActive() called but not in OTG_LITE mode - Skipping...","debug");
        setSessionState("stop_timer");
    }else{
        var state = getSessionState();
        var lockdownstate = getLockdownState();
        //MobiControlLog("is Screen active - state: '"+state+"' - lockdownstate: '"+lockdownstate+"' pin: '"+getUserPin()+"'");
        // var prompt = document.getElementById('popup');
        // var okButton = document.getElementById('ok-button');
        // var cancelButton = document.getElementById('cancel-button');
        // var promptText = document.getElementById('popup-messagebox');
        if(lockdownstate!="LOGGED_OUT"){
            if(state=="sessionTimedOut"){
                MobiControlLog("isScreenActive() - Session timed out", "debug");
                
            }else if(state=="logOut"){
                MobiControlLog("isScreenActive() - User logged out", "debug");
                logout(true);
            }else{
                
                var screenActive = -1;
                var maxSessionTimeoutInSecs = 11;

                var readyScript = "JSON.stringify((mobicontrol.app.foregroundActivities.map(a => [a.packageName,a.className])));";
               

                var req = executeMCscript(readyScript);
                if(req!=null){
                
                    req.addEventListener('loadend', function(e){
                        
                        var foregroundActivityList =this.responseText;
                        if (foregroundActivityList != null) {
                            // we received something back from the SotiJS call to get foreground activies
                            // creating this into an array of activities
                            var foregroundActivities = "";
                            try{
                                foregroundActivities= JSON.parse(foregroundActivityList);
                            }catch(e){
                                console.log(e);
                            }
                            screenActive = foregroundActivities.length;
                            var sameActivities = false;
                            if(lastActiveApp == foregroundActivities[0]){
                                sameActivities=true;
                            }else{
                                lastActiveApp = foregroundActivities[0];
                            }
                                

                            switch(screenActive){
                                case 0:
                                    // There are no activities in the foreground, so we don't expect the screen to be on
                                    var LastActiveSessionStateTime = localStorage.getItem("LastActiveSessionStateTime");
                                
                                    var now = (new Date()).getTime();
                                    
                                    sessionInactive= Math.round(((new Date()).getTime() - LastActiveSessionStateTime)/1000);
                                    
                                    var html="";
                                    MobiControlLog("Screen inactive for : '"+sessionInactive + "' seconds - Last active: "+ getTimeStamp(new Date(Number(LastActiveSessionStateTime))), "debug");
                                    
                                    if(sessionInactive>=maxSessionTimeoutInSecs){
                                        MobiControlLog("Session timed out - Prompting user for PIN","debug");
                                        
                                        setLockdownState("ENTER_PIN");
                                        
                                        setSessionState("sessionTimedOut");
                                        stopTimer();
                                        gotoMobiControl();
                                    }
                                    break;
                                case 1:
                                    if(!sameActivities)
                                        MobiControlLog("Screen is Active with "+screenActive+" activity: '"+foregroundActivities[0]+"'", "debug");
                                    if(foregroundActivities[0]=="com.android.chrome,org.chromium.chrome.browser.firstrun.LightweightFirstRunActivity"){
                                        
                                        MobiControlLog("Screen is Active with Chrome - killing it");
                                        killChromeFirstUsePrompt();
                                    }
                                    var now = new Date();
                                    localStorage.setItem("LastActiveSessionStateTime", now.getTime());
                                    localStorage.setItem("InactiveSessionStateBegin", 0);
                                    break;
                                case 2:
                                    
                                    var now = new Date();
                                    localStorage.setItem("LastActiveSessionStateTime", now.getTime());
                                    localStorage.setItem("InactiveSessionStateBegin", 0);
                                    MobiControlLog("Screen is active with two foreground activities: '"+foregroundActivities[0]+"' and '"+foregroundActivities[1]+"'", "error");
                                    
                                    // check if one activity is MC agent - start and kill the other activity if launcher, calculator, calendar...
                                    // Stop clock app if it runs in the foreground
                                    var mcAgent = 'net.soti.mobicontrol.androidwork';
                                    if(foregroundActivities.includes(mcAgent)){
                                        foregroundActivities.forEach(function(activity) {
                                            if (activity!=mcAgent) {
                                                MobiControlLog("Maybe try to start and then stop activity: '"+activity+"' ", "warn");
                                                mobicontrol.app.stop(activity.packageName);
                                            }
                                        });
                                    }
                                    var foregroundActivities = mobicontrol.app.foregroundActivities;
                                    foregroundActivities.forEach(function(activity) {
                                        if (activity.packageName.includes(clockApp)) {
                                            mobicontrol.app.stop(activity.packageName);
                                        }
                                    });


                                    break;
                                default:
                                    MobiControlLog("Screen is active with "+screenActive+" activities - more than two foreground activities... this should be EXTREMELY rare!", "error");

                            }
                            
                        }
                    
                    });
                }else
                    MobiControlLog("Tried to run SOTI JS script: '"+readyScript+"' but it's not possible","error");

            }
        }
    }
      
}

function killChromeFirstUsePrompt(){

    var readyScript = "mobicontrol.device.injectKey(22); mobicontrol.device.injectKey(22); mobicontrol.device.injectKey(22); mobicontrol.device.injectKey(22); mobicontrol.device.injectKey(66);";
    executeMCscript(readyScript);
}

/*
 * Opens MobiControl
 * 
 * Used for forcing the focus onto the lockdown when session times out
 * 
 */
function gotoMobiControl(){
    var readyScript = "mobicontrol.app.start('net.soti.mobicontrol.androidwork');";
                
    executeMCscript(readyScript);
}

/*
    Read a ini file

    [Section1]
    Param1=value1
    [Section2]
    Param2=value2

*/
function parseINIString(data){
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/[\r\n]+/);
    var section = null;
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            return;
        }else if(regex.param.test(line)){
            var match = line.match(regex.param);
            if(section){
                value[section][match[1]] = match[2];
            }else{
                value[match[1]] = match[2];
            }
        }else if(regex.section.test(line)){
            var match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(line.length == 0 && section){
            section = null;
        };
    });
    return value;
}

// ###### Getters and setters of states (enrollment, Lockdown and session) ######

function getEnrollmentState(){
    return localStorage.getItem("enrollmentstate");;

}

function setLockdownState(lockdownstate){
    localStorage.setItem("lockdownstate", lockdownstate);
}

function getLockdownState(){
    return localStorage.getItem("lockdownstate");
}

function setSessionState(sessionstate){
    var existingSessionState = getSessionState();
    MobiControlLog("Session state is: '"+existingSessionState+"' Setting new state to: '"+sessionstate+"'","debug");
    localStorage.setItem("sessionstate", sessionstate);
}

function getSessionState(){
    return localStorage.getItem("sessionstate");
}

// ###### Getters and setters of user values (PIN, UserName and Company) ######

function setUserPin(pin){
    MobiControlLog("__________Setting user PIN to: '"+pin+"'_________","debug",false);
    localStorage.setItem("PIN", pin);
}

function getUserPin(){
    return localStorage.getItem("PIN");
}

function setUserName(un){
    localStorage.setItem("username", un);
    //WriteToIni("USER", "username", un);
}

function getUserName(){
    return localStorage.getItem("username");
}

function setCompany(c){
    localStorage.setItem("company", c);
    //WriteToIni("USER", "company", c);
}

function getCompany(){
    return localStorage.getItem("company");
}

function clearAllUserInfo(){
    localStorage.clear();
    WriteToIni("USER", "username", "Not logged in");
    WriteToIni("USER", "company", "Not logged in");
    WriteToIni("USER", "lastchange", getTimeStamp(new Date())+" (logged out)");
    mcCheckin();
}


// function is called when session is timed out and the user chooses to click YES to delete all data
function logout(clearAll){

    if(clearAll){
        console.log("logout true");
        MobiControlLog("User pressed logout or the 'I'm not the logged in user'-button - clear all app cache and data?", "debug");
        document.getElementById("pin-input").style.display = "none";
        document.getElementById("popup").style.display = "block";
        					
        //document.getElementById("popup-messagebox").innerHTML  = "<span>This will clear the device of all app cache and personal data including pictures taken with the camera</span><br><div id='service-buttons' style='text-align: center;'><div id='service-buttons-container'><button id='ok-button' onclick='logoutVerify(true)'>OK</button><button id='cancel-button' onclick='logoutVerify(false)'>Cancel</button></div></div>";
        document.getElementById("popup-messagebox").innerHTML  = "<h2>Logging out</h2><p style='text-align:left; padding-left: 15px;'>User: "+getUserName()+"</p><p style='text-align:left; padding-left: 15px;'>Company: "+getCompany()+"</p><br/>This will clear the device of all app cache and personal data including pictures taken with the camera<br>";
        document.getElementById("popup-messagebox").style.display = "block";
        document.getElementById("service-buttons").style.display = "block";
        document.querySelector('#ok-button').disabled = false;
        document.getElementById("ok-button").style.display = "block";
        document.getElementById("ok-button").innerHTML = "OK";
        document.getElementById("ok-button").onclick = function() {logoutVerify(true)};
        document.getElementById("cancel-button").style.display = "block";
        document.getElementById("cancel-button").innerHTML="Cancel";
        document.getElementById("cancel-button").onclick = function() {logoutVerify(false)};

        // delete all data and kill apps and clear cache
    }else{
        console.log("logout false");
        MobiControlLog("Session timeout button - user pressed no", "debug");
        localStorage.setItem("sessionstate", "loggedOut");
        document.getElementById("popup").style.display = "none";
        document.getElementById("popup-messagebox").style.display = "none";
    }
}

// listening for button click OK (true) or cancel (false)
function logoutVerify(clearAll){
    document.getElementById("popup").style.display = "none";
    				
    document.getElementById("popup-messagebox").style.display = "none";
    //prompt.style.display="none";
    if(clearAll){
        //setSessionState("loggedOutAndCleared");
        
        MobiControlLog("Session timeout verify OK button - user verified with an OK - clearing all app cache and data", "debug");
        //var state = getSessionState();
        //setLockdownState("LOGGED_OUT");
        clearAllUserInfo();
        stopTimer();
        init();
        // delete all data and kill apps and clear cache
        //cleanupDevice();
        setTimeout(function () {
            // timeout is used to ensure that the GUI is updated instantly and the user gets sees a fresh login screen.
            cleanupDevice();
        }, 500);
        

    }else{
        MobiControlLog("Session timeout verify Cancel button - user pressed Cancel", "debug");
        
        setSessionState("loggedOut");
        init();
    }
}

/*
 * Updates '/sdcard/SOTI/lockdown.ini'-file with enrollment-state
 * 
 * Uses the script "/sdcard/SOTI/Lockdown/sotijs/enrollmentdone.cmd" to do so.
 * 
 * enrollstate: state of enrollment
 * 
 */
/*
function updateEnrollmentState(enrollstate){
    localStorage.setItem("enrollmentstate", enrollstate);
    MobiControlLog("Update enrollment state to: "+enrollstate, "debug");
    
    var txtFile = new XMLHttpRequest();

    var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/enrollmentdone.cmd";
   try{
        txtFile.addEventListener('load', function(e){
            var sotijs = txtFile.responseText;
        
            
        
            if(txtFile.responseText.length>10){ // if there is a file to load.. 
                
                var readyScript = "var enrollmentState = \""+macroJson[0].MODEL+"_"+enrollstate+"\"; "+txtFile.responseText;
                //var encodedScript =encodeURIComponent(readyScript);
                var req = executeMCscript(readyScript);
                console.log("exec req: '"+req+"'");
                if(req!=null){
                    req.addEventListener('loadend', function(e){
                        
                    });
                }
                
            }else{
                MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error");
                
            }
                
        });
        txtFile.open("GET", scriptPath, false);                           
        txtFile.send(null);
    }catch(e){
        MobiControlLog("error in enrollmentstate", "error");
    }
}*/


/*
 * Updates '/sdcard/SOTI/lockdown.ini'-file with enrollment-state
 * 
 * 
 * enrollstate: state of enrollment
 * 
 */

function updateEnrollmentState(enrollstate){
    console.log("updateEnrollmentState(enrollstate)");
    localStorage.setItem("enrollmentstate", enrollstate);
    MobiControlLog("Update enrollment state to: "+enrollstate, "debug");
    
    WriteToIni("ENROLLMENT", "STATE", macroJson[0].MODEL+"_"+enrollstate, path="/sdcard/SOTI/lockdown.ini")
    MobiControlLog("enrollment state 0-4: '"+enrollstate.substring(0,4)+"'", "debug");
    if(enrollstate.substring(0,4)=="done"){
        setTimeout(function () {
            mcCheckin();
        }, 1000);
           
    }
}






/*
 * Function to kill an app and clean its cache
 *
 * appToKill: app id to kill/clean eg. com.android.chrome
 * cleanApp: 0/1 - if 0 the app's data won't be cleared - 1 by default
 * 
 */
function killAndCleanApp(appToKill, cleanApp=1){
    MobiControlLog("killAndCleanApp: '"+appToKill+"'", "debug");

    var readyScript = "mobicontrol.app.stop('"+appToKill+"');";
    var req = executeMCscript(readyScript);
    console.log("exec req: '"+req+"'");
    if(req!=null){
        req.addEventListener('loadend', function(e){
            if(req.responseText=="true")
                MobiControlLog("App killed '"+appToKill+"'", "debug");
            else
                MobiControlLog("App NOT killed '"+appToKill+"' - Probably not installed", "debug");
            
        });
    }
    else
        MobiControlLog("Tried to run Soti JS script: '"+readyScript+"' but failes","error");
    if(cleanApp){
        var readyScript1 = "mobicontrol.app.clearData('"+appToKill+"');";
        var req1 = executeMCscript(readyScript1);
        console.log("exec req1: '"+req1+"'");
        if(req1!=null){
            req1.addEventListener('loadend', function(e){
                
                MobiControlLog("Data cleared from app '"+appToKill+"'", "debug"); 
            
            });
        }
        else
            MobiControlLog("Tried to run Soti JS script: '"+readyScript+"' but failes","error");
    }else
        MobiControlLog("Data NOT cleared from app '"+appToKill+"'", "debug"); 
}


/*
 * Deletes files on the device by calling "/sdcard/SOTI/Lockdown/sotijs/deleteFiles.cmd"
 * 
 * Deletes folders/files in shared storage - paths are defined in the script file.
 * 
 */
function deleteFilesOnLogout(){
    // Delete files and kill apps and wipe cache
    MobiControlLog("Deleting files on device");


    var txtFile = new XMLHttpRequest();

    var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/deleteFiles.cmd";
   
    txtFile.addEventListener('load', function(e){
        var sotijs = txtFile.responseText;
       
        
       
        if(txtFile.responseText.length>10){ // if there is a file to load.. 
            
            var readyScript = txtFile.responseText;
            var req = executeMCscript(readyScript);
            console.log("exec req: '"+req+"'");
            if(req!=null){
                
                req.addEventListener('loadend', function(e){
                    MobiControlLog("Files have been deleted", "debug");
                });
            }
            else
                MobiControlLog("Tried to run Soti JS script: '"+readyScript+"' but failes","error");
            
        }else{
            MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error");
            
        }
            
    });
    txtFile.open("GET", scriptPath, false);                           
    txtFile.send(null);
}


/*
 * cleans up the device
 * 
 * Kills all apps added to lockdown and cleans the cache
 * Deletes files in shared storage - defined in the script file.
 * 
 */
function cleanupDevice(){
    console.log("cleanupDevice()");
    deleteFilesOnLogout();
    var jsonPath = '/sdcard/SOTI/Lockdown/json/apps.json';
    var jsonFile = new XMLHttpRequest();
    jsonFile.addEventListener('loadend', function(e){

        var json = jsonFile.responseText;
        
        MobiControlLog("Cleaning up apps -  apps.json loaded", "debug");
        
        var myjson = JSON.parse(json);
        for(e=0;e<myjson.length;e++){
            var item = myjson[e];
            
            //MobiControlLog("Cleaning up apps - Stopping '" + item.appName + "': '"+item.packageName+"' and deleting it's app cache if not excluded", "debug");
                try{
                    if(item.cleanAppOnLogout=="0"){
                        var appName = item.appName;
                        var packageName = item.packageName;

                        MobiControlLog("Cleaning up apps - '" + item.appName + "': '"+item.packageName+"' excluded from wiping app cache, so just stopping app", "debug");
                        // don't delete the data from the app
                        if(item.broadcastIntentOnLogout!="none"){
                            MobiControlLog("Cleaning up apps - '" + item.appName + "': '"+item.packageName+"' broadcasting intent: '"+item.broadcastIntentOnLogout+"'", "debug");
                            var script_path = '/sdcard/SOTI/Lockdown/sendIntent.cmd';
                            var content = "sendintent -b \\\"intent:#Intent;action="+item.broadcastIntentOnLogout+";component="+item.packageName+";end\\\"";
                            try{
                                var req = fileWrite(content, script_path);
                                if(req!=null){
                
                                    req.addEventListener('loadend', function(e){
                                        MobiControlLog("Cleaning up apps - sendintent script created");
                                        runScript("/sdcard/SOTI/Lockdown/sendIntent.cmd");
                                        MobiControlLog("Device is clean");
                                        setTimeout(function () {
                                            MobiControlLog("Cleaning up apps - killing '"+appName+"'");
                                            killAndCleanApp(packageName, 0);
                                        }, 1000);
                                        
                                    });
                                }
                            }catch(e){
                                MobiControlLog("Error - '" + e+"' when creating a file", "warn");
                            }
                            
                        }
                    }else{
                        killAndCleanApp(item.packageName);
                    }
                }catch(e){
                    MobiControlLog("Error - App '" + item.appName + "': '"+item.packageName+"' might not be installed", "warn");
                }
            
        }
  
    });
    jsonFile.open("GET", jsonPath, false);                           
    jsonFile.send(null);
}


// creates a file (/writes to a file) and returns the request to enable the caller to wait for completion.
function fileWrite(content, path){
    console.log("fileWrite");
    var script = "var file = new mobicontrol.io.File('"+path+"'); file.writeText('"+content+"');";
    return executeMCscript(script);
}


function updateSessionStateTime(){
    console.log("updateSessionStateTime");
        isScreenActive();
        //MobiControlLog("update timer state to: "+timerstate);
        var state = getSessionState();
        if(state!="stop_timer"){
            if(myTimeout!=0){
                clearTimeout(myTimeout);
                myTimeout=0;
            }
            myTimeout = setTimeout(function () {
                updateSessionStateTime();
            }, SessionCheckTimeInMillis);
        }
        else{
            stopTimer();
        }
    
    
}

function stopTimer(){
MobiControlLog("Stopping timer - myTimeout: '"+myTimeout+"'", "debug");
    if(myTimeout!=0){
        clearTimeout(myTimeout);
        myTimeout=0;
    }
}

/*
 * login() is called when clicking the Login/logout-button in the bottom-right corner
 * 
 * If called in OTG_LITE - logout(true) is called
 * If called in Shared device mode, SOTI Shared Device login/logout activity is called
 */
function login(){
    var first_elm = appsPlaceHolder[0];
    if(first_elm=="OTG_LITE"){
        logout(true);
    }else
        window.open("Launch://net.soti.mobicontrol.androidwork/net.soti.mobicontrol.shareddevice.SharedDeviceActivity");
}

/*
 * Executed when clicking the device-info-button
 * 
 */
function showDeviceInfo() {
    var x = document.getElementById("device-info-popup"); 
    if (x.style.display === "none") { 
        x.style.display = "block"; 
    } else {
        x.style.display = "none"; 
    } 
}

/*
 * Executed when clicking the device-info-popup
 * 
 */
$("#device-info-popup").click(function(){
    console.log("clicked device info");
    //testDownload();
    //downloadWithProgress();
    //alert(screen.width);
    //updateEnrollmentState("done_"+macroJson[0].DeviceGroup);
    $(this).hide();

    if( appsPlaceHolder[0]=="PIN")
        localStorage.setItem("state", "");
});




// ########    EVENT LISTENERS   ########
// Used to catch inputs - either from button or ENTER depending on which field is in focus

pincodeinput.addEventListener('input', (event) => {
    if(event.target.value.length>3){
        document.querySelector('#ok-button').disabled = false;
    }else{
        document.querySelector('#ok-button').disabled = true;
    }
});

pincodeinput.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("ok-button").click();
    }
});

usernameinput.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // move focus to next field
        document.getElementById("pincode").focus();
    }
});

companyinput.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // move focus to next field
        document.getElementById("username").focus();
        
    }
});

const form = document.getElementById('pin-input');

form.addEventListener('focus', (event) => {
    document.getElementById("device-info-button").style.display = "none";
}, true);

form.addEventListener('blur', (event) => {
    document.getElementById("device-info-button").style.display = "block";
  }, true);

/*
 * Function called from clicking the OK button in the pin prompt (or user registration popup) 
 *
 * If in Shared Device login mode first element in lockdown menu items is called 'PIN'
 * This is used to define whether or not to call submitPIN(true) or submitPIN(false).
 * 
 */
function submitMyPIN(){
    MobiControlLog("user clicked OK to PIN", "debug");
    if(appsPlaceHolder[0]!="PIN"){
        // e.g. if run from OTG_LITE setup
        MobiControlLog("submit pin from OTG LITE", "debug");
        submitPIN(false);
    }else{
        MobiControlLog("submit pin from PIN", "debug");
        submitPIN(true);

    }
    
}

/*
 * Submits the entered PIN from pincodeinput = document.querySelector("#pincode");
 *
 * bDevicePin: boolean 
 *      - true  - Shared device setup with SOTI shared device login. Ends with a messagebox notifying the user to wait
 *      - false - OTG lite setup
 */
function submitPIN(bDevicePin){
    var userPin = pincodeinput.value;
    
    var storedPin=getUserPin();
    MobiControlLog("getUserPin= '"+storedPin+"' - entered userPin= '"+userPin+"'","debug",false);
    
    if(storedPin==""||storedPin==null){
        MobiControlLog("SubmitPin #1 - There is no PIN set - setting it", "debug");
        // only for OTG LITE mode
        if((usernameinput.value.length>2&&companyinput.value.length>1)||appsPlaceHolder[0]!="OTG_LITE"){
            document.getElementById("pin-label").innerHTML  = reEnterPinMsg;
            localStorage.setItem("state", "PIN1");
            document.getElementById("pincode").value = "";
            document.getElementById("pincode").focus();
            // document.querySelector('#pincode-button').disabled = true;
            document.querySelector('#ok-button').disabled = true;
            userInput = userPin;
            setUserPin(userPin);
            document.getElementById("username").style.background = '';
            document.getElementById("company").style.background = '';
        }
        else{
            if(usernameinput.value.length<3){
                document.getElementById("username").style.background = 'pink';
                document.getElementById("username").focus();
            }else
                document.getElementById("username").style.background = '';
            
            if(companyinput.value.length<2){
                document.getElementById("company").style.background = 'pink';
                document.getElementById("company").focus();
            }else
                document.getElementById("company").style.background = '';
        }
    }else if(userPin == getUserPin()){
        MobiControlLog("User entered the same pin", "debug");

        // Empty the PIN field
        document.getElementById("pin-input").style.display = "none";
        
        localStorage.setItem("state", "PIN-SET");
        if(bDevicePin){
            MobiControlLog("Submit PIN - shared device setup", "debug");
            document.getElementById("messagebox").innerHTML  = pinEnteredMsg ;
            document.getElementById("messagebox").style.display = "block";
            document.getElementById("ok-button").style.display = "none"; 
            setUserPin("");
            resetPin(userInput);
        }else{
            MobiControlLog("Submit PIN - OTG_LITE setup", "debug");
            
            // close the popup
            document.getElementById("popup").style.display = "none";

            if(getLockdownState()!="ENTER_PIN"){
                MobiControlLog("SubmitPin #2 - We are not in ENTER_PIN - setting user PIN to the input", "debug");
                setUserPin(userInput);
                setUserName(usernameinput.value);
                WriteToIni("USER", "username", usernameinput.value);
                setCompany(companyinput.value);
                WriteToIni("USER", "company", companyinput.value);
                WriteToIni("USER", "lastchange", getTimeStamp(new Date()));
                mcCheckin();

                // show Logout button in the bottom right corner on the device
                document.getElementById("login-button").style.display = "block"; 
                
                MobiControlLog("User: '"+usernameinput.value+"' from company: '"+companyinput.value+"' logged in");
            }
            setLockdownState("LOGGED_IN");
            setSessionState("sessionRunning");
            init();
        }
    }else{
        var lockdownstate =getLockdownState();
        if(lockdownstate!="ENTER_PIN"){
            MobiControlLog("not in ENTER_PIN mode - user entered wrong PIN - prompt again and reset PIN", "debug");
            document.getElementById("pin-label").innerHTML  = pinEnteredRetryMsg;
            setUserPin("");
        }else
            document.getElementById("pin-label").innerHTML  = pinEnteredRetryLoggedInMsg
        localStorage.setItem("state", "PIN_RETRY");
        document.getElementById("pincode").value = "";
        document.getElementById("pincode").focus();
       // document.querySelector('#pincode-button').disabled = true;
        document.querySelector('#ok-button').disabled = true;
        userInput = "";
        
    }
    
}

/*
 * resetPin() is used to setup a new Android Device PIN
 * It uses the resetpw.cmd script to generate a SOTI legacy script file containing the new pin code - resetpw.cmd waits 3 seconds before deleting that file again
 * after the script file is generated, it is run from this function.
 *
 */
function resetPin(pincode = "deletescript"){
    var txtFile = new XMLHttpRequest();

    var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/resetpw.cmd";
    
    MobiControlLog("Open script: '"+scriptPath+"'","debug");
    txtFile.addEventListener('loadend', function(e){

        var pin = pincode;
        var encodedPin="";
        // we only reset pin if it exists
        if(pincode!=null)
            encodedPin = "var pin='"+ pincode +"'; ";

        if(txtFile.responseText.length>10){ // if there is a file to load.. 
            
            var readyScript = encodedPin+txtFile.responseText;
            executeMCscript(readyScript);
            
            setTimeout(messageUserResetPin,3000);
        }else{
            MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error");
            localStorage.setItem("state", "");
            document.getElementById("pin-prompt").style.display = "block"; 
            document.getElementById("pin-label").innerHTML  = errorEnterPinMsg;
            document.getElementById("pincode").focus();
            document.getElementById("messagebox").style.display = "none";
        }
            
    });
    txtFile.addEventListener('error', function(e){
        MobiControlLog("Tried to open script: '"+scriptPath+"' but an error occurs","error");
        switch(txtFile.readyState){
            case 0:
                MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
                break;
            case 1:
                MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
                break;
            case 2:
                MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
                break;
            case 3:
                MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
                break;
            case 4:
                MobiControlLog("Readystate when opening script file: 4 - 'Request finished and respose is ready'","info");
                switch(txtFile.status){
                    case 200:
                        MobiControlLog("status when opening script file: 200 - 'OK'","info");
                        break;
                    case 403:
                        MobiControlLog("status when opening script file: 403 - 'Forbidden'","error");
                        break;
                    case 404:
                        MobiControlLog("status when opening script file: 404 - 'Not Found'","error");
                        break;
                    default:
                        MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error");
                }
                break;
            default:
                MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn");
        }
    });
    txtFile.onreadystatechange = function() {
        MobiControlLog(" Readystate: '"+txtFile.readyState+"' - Status: '"+txtFile.status+"'","debug");
    switch(txtFile.readyState){
        case 0:
            MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
            break;
        case 1:
            MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
            break;
        case 2:
            MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
            break;
        case 3:
            MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
            break;
        case 4:
            MobiControlLog("Readystate when opening script file: 4 - 'Request finished and response is ready'","debug");
            switch(txtFile.status){
                case 200:
                    MobiControlLog("status when opening script file: 200 - 'OK'","debug");
                
                    break;
                case 403:
                    MobiControlLog("status when opening script file: 403 - 'Forbidden'","error");
                    break;
                case 404:
                    MobiControlLog("status when opening script file: 404 - 'Not Found'","error");
                    break;
                default:
                    MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error");
            }
            break;
        default:
            MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn");
        }
    }
    txtFile.open("GET", scriptPath, false);                           
    txtFile.send(null);
}

function messageUserResetPin(){
    document.getElementById("messagebox").innerHTML  = msgText;
    runScript("/sdcard/resetpin.cmd");
}

// Runs a SOTI legacy script as a file
// the parameter 'script' is a path to the script
function runScript(script){
    MobiControlLog("running script: '"+script+"'","debug");
    window.open("Script://"+script);
}

/*
 * SOTI MobiControl logging functionality
 * msg: the text to write to the MC log
 * type: the type of log in MC (info, warn, error) where info is default. 
 *       If the type is set to "debug" it will only write to MC log if debug_mode is set to true for the device in MC
 * logtofile: default is true but a false makes sure it doesn't writes to log 
 * 
 * 
*/ 
function MobiControlLog(msg, type="info",logtofile=true){
    console.log(msg);
    var log = true;
    var script = "mobicontrol.log";
    switch(type){
        case "error":
            script=script+".error";
            break;
        case "warn":
            script=script+".warn";
            break;
        case "debug":
            if(!debugmode)
                log=false;
            else
                script=script+".info";
            break;
        default:
            script=script+".info";
        
    }
    var script = script+"(\""+msg+"\");";
    if(log)
        executeMCscript(script);
    if(logtofile){
        try{
            LogToFile(msg, type, path="/sdcard/SOTI/Lockdown/lockdownLog.txt");
        }catch(e){
            console.log(e);
        }
    }
}
/*
 * Writes text to a logfile
 * msg: the text to write to the log file
 * type: the type of log (free-text) where info is default. 
 * path: where to log to - default is "/sdcard/SOTI/Lockdown/lockdownLog.txt"
 * 
 */
function LogToFile(msg, type="info", path="/sdcard/SOTI/Lockdown/lockdownLog.txt"){
    console.log("write to file: "+msg);
    try{
    var log = true;
    var encodedMsg = "";
    switch(type){
        case "error":
            encodedMsg="error - "+msg;
            break;
        case "warn":
            encodedMsg="warn - "+msg;
            break;
        case "debug":
           /* if(!debugmode)
                log=false;
            else*/
                encodedMsg="debug - "+msg;
            break;
        default:
            encodedMsg="info - "+msg;
        
    }
    
    if(log){
        var txtFile = new XMLHttpRequest();

        var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/writetolog.cmd";
        
        
        txtFile.addEventListener('loadend', function(e){
            
            if(txtFile.responseText.length>10){ // if there is a file to load.. 
               
                var scriptParm = "writeToLog(\""+encodedMsg+"\", \""+path+"\"); ";
                var readyScript = scriptParm+txtFile.responseText;
                executeMCscript(readyScript);

            }else{
                MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error",false);
            }     
        });
        txtFile.addEventListener('error', function(e){
            MobiControlLog("Tried to open script: '"+scriptPath+"' but an error occurs","error",false);
            switch(txtFile.readyState){
                case 0:
                    //MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
                    break;
                case 1:
                    //MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
                    break;
                case 2:
                    //MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
                    break;
                case 3:
                    //MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
                    break;
                case 4:
                    //MobiControlLog("Readystate when opening script file: 4 - 'Request finished and respose is ready'","debug");
                    switch(txtFile.status){
                        case 200:
                            //MobiControlLog("status when opening script file: 200 - 'OK'","debug");
                            break;
                        case 403:
                            MobiControlLog("status when opening script file: 403 - 'Forbidden'","error",false);
                            break;
                        case 404:
                            MobiControlLog("status when opening script file: 404 - 'Not Found'","error",false);
                            break;
                        default:
                            MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error",false);
                    }
                    break;
                default:
                    MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn",false);
            }
        });
        txtFile.onreadystatechange = function() {
        switch(txtFile.readyState){
            case 0:
                //MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
                break;
            case 1:
                //MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
                break;
            case 2:
                //MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
                break;
            case 3:
                //MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
                break;
            case 4:
                //MobiControlLog("Readystate when opening script file: 4 - 'Request finished and response is ready'","debug");
                switch(txtFile.status){
                    case 200:
                        //MobiControlLog("status when opening script file: 200 - 'OK'","debug");
                    
                        break;
                    case 403:
                        MobiControlLog("status when opening script file: 403 - 'Forbidden'","error",false);
                        break;
                    case 404:
                        MobiControlLog("status when opening script file: 404 - 'Not Found'","error",false);
                        break;
                    default:
                        MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error",false);
                }
                break;
            default:
                MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn",false);
            }
        }
        txtFile.open("GET", scriptPath, false);                           
        txtFile.send(null);
    }
}catch(e){console.log(e);}
}



/*
 * Writes text to a ini file
 * section: the section to write to the file - []
 * item: the item name
 * value: the value to the item 
 * path: where to write to - default is "/sdcard/SOTI//lockdown.ini"
 * 
 */
function WriteToIni(section, item, value, path="/sdcard/SOTI/lockdown.ini"){
    MobiControlLog("write to ini file: path:'"+path+"' - Section: ["+section+"] - item: '"+item+"'= '"+value+"'", "debug");
   
    try{
    var txtFile = new XMLHttpRequest();

    var scriptPath = "/sdcard/SOTI/Lockdown/sotijs/writetoinifile.cmd";
    
    //MobiControlLog("Open script: '"+scriptPath+"'","debug");
    txtFile.addEventListener('loadend', function(e){
        //MobiControlLog("Logging msg to file: '"+path+"'","debug",false);
        if(txtFile.responseText.length>10){ // if there is a file to load.. 
            //MobiControlLog("msg contains more than 10 chars - logging to '"+path+"'","debug",false);
            // calling function WriteToIni(section, item, value, iniPath)
            var scriptParm = "WriteToIni(\""+section+"\", \""+item+"\", \""+value+"\", \""+path+"\"); ";
            //alert(scriptParm);
            var readyScript = scriptParm+txtFile.responseText;
            executeMCscript(readyScript);

        }else{
            MobiControlLog("Tried to open script: '"+scriptPath+"' but file is either missing or less than 10 char","error",false);
        }     
    });
    txtFile.addEventListener('error', function(e){
        MobiControlLog("Tried to open script: '"+scriptPath+"' but an error occurs","error",false);
        switch(txtFile.readyState){
            case 0:
                //MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
                break;
            case 1:
                //MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
                break;
            case 2:
                //MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
                break;
            case 3:
                //MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
                break;
            case 4:
                //MobiControlLog("Readystate when opening script file: 4 - 'Request finished and respose is ready'","debug");
                switch(txtFile.status){
                    case 200:
                        //MobiControlLog("status when opening script file: 200 - 'OK'","debug");
                        break;
                    case 403:
                        MobiControlLog("status when opening script file: 403 - 'Forbidden'","error",false);
                        break;
                    case 404:
                        MobiControlLog("status when opening script file: 404 - 'Not Found'","error",false);
                        break;
                    default:
                        MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error",false);
                }
                break;
            default:
                MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn",false);
        }
    });
    txtFile.onreadystatechange = function() {
        //allText =allText+" Readystate: '"+txtFile.readyState+"' - Status: '"+txtFile.status+"'";
        //MobiControlLog(" Readystate: '"+txtFile.readyState+"' - Status: '"+txtFile.status+"'","debug");
    switch(txtFile.readyState){
        case 0:
            //MobiControlLog("Readystate when opening script file: 0 - 'request not initialized'","warn");
            break;
        case 1:
            //MobiControlLog("Readystate when opening script file: 1 - 'Server connection established'","warn");
            break;
        case 2:
            //MobiControlLog("Readystate when opening script file: 2 - 'request received'","warn");
            break;
        case 3:
            //MobiControlLog("Readystate when opening script file: 3 - 'Processing request'","warn");
            break;
        case 4:
            //MobiControlLog("Readystate when opening script file: 4 - 'Request finished and response is ready'","debug");
            switch(txtFile.status){
                case 200:
                    //MobiControlLog("status when opening script file: 200 - 'OK'","debug");
                
                    break;
                case 403:
                    MobiControlLog("status when opening script file: 403 - 'Forbidden'","error",false);
                    break;
                case 404:
                    MobiControlLog("status when opening script file: 404 - 'Not Found'","error",false);
                    break;
                default:
                    MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error",false);
            }
            break;
        default:
            MobiControlLog("Readystate when opening script file: '"+txtFile.readyState+"' - 'Not known...'","warn",false);
        }
    }
    txtFile.open("GET", scriptPath, false);                           
    txtFile.send(null);
    }catch(e){
        console.log(e);
    }

}

// checkin to MobiControl using SOTIjs script
function mcCheckin(){
    MobiControlLog("MobiControl checkin");
    var script = "mobicontrol.agent.checkIn();";
    
    executeMCscript(script);
}

// checkin to MobiControl using SOTIjs script
function startApp(app, app_class){
    MobiControlLog("starting app");
    var script = "mobicontrol.app.start('"+app+"', '"+app_class+"');";
  
    executeMCscript(script);
}



// checkin to MobiControl using SOTIjs script
function stopApp(app, app_class){
    MobiControlLog("stopping app");
    var script = "mobicontrol.app.stop('"+app+"', '"+app_class+"');";
  
    executeMCscript(script);
}

/*
 * Executes Soti JS
 *
 * script: the full script to run.
 * 
 */
function executeMCscript(script){
    
    try{
        var request = new XMLHttpRequest();
        var encodedScript = encodeURIComponent(script);
        request.open("GET", "mcscript://"+encodedScript);
        request.send();
        return request;
    }catch(e){
        MobiControlLog("executeMCscript() error - maybe '"+script+"' is not available", "error");
        return null;
    }
   
}


/*
 * Returns a string with a time stamp
 *
 * time: the time object that needs to be transferred into a time stamp string
 * 
 */
function getTimeStamp(time) {
    //var now = time;
    return (time.getFullYear() + '-' +
			(((time.getMonth()+1) < 10)
                 ? ("0" + (time.getMonth()+1))
                 : ((time.getMonth()+1))) + '-' +
			((time.getDate() < 10)
                 ? ("0" + time.getDate())
                 : (time.getDate())) + '_' +
            ((time.getHours() < 10)
                 ? ("0" + time.getHours())
                 : (time.getHours())) + ':' +
            ((time.getMinutes() < 10)
                 ? ("0" + time.getMinutes())
                 : (time.getMinutes())) + ':' +
            ((time.getSeconds() < 10)
                 ? ("0" + time.getSeconds())
                 : (time.getSeconds())));
}



function testDownload(){
    var txtFile = new XMLHttpRequest();

    var filePathlarge = "https://sorbfilmdgia001.orb.biz/tempfilelarge.tmp";
    var filePathsmall = "https://sorbfilmdgia001.orb.biz/tempfilesmall.tmp";
    
    MobiControlLog("open file: '"+filePathlarge+"'","info");
    txtFile.addEventListener('loadend', function(e){
        MobiControlLog("loadend","info");
        if(txtFile.responseText.length>10){ // if there is a file to load.. 
            MobiControlLog("loadend - length is above 10","info");
            MobiControlLog("open file: '"+filePathlarge+"' - length: '"+txtFile.responseText.length+"'");
        }else{
            MobiControlLog("loadend - length is under 10","info");
            MobiControlLog("Tried to open file: '"+filePathlarge+"' but file is either missing or less than 10 char","error");

        }
            
    });
    txtFile.addEventListener('error', function(e){
        MobiControlLog("Tried to open script: '"+filePathlarge+"' but an error occurs","error");
        switch(txtFile.readyState){
            case 0:
                MobiControlLog("Readystate when opening  file: 0 - 'request not initialized'","warn");
                break;
            case 1:
                MobiControlLog("Readystate when opening  file: 1 - 'Server connection established'","warn");
                break;
            case 2:
                MobiControlLog("Readystate when opening  file: 2 - 'request received'","warn");
                break;
            case 3:
                MobiControlLog("Readystate when opening  file: 3 - 'Processing request'","warn");
                break;
            case 4:
                MobiControlLog("Readystate when opening  file: 4 - 'Request finished and respose is ready'","info");
                switch(txtFile.status){
                    case 200:
                        MobiControlLog("status when opening  file: 200 - 'OK'","info");
                        break;
                    case 403:
                        MobiControlLog("status when opening  file: 403 - 'Forbidden'","error");
                        break;
                    case 404:
                        MobiControlLog("status when opening  file: 404 - 'Not Found'","error");
                        break;
                    default:
                        MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error");
                }
                break;
            default:
                MobiControlLog("Readystate when opening  file: '"+txtFile.readyState+"' - 'Not known...'","warn");
        }
    });
    txtFile.onreadystatechange = function() {
        MobiControlLog(" Readystate: '"+txtFile.readyState+"' - Status: '"+txtFile.status+"'","info");
    switch(txtFile.readyState){
        case 0:
            MobiControlLog("Readystate when opening  file: 0 - 'request not initialized'","warn");
            break;
        case 1:
            MobiControlLog("Readystate when opening  file: 1 - 'Server connection established'","warn");
            break;
        case 2:
            MobiControlLog("Readystate when opening  file: 2 - 'request received'","warn");
            break;
        case 3:
            MobiControlLog("Readystate when opening  file: 3 - 'Processing request'","warn");
            break;
        case 4:
            MobiControlLog("Readystate when opening  file: 4 - 'Request finished and response is ready'","info");
            switch(txtFile.status){
                case 200:
                    MobiControlLog("status when opening  file: 200 - 'OK'","info");
                
                    break;
                case 403:
                    MobiControlLog("status when opening script file: 403 - 'Forbidden'","error");
                    break;
                case 404:
                    MobiControlLog("status when opening script file: 404 - 'Not Found'","error");
                    break;
                default:
                    MobiControlLog("Status is '"+txtFile.status+"' - Not known - look up here: https://www.w3schools.com/tags/ref_httpmessages.asp","error");
            }
            break;
        default:
            MobiControlLog("Readystate when opening  file: '"+txtFile.readyState+"' - 'Not known...'","warn");
        }
    }
    txtFile.open("GET", filePathlarge, false);                           
    txtFile.send(null);    
}

function roundNumber(numb){
    return Math.round((numb + Number.EPSILON) * 100) / 100;
}

function downloadWithProgress() {

    
    var filePathlarge = "https://sorbfilmdgia001.orb.biz/tempfilelarge.tmp";
    var filePathsmall = "https://sorbfilmdgia001.orb.biz/tempfilesmall.tmp";

    var  IMG_URL = filePathlarge;

    const startTime = new Date().getTime();
  
    request = new XMLHttpRequest();
  
    request.responseType = "blob";
    request.open("get", IMG_URL, true);
    request.send();
  
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            LogToFile("Done downloading file", "info", path="/sdcard/SOTI/Lockdown/download_test.txt");
            const imageURL = window.URL.createObjectURL(this.response);
            LogToFile("Downloaded file URL: '"+imageURL+"' - File_name: '"+FILE_NAME+"'", "info", path="/sdcard/SOTI/Lockdown/download_test.txt");
            MobiControlLog("Downloaded file URL: '"+imageURL+"' - File_name: '"+FILE_NAME+"'","warn");
            const anchor = document.createElement("a");
            anchor.href = imageURL;
            anchor.download = FILE_NAME;
            document.body.appendChild(anchor);
            anchor.click();
        }
    };
  
    request.onprogress = function (e) {
        const percent_complete = Math.floor((e.loaded / e.total) * 100);
  
        const duration = (new Date().getTime() - startTime) / 1000;
        const bps = e.loaded / duration;
  
        const kbps = Math.floor(bps / 1024);
      
        const time = (e.total - e.loaded) / bps;
        const seconds = Math.floor(time % 60);
        const minutes = Math.floor(time / 60);
        var size=0;
        if(e.total<1000000)
            size = roundNumber(e.total/1000) +" kB";
        else
            size = roundNumber(e.total/1000000) +" MB";
        var msg = percent_complete+"% of "+size+" - "+kbps+" Kbps - "+minutes+" min "+seconds+" sec remaining";
        LogToFile(msg, "info", path="/sdcard/SOTI/Lockdown/download_test.txt");
    };
}
