
nw.Window.open('./HTML/wallet.html',
    {
        width: 840,
        height: 1000,
        icon: "../HTML/PIC/wallet.png",
    }, function(win)
    {
        //win.showDevTools();
    });

if(!global.DATA_PATH || global.DATA_PATH==="")
    global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();


global.START_IP="";
global.START_PORT_NUMBER = 30000;
global.CREATE_ON_START=0;

global.LOCAL_RUN=0;
require('./core/run-server');
