/*
 * @project: TERA
 * @version: Development (beta)
 * @copyright: Yuriy Ivanov 2017-2018 [progr76@gmail.com]
 * @license: Not for evil
 * GitHub: https://github.com/terafoundation/wallet
 * Twitter: https://twitter.com/terafoundation
 * Telegram: https://web.telegram.org/#/im?p=@terafoundation
*/

"use strict";
var fs = require("fs");
const ZIP = require("zip");
const FORMAT_EVAL_SEND = "{MaxBlockNum:uint,Code:str,Sign:arr64}";
module.exports = class CCode extends require("./base")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        if(!global.ADDRLIST_MODE && !this.VirtualMode)
        {
            setInterval(this.CheckLoadCodeTime.bind(this), 10 * 1000)
        }
        this.LastEvalCodeNum = 0
        CheckCreateDir(GetDataPath("Update"))
    }
    CheckLoadCodeTime()
    {
        if(START_LOAD_CODE.StartLoadNode && START_LOAD_CODE.StartLoadVersionNum)
        {
            var Delta = new Date() - START_LOAD_CODE.StartLoadVersionNumTime;
            if(Delta > 20 * 1000)
            {
                ToError("Cannot load code version:" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + START_LOAD_CODE.StartLoadNode.ip + ":" + START_LOAD_CODE.StartLoadNode.port)
                this.ClearLoadCode()
            }
        }
    }
    ClearLoadCode()
    {
        START_LOAD_CODE.StartLoad = undefined
        START_LOAD_CODE.StartLoadVersionNum = 0
        START_LOAD_CODE.StartLoadVersionNumTime = 0
    }
    StartLoadCode(Node, CodeVersion)
    {
        var VersionNum = CodeVersion.VersionNum;
        START_LOAD_CODE.StartLoad = CodeVersion
        START_LOAD_CODE.StartLoadNode = Node
        START_LOAD_CODE.StartLoadVersionNum = VersionNum
        START_LOAD_CODE.StartLoadVersionNumTime = new Date()
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            this.UseCode(VersionNum, false)
            return ;
        }
        var Context = {"VersionNum":VersionNum};
        this.SendF(Node, {"Method":"GETCODE", "Context":Context, "Data":VersionNum})
    }
    static
    GETCODE_F()
    {
        return "uint";
    }
    GETCODE(Info)
    {
        var VersionNum = this.DataFromF(Info);
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            var data = fs.readFileSync(fname);
            this.Send(Info.Node, {"Method":"RETCODE", "Context":Info.Context, "Data":data}, BUF_TYPE)
        }
    }
    RETCODE(Info)
    {
        var VersionNum = Info.Context.VersionNum;
        if(!VersionNum || !START_LOAD_CODE.StartLoad)
            return ;
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(!fs.existsSync(fname))
        {
            var Hash = shaarr(Info.Data);
            if(CompareArr(Hash, START_LOAD_CODE.StartLoad.Hash) === 0)
            {
                var file_handle = fs.openSync(fname, "w");
                fs.writeSync(file_handle, Info.Data, 0, Info.Data.length)
                fs.closeSync(file_handle)
                this.UseCode(VersionNum, global.USE_AUTO_UPDATE)
            }
            else
            {
                ToError("Error check hash of version code :" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + Info.Node.ip + ":" + Info.Node.port)
                this.ClearLoadCode()
                this.AddCheckErrCount(Info.Node, 1, "Error check hash of version code")
            }
        }
    }
    UseCode(VersionNum, bRestart)
    {
        if(bRestart)
        {
            UpdateCodeFiles(VersionNum)
        }
        if(global.START_LOAD_CODE.StartLoad)
        {
            global.CODE_VERSION = START_LOAD_CODE.StartLoad
            this.ClearLoadCode()
        }
    }
    SetNewCodeVersion(Data, PrivateKey)
    {
        var fname = GetDataPath("ToUpdate/wallet.zip");
        if(fs.existsSync(fname))
        {
            var fname2 = GetDataPath("Update/wallet-" + Data.VersionNum + ".zip");
            if(fs.existsSync(fname2))
            {
                fs.unlinkSync(fname2)
            }
            var data = fs.readFileSync(fname);
            var Hash = shaarr(data);
            var file_handle = fs.openSync(fname2, "w");
            fs.writeSync(file_handle, data, 0, data.length)
            fs.closeSync(file_handle)
            var SignArr = arr2(Hash, GetArrFromValue(Data.VersionNum));
            var Sign = secp256k1.sign(shabuf(SignArr), PrivateKey).signature;
            global.CODE_VERSION = Data
            global.CODE_VERSION.Hash = Hash
            global.CODE_VERSION.Sign = Sign
            return "OK Set new code version=" + Data.VersionNum;
        }
        else
        {
            return "File not exist: " + fname;
        }
    }
    SendECode(Data, Node)
    {
        var MaxBlockNum = GetCurrentBlockNumByTime();
        Data.MaxBlockNum = MaxBlockNum + Data.DeltaBlockNum
        var Arr = BufLib.GetBufferFromObject(Data, FORMAT_EVAL_SEND, 65000, {});
        var Arr2 = Arr.slice(0, Arr.length - 64);
        Data.Sign = GetArrFromHex(WALLET.GetSignFromArr(Arr2, 0))
        this.SendF(Node, {"Method":"EVAL", "Data":Data}, 65000)
    }
    static
    EVAL_F()
    {
        return FORMAT_EVAL_SEND;
    }
    EVAL(Info)
    {
        if(!global.USE_AUTO_UPDATE)
            return ;
        var Data = this.DataFromF(Info);
        ToLog("Get eval code: " + Data.MaxBlockNum)
        if(Data.MaxBlockNum < GetCurrentBlockNumByTime() || Data.MaxBlockNum <= this.LastEvalCodeNum)
        {
            this.AddCheckErrCount(Info.Node, 1)
            ToLog("No run old eval code: " + Data.MaxBlockNum)
            return ;
        }
        this.LastEvalCodeNum = Data.MaxBlockNum
        var Arr = Info.Data.slice(0, Info.Data.length - 64);
        if(!CheckDevelopSign(Arr, Data.Sign))
        {
            this.AddToBan(Info.Node, "ERR DEVELOPSIGN")
            return ;
        }
        try
        {
            eval(Data.Code)
        }
        catch(e)
        {
            this.AddCheckErrCount(Info.Node, 1)
            ToLog(e)
        }
    }
};

function UpdateCodeFiles(StartNum)
{
    var fname = GetDataPath("Update");
    if(!fs.existsSync(fname))
        return 0;
    var arr = fs.readdirSync(fname);
    var arr2 = [];
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i].substr(0, 7) === "wallet-")
        {
            arr2.push(parseInt(arr[i].substr(7)));
        }
    }
    arr2.sort(function (a,b)
    {
        return a - b;
    });
    for(var i = 0; i < arr2.length; i++)
    {
        var Num = arr2[i];
        var Name = "wallet-" + Num + ".zip";
        var Path = fname + "/" + Name;
        ToLog("Check file:" + Name);
        if(fs.existsSync(Path))
        {
            if(StartNum === Num)
            {
                ToLog("UnpackCodeFile:" + Name);
                UnpackCodeFile(Path);
                global.RestartNode();
                return 1;
            }
            else
            {
                ToLog("Delete old file update:" + Name);
                fs.unlinkSync(Path);
            }
        }
    }
    return 0;
};

function UnpackCodeFile(fname)
{
    var data = fs.readFileSync(fname);
    var reader = ZIP.Reader(data);
    reader.forEach(function (entry)
    {
        var Name = entry.getName();
        var Path = GetCodePath(Name);
        if(entry.isFile())
        {
            var buf = entry.getData();
            CheckCreateDir(Path, true, true);
            var file_handle = fs.openSync(Path, "w");
            fs.writeSync(file_handle, buf, 0, buf.length);
            fs.closeSync(file_handle);
        }
        else
        {
        }
    });
    reader.close();
};
global.RestartNode = function RestartNode()
{
    global.NeedRestart = 1;
    var it = SERVER.ActualNodes.iterator(), Node;
    while((Node = it.next()) !== null)
    {
        if(Node.Socket)
            CloseSocket(Node.Socket, "Restart");
    }
    SERVER.StopServer();
    SERVER.StopNode();
    RunStopPOWProcess("STOP");
    ToLog("****************************************** RESTART!!!");
    console.log("EXIT 1");
    setTimeout(function ()
    {
        console.log("EXIT 2");
        if(global.nw)
        {
            ToLog("RESTART NW");
            var StrRun = '"' + process.argv[0] + '" .\n';
            StrRun += '"' + process.argv[0] + '" .\n';
            SaveToFile("run-next.bat", StrRun);
            const child_process = require('child_process');
            child_process.exec("run-next.bat", {shell:true});
        }
        console.log("EXIT 3");
        process.exit(0);
    }, 5000);
};
