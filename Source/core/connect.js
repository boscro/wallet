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
const RBTree = require('bintrees').RBTree;
const crypto = require('crypto');
const CNode = require("./node");
global.PERIOD_FOR_RECONNECT = 3600 * 1000;
global.CHECK_DELTA_TIME = {Num:0, bUse:0, StartBlockNum:0, EndBlockNum:0, bAddTime:0, DeltaTime:0, Sign:[]};
global.CHECK_POINT = {BlockNum:0, Hash:[], Sign:[]};
global.CODE_VERSION = {BlockNum:0, addrArr:[], LevelUpdate:0, BlockPeriod:0, VersionNum:UPDATE_CODE_VERSION_NUM, Hash:[], Sign:[],
    StartLoadVersionNum:0};
global.START_LOAD_CODE = {};
const MAX_PERIOD_GETNODES = 120 * 1000;
const MAX_PERIOD_PING = 120 * 1000;
var MAX_PING_FOR_CONNECT = 200;
var MAX_TIME_CORRECT = 3 * 3600 * 1000;
global.MAX_WAIT_PERIOD_FOR_HOT = 4 * CONSENSUS_PERIOD_TIME;
const PERIOD_FOR_START_CHECK_TIME = 300;
module.exports = class CConnect extends require("./transfer-msg")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        this.StartTime = (new Date()) - 0
        this.WasNodesSort = false
        this.LevelNodes = []
        this.NodesArr = []
        this.NodesArrUnSort = []
        this.NodesMap = {}
        this.NodesIPMap = {}
        this.WasNodesSort = true
        this.PerioadAfterCanStart = 0
        this.КодДляРазработчикаХекс = GetHexFromArr(this.KeyPair.computeSecret(DEVELOP_PUB_KEY, null))
        this.DO_CONSTANT()
        if(!global.ADDRLIST_MODE && !this.VirtualMode)
        {
            setInterval(this.StartPingPong.bind(this), 1000)
            setInterval(this.DeleteBadConnectingByTimer.bind(this), MAX_WAIT_PERIOD_FOR_STATUS / 2)
            setInterval(this.StartCheckTransferTree.bind(this), 1000)
        }
        setInterval(this.NodesArrSort.bind(this), 10000)
    }
    DO_CONSTANT()
    {
        this.CommonKey = GetHexFromArr(WALLET.HashProtect(global.COMMON_KEY))
        this.KeyToNode = shaarr(global.COMMON_KEY)
        this.NameToNode = this.ValueToXOR("Name", global.NODES_NAME)
    }
    СтатДанныеОтладкиИзБлока()
    {
        var Массив = [];
        if(this.СтатБлок && this.СтатБлок.SeqHash)
        {
            WriteArrToArr(Массив, this.ValueToXORDevelop("Stat:BlockNum", this.СтатБлок.BlockNum, "uint"), 6)
            WriteArrToArr(Массив, this.ValueToXORDevelop("Stat:SeqHash", this.СтатБлок.SeqHash, "hash"), 32)
            WriteArrToArr(Массив, this.ValueToXORDevelop("Stat:AddrHash", this.СтатБлок.AddrHash, "hash"), 32)
        }
        return Массив;
    }
    ДоступенКлючРазработчика(Node)
    {
        if(Node.PubKey && WALLET.WalletOpen !== false && IsDeveloperAccount(WALLET.PubKeyArr))
        {
            return 1;
        }
        return 0;
    }
    БлокИзДанных(Node, Arr)
    {
        var Block = {};
        if(this.ДоступенКлючРазработчика(Node) && !IsZeroArr(Arr))
        {
            var Data = BufLib.GetObjectFromBuffer(Arr, "{BlockNum:arr6,SeqHash:arr32,AddrHash:arr32}", {});
            Block.BlockNum = this.ValueFromXORDevelop(Node, "Stat:BlockNum", Data.BlockNum, "uint")
            Block.SeqHash = this.ValueFromXORDevelop(Node, "Stat:SeqHash", Data.SeqHash, "hash")
            Block.AddrHash = this.ValueFromXORDevelop(Node, "Stat:AddrHash", Data.AddrHash, "hash")
        }
        return Block;
    }
    StartConnectTry(Node)
    {
        var Delta = (new Date) - Node.StartTimeConnect;
        if(Delta >= Node.NextConnectDelta && this.IsCanConnect(Node))
        {
            if(!GetSocketStatus(Node.Socket))
            {
                Node.StartTimeConnect = (new Date) - 0
                if(Delta < 60 * 1000)
                    Node.NextConnectDelta = Node.NextConnectDelta * 2
                else
                    Node.NextConnectDelta = Math.trunc(Node.NextConnectDelta * 1.2)
                Node.CreateConnect()
            }
        }
    }
    FindRunNodeContext(addrArr, ip, port, bUpdate)
    {
        var Node, addrStr;
        addrStr = GetHexFromAddres(addrArr)
        Node = this.NodesMap[addrStr]
        if(!Node)
        {
            var key = "" + ip + ":" + port;
            Node = this.NodesIPMap[key]
            if(!Node)
            {
                Node = this.GetNewNode(addrStr, ip, port)
            }
        }
        if(Node.addrStr !== addrStr)
        {
            delete this.NodesMap[Node.addrStr]
            this.NodesMap[addrStr] = Node
            Node.addrStrTemp = undefined
        }
        Node.addrArr = addrArr
        Node.addrStr = addrStr
        Node.ip = ip.trim()
        Node.port = port
        return Node;
    }
    CheckNodeMap(Node)
    {
        if(Node.addrStrTemp && Node.addrStrTemp !== Node.addrStr)
        {
            delete this.NodesMap[Node.addrStrTemp]
            var Node2 = this.NodesMap[Node.addrStr];
            if(Node2 && Node2 !== Node)
            {
                Node2.Delete = 1
                AddNodeInfo(Node2, "FIND DOUBLE!!")
                delete this.NodesMap[Node.addrStr]
            }
            this.NodesMap[Node.addrStr] = Node
            Node.addrStrTemp = undefined
        }
    }
    StartHandshake(Node)
    {
        return this.StartConnectTry(Node);
    }
    StartPingPong()
    {
        if(glStopNode)
            return ;
        if(global.CAN_START)
            this.PerioadAfterCanStart++
        this.TimeDevCorrect()
        var arr = SERVER.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            if(this.IsCanConnect(Node) && !Node.IsAddrList)
            {
                if(Node.Hot)
                    Node.NextPing = 1000
                var Delta = (new Date) - Node.PingStart;
                if(Delta >= Node.NextPing)
                {
                    Node.PingStart = (new Date) - 0
                    Node.NextPing = Node.NextPing * 1.5
                    if(Node.NextPing > MAX_PERIOD_PING)
                        Node.NextPing = MAX_PERIOD_PING
                    if(!Node.PingNumber)
                        Node.PingNumber = 0
                    Node.PingNumber++
                    var Context = {"StartTime":GetCurrentTime(0), PingNumber:Node.PingNumber};
                    this.SendF(Node, {"Method":"PING", "Context":Context, "Data":this.GetPingData(Node)})
                }
            }
        }
    }
    GetPingData(Node)
    {
        var GrayAddres = 0;
        if(global.NET_WORK_MODE && !NET_WORK_MODE.UseDirectIP)
            GrayAddres = 1
        var BlockNumHash = GetCurrentBlockNumByTime() - BLOCK_PROCESSING_LENGTH2;
        var AccountsHash = DApps.Accounts.GetHashOrUndefined(BlockNumHash);
        var CheckPointHashDB = [];
        if(CHECK_POINT.BlockNum)
        {
            var Block = this.ReadBlockHeaderFromMapDB(CHECK_POINT.BlockNum);
            if(Block)
                CheckPointHashDB = Block.Hash
        }
        var HashDB = [];
        if(this.BlockNumDB > 0)
        {
            var Block = this.ReadBlockHeaderFromMapDB(this.BlockNumDB);
            if(Block)
                HashDB = Block.Hash
        }
        var LevelCount = this.GetLevelEnum(Node);
        var StopGetBlock = global.STOPGETBLOCK;
        if(!StopGetBlock && this.BusyLevel)
        {
            if(Node.BlockProcessCount <= this.BusyLevel)
                StopGetBlock = 1
        }
        var СтатДанные = this.СтатДанныеОтладкиИзБлока();
        var DirectMAccount = this.ValueToXORDevelop("MAccount", global.GENERATE_BLOCK_ACCOUNT, "uint");
        var Ret = {VERSIONMAX:DEF_VERSION, FIRST_TIME_BLOCK:0, PingVersion:3, GrayConnect:GrayAddres, Reserve2:0, AutoCorrectTime:AUTO_COORECT_TIME,
            LevelCount:LevelCount, Time:(GetCurrentTime() - 0), BlockNumDB:this.BlockNumDB, LoadHistoryMode:this.LoadHistoryMode, CanStart:global.CAN_START,
            CheckPoint:CHECK_POINT, Reserv3:[], Key:this.KeyToNode, Name:this.NameToNode, TrafficFree:this.SendTrafficFree, AccountBlockNum:BlockNumHash,
            AccountsHash:AccountsHash, MemoryUsage:Math.trunc(process.memoryUsage().heapTotal / 1024 / 1024), CheckDeltaTime:CHECK_DELTA_TIME,
            CodeVersion:CODE_VERSION, IsAddrList:global.ADDRLIST_MODE, CheckPointHashDB:CheckPointHashDB, Reserv4:0, HashDB:HashDB, StopGetBlock:StopGetBlock,
            СтатБлок:СтатДанные, DirectMAccount:DirectMAccount, Reserve:[], };
        return Ret;
    }
    static
    PING_F(bSend)
    {
        return "{\
            VERSIONMAX:str15,\
            PingVersion:byte,\
            GrayConnect:byte,\
            Reserve2:byte,\
            AutoCorrectTime:byte,\
            LevelCount:uint16,\
            Time:uint,\
            BlockNumDB:uint,\
            LoadHistoryMode:byte,\
            CanStart:byte,\
            CheckPoint:{BlockNum:uint,Hash:hash,Sign:arr64},\
            Reserv3:arr38,\
            Key:arr32,\
            Name:arr32,\
            TrafficFree:uint,\
            AccountBlockNum:uint,\
            AccountsHash:hash,\
            MemoryUsage:uint,\
            CheckDeltaTime:{Num:uint,bUse:byte,StartBlockNum:uint,EndBlockNum:uint,bAddTime:byte,DeltaTime:uint,Sign:arr64},\
            CodeVersion:{BlockNum:uint,addrArr:arr32,LevelUpdate:byte,BlockPeriod:uint,VersionNum:uint,Hash:hash,Sign:arr64},\
            IsAddrList:byte,\
            CheckPointHashDB:hash,\
            Reserv4:uint16,\
            HashDB:hash,\
            StopGetBlock:uint,\
            СтатНомер:uint,\
            СтатБлок:arr70,\
            DirectMAccount:arr6,\
            Reserve:arr10,\
            }";
    }
    static
    PONG_F(bSend)
    {
        return CConnect.PING_F(bSend);
    }
    PING(Info, CurTime)
    {
        this.DoPingData(Info, 1)
        this.SendF(Info.Node, {"Method":"PONG", "Context":Info.Context, "Data":this.GetPingData(Info.Node)})
    }
    DoPingData(Info, bCheckPoint)
    {
        var Node = Info.Node;
        var Data = this.DataFromF(Info);
        Info.Node.VERSIONMAX = Data.VERSIONMAX
        if(Data.PingVersion >= 3 && global.COMMON_KEY && CompareArr(Data.Key, this.KeyToNode) === 0)
        {
            Node.Name = this.ValueFromXOR(Node, "Name", Data.Name)
            if(Node.BlockProcessCount < 5000000)
                Node.BlockProcessCount = 5000000
        }
        else
        {
            Node.Name = ""
        }
        Node.INFO = Data
        Node.INFO.WasPing = 1
        Node.LevelCount = Data.LevelCount
        Node.LoadHistoryMode = Data.LoadHistoryMode
        Node.LastTime = GetCurrentTime() - 0
        Node.NextConnectDelta = 1000
        Node.GrayConnect = Data.GrayConnect
        Node.StopGetBlock = Data.StopGetBlock
        this.УстановитьСтатДанные(Node, Data.СтатБлок)
        if(this.ДоступенКлючРазработчика(Node))
        {
            Node.DirectMAccount = this.ValueFromXORDevelop(Node, "MAccount", Data.DirectMAccount, "uint")
        }
        if(bCheckPoint)
        {
            this.CheckCheckPoint(Data, Info.Node)
            this.CheckCodeVersion(Data, Info.Node)
            this.CheckDeltaTime(Data, Info.Node)
        }
    }
    УстановитьСтатДанные(Node, Данные)
    {
        Node.StatData = Данные
        Node.СтатДанныеБлока = this.БлокИзДанных(Node, Данные)
    }
    PONG(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        var Node = Info.Node;
        if(!Info.Context)
            return ;
        if(!Info.Context.StartTime)
            return ;
        if(Info.Context.PingNumber !== Node.PingNumber)
            return ;
        this.DoPingData(Info, 0)
        var DeltaTime = GetCurrentTime(0) - Info.Context.StartTime;
        Node.SumDeltaTime += DeltaTime
        Node.CountDeltaTime++
        Node.DeltaTime = Math.trunc(Node.SumDeltaTime / Node.CountDeltaTime)
        if(!Node.DeltaTime)
            Node.DeltaTime = 1000
        if(DeltaTime)
        {
            Node.DeltaGlobTime = GetCurrentTime() - (Data.Time + DeltaTime / 2)
        }
        this.CheckCheckPoint(Data, Info.Node)
        if(!START_LOAD_CODE.StartLoadVersionNum)
            START_LOAD_CODE.StartLoadVersionNum = 0
        this.CheckCodeVersion(Data, Info.Node)
        if(!global.CAN_START)
        {
            if(DeltaTime > MAX_PING_FOR_CONNECT)
                ToLog("DeltaTime=" + DeltaTime + ">" + MAX_PING_FOR_CONNECT + " ms  -  " + NodeInfo(Node))
        }
        var Times;
        if(DeltaTime <= MAX_PING_FOR_CONNECT)
        {
            Times = Node.Times
            if(!Times || Times.Count >= 10)
            {
                Times = {SumDelta:0, Count:0, AvgDelta:0, Arr:[]}
                Node.Times = Times
            }
            var Time1 = Data.Time;
            var Time2 = GetCurrentTime();
            var Delta2 =  - (Time2 - Time1 - DeltaTime / 2);
            Times.Arr.push(Delta2)
            Times.SumDelta += Delta2
            Times.Count++
            Times.AvgDelta = Times.SumDelta / Times.Count
            if(Times.Count >= 2)
            {
                Times.Arr.sort(function (a,b)
                {
                    return Math.abs(a) - Math.abs(b);
                })
                Node.AvgDelta = Times.Arr[0]
            }
            if(global.AUTO_COORECT_TIME)
            {
                this.CorrectTime()
            }
        }
        else
        {
        }
        ADD_TO_STAT("MAX:PING_TIME", DeltaTime)
        if(!global.CAN_START)
            if(Times && Times.Count >= 1 && Times.AvgDelta <= 200)
            {
                ToLog("****************************************** CAN_START")
                global.CAN_START = true
            }
        this.CheckDeltaTime(Data, Info.Node)
    }
    CheckCheckPoint(Data, Node)
    {
        if(CREATE_ON_START)
            return ;
        if(Data.CheckPoint.BlockNum && Data.CheckPoint.BlockNum > CHECK_POINT.BlockNum)
        {
            var SignArr = arr2(Data.CheckPoint.Hash, GetArrFromValue(Data.CheckPoint.BlockNum));
            if(CheckDevelopSign(SignArr, Data.CheckPoint.Sign))
            {
                ToLog("Get new CheckPoint = " + Data.CheckPoint.BlockNum)
                this.ResetNextPingAllNode()
                global.CHECK_POINT = Data.CheckPoint
                var Block = this.ReadBlockHeaderDB(CHECK_POINT.BlockNum);
                if(Block && CompareArr(Block.Hash, CHECK_POINT.Hash) !== 0)
                {
                    this.BlockNumDB = CHECK_POINT.BlockNum - 1
                    this.TruncateBlockDB(this.BlockNumDB)
                    this.StartLoadHistory(Node)
                }
            }
            else
            {
                Node.NextConnectDelta = 60 * 1000
                ToLog("Error Sign CheckPoint=" + Data.CheckPoint.BlockNum + " from " + NodeInfo(Node))
                this.AddCheckErrCount(Node, 1, "Error Sign CheckPoint")
            }
        }
    }
    CheckDeltaTime(Data, Node)
    {
        if(global.AUTO_COORECT_TIME)
            if(global.CAN_START && !CREATE_ON_START)
            {
                if(Data.CheckDeltaTime.Num > CHECK_DELTA_TIME.Num)
                {
                    var SignArr = this.GetSignCheckDeltaTime(Data.CheckDeltaTime);
                    if(CheckDevelopSign(SignArr, Data.CheckDeltaTime.Sign))
                    {
                        global.CHECK_DELTA_TIME = Data.CheckDeltaTime
                    }
                    else
                    {
                        Node.NextConnectDelta = 60 * 1000
                        ToLog("Error Sign CheckDeltaTime Num=" + Data.CheckDeltaTime.Num + " from " + NodeInfo(Node))
                        this.AddCheckErrCount(Node, 1, "Error Sign CheckDeltaTime")
                    }
                }
            }
    }
    CheckCodeVersion(Data, Node)
    {
        var CodeVersion = Data.CodeVersion;
        Node.VersionNum = CodeVersion.VersionNum
        if(CodeVersion.VersionNum >= MIN_CODE_VERSION_NUM)
        {
            Node.VersionOK = true
        }
        else
        {
            Node.VersionOK = false
        }
        if(Node.VersionOK && !Data.LoadHistoryMode)
        {
            Node.CanHot = true
            if(CHECK_POINT.BlockNum && Data.CheckPoint.BlockNum)
                if(CHECK_POINT.BlockNum !== Data.CheckPoint.BlockNum || CompareArr(CHECK_POINT.Hash, Data.CheckPoint.Hash) !== 0)
                {
                    Node.CanHot = false
                    Node.NextConnectDelta = 60 * 1000
                }
        }
        else
        {
            Node.CanHot = false
            if(!Node.VersionOK)
            {
                Node.NextConnectDelta = 60 * 1000
            }
        }
        var bLoadVer = 0;
        if(CodeVersion.BlockNum && (CodeVersion.BlockNum <= GetCurrentBlockNumByTime() || CodeVersion.BlockPeriod === 0) && CodeVersion.BlockNum > CODE_VERSION.BlockNum && !IsZeroArr(CodeVersion.Hash) && (CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum || CodeVersion.VersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            bLoadVer = 1
        }
        if(bLoadVer)
        {
            var Level = AddrLevelArrFromBegin(this.addrArr, CodeVersion.addrArr);
            if(CodeVersion.BlockPeriod)
            {
                var Delta = GetCurrentBlockNumByTime() - CodeVersion.BlockNum;
                Level += Delta / CodeVersion.BlockPeriod
            }
            if(Level >= CodeVersion.LevelUpdate)
            {
                var SignArr = arr2(CodeVersion.Hash, GetArrFromValue(CodeVersion.VersionNum));
                if(CheckDevelopSign(SignArr, CodeVersion.Sign))
                {
                    ToLog("Get new CodeVersion = " + CodeVersion.VersionNum + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0, 20))
                    if(CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum)
                    {
                        this.StartLoadCode(Node, CodeVersion)
                    }
                    else
                    {
                        CODE_VERSION = CodeVersion
                    }
                }
                else
                {
                    ToLog("Error Sign CodeVersion=" + CodeVersion.VersionNum + " from " + NodeInfo(Node) + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0,
                    20))
                    ToLog(JSON.stringify(CodeVersion))
                    this.AddCheckErrCount(Node, 1, "Error Sign CodeVersion")
                    Node.NextConnectDelta = 60 * 1000
                }
            }
        }
    }
    GetSignCheckDeltaTime(Data)
    {
        var Buf = BufLib.GetBufferFromObject(Data, "{Num:uint,bUse:byte,StartBlockNum:uint,EndBlockNum:uint,bAddTime:byte,DeltaTime:uint}",
        1000, {});
        return shaarr(Buf);
    }
    ResetNextPingAllNode()
    {
        var arr = SERVER.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node2 = arr[i];
            if(Node2 && Node2.NextPing > 5 * 1000)
                Node2.NextPing = 5 * 1000
        }
    }
    StartDisconnectHot(Node, StrError, bDeleteHot)
    {
        AddNodeInfo(Node, "DisconnectHot:" + StrError)
        if(Node.Active && Node.Hot)
        {
            AddNodeInfo(Node, "SEND DISCONNECTHOT")
            this.Send(Node, {"Method":"DISCONNECTHOT", "Context":{}, "Data":StrError}, STR_TYPE)
        }
        this.DeleteNodeFromHot(Node)
    }
    DISCONNECTHOT(Info, CurTime)
    {
        this.DeleteNodeFromHot(Info.Node)
        ADD_TO_STAT("DISCONNECTHOT")
        AddNodeInfo(Info.Node, "GET DISCONNECTHOT:" + Info.Data)
    }
    StartGetNodes(Node)
    {
        if(glStopNode)
            return ;
        var Delta = (new Date) - Node.StartTimeGetNodes;
        if(Delta >= Node.NextGetNodesDelta)
        {
            Node.StartTimeGetNodes = (new Date) - 0
            Node.NextGetNodesDelta = Math.min(Node.NextGetNodesDelta * 2, MAX_PERIOD_GETNODES)
            if(global.ADDRLIST_MODE)
                Node.NextGetNodesDelta = MAX_PERIOD_GETNODES
            this.Send(Node, {"Method":"GETNODES", "Context":{}, "Data":undefined})
        }
    }
    GETNODES(Info, CurTime)
    {
        this.SendF(Info.Node, {"Method":"RETGETNODES2", "Context":Info.Context, "Data":{arr:this.GetDirectNodesArray(false), IsAddrList:global.ADDRLIST_MODE,
            }}, MAX_NODES_RETURN * 250 + 300)
    }
    static
    RETGETNODES2_F()
    {
        return "{arr:[\
                        {\
                            addrStr:str64,\
                            ip:str30,\
                            port:uint16,\
                            Reserve:uint16,\
                            LastTime:uint,\
                            DeltaTime:uint,\
                            StatData:arr70\
                        }\
                    ],\
                    IsAddrList:byte}";
    }
    RETGETNODES2(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        var arr = Data.arr;
        if(arr && arr.length > 0)
        {
            for(var i = 0; i < arr.length; i++)
            {
                this.AddToArrNodes(arr[i], true)
            }
        }
        Info.Node.IsAddrList = Data.IsAddrList
        AddNodeInfo(Info.Node, "RETGETNODES2 length=" + arr.length)
    }
    GetNewNode(addrStr, ip, port)
    {
        var Node = new CNode(addrStr, ip, port);
        this.AddToArrNodes(Node, false)
        return Node;
    }
    IsCanConnect(Node)
    {
        if(Node.addrStr === this.addrStr || this.NodeInBan(Node) || Node.Delete || Node.Self || Node.DoubleConnection)
            return false;
        if(Node.ip === this.ip && Node.port === this.port)
            return false;
        if(this.addrStr === Node.addrStr)
            return false;
        return true;
    }
    GetDirectNodesArray(bAll)
    {
        var ret = [];
        var Value = {addrStr:this.addrStr, ip:this.ip, port:this.port, LastTime:0, DeltaTime:0, Hot:true, BlockProcessCount:0};
        ret.push(Value)
        if(global.NET_WORK_MODE && (!NET_WORK_MODE.UseDirectIP))
            return ret;
        var len = this.NodesArr.length;
        var UseRandom = 0;
        if(len > MAX_NODES_RETURN && !bAll)
        {
            UseRandom = 1
            len = MAX_NODES_RETURN
        }
        var mapWasAdd = {};
        var CurTime = GetCurrentTime();
        for(var i = 0; i < len; i++)
        {
            var Item;
            if(UseRandom)
            {
                Item = this.NodesArr[random(this.NodesArr.length)]
                if(mapWasAdd[Item.addrStr])
                {
                    continue;
                }
                mapWasAdd[Item.addrStr] = 1
            }
            else
            {
                Item = this.NodesArr[i]
            }
            if(!this.IsCanConnect(Item))
                continue;
            if(Item.GrayConnect)
                continue;
            if(Item.BlockProcessCount < 0)
                continue;
            if(Item.LastTime - 0 < CurTime - 3600 * 1000)
                continue;
            var Value = {addrStr:Item.addrStr, ip:Item.ip, port:Item.port, FirstTime:Item.FirstTime, FirstTimeStr:Item.FirstTimeStr, LastTime:Item.LastTime - 0,
                DeltaTime:Item.DeltaTime, Hot:Item.Hot, BlockProcessCount:Item.BlockProcessCount, Name:Item.Name, };
            ret.push(Value)
        }
        return ret;
    }
    AddToArrNodes(Item)
    {
        if(Item.addrStr === "" || Item.addrStr === this.addrStr)
            return ;
        var Node;
        var key = Item.ip + ":" + Item.port;
        Node = this.NodesMap[Item.addrStr]
        if(!Node)
        {
            Node = this.NodesIPMap[key]
        }
        if(!Node)
        {
            if(Item instanceof CNode)
                Node = Item
            else
                Node = new CNode(Item.addrStr, Item.ip, Item.port)
            Node.id = this.NodesArr.length
            Node.addrArr = GetAddresFromHex(Node.addrStr)
            this.NodesMap[Node.addrStr] = Node
            this.NodesArr.push(Node)
            this.NodesArrUnSort.push(Node)
            ADD_TO_STAT("AddToNodes")
        }
        this.NodesMap[Node.addrStr] = Node
        this.NodesIPMap[key] = Node
        if(Node.addrArr && CompareArr(Node.addrArr, this.addrArr) === 0)
        {
            Node.Self = true
        }
        if(Item.BlockProcessCount)
            Node.BlockProcessCount = Item.BlockProcessCount
        if(Item.FirstTime)
        {
            Node.FirstTime = Item.FirstTime
            Node.FirstTimeStr = Item.FirstTimeStr
        }
        if(Item.Name)
            Node.Name = Item.Name
        if(Item.StatData)
        {
            if(!Node.StatData)
                this.УстановитьСтатДанные(Node, Item.StatData)
            else
            {
                var BlockNum = ReadUintFromArr(Item.StatData, 0);
                var BlockWas = ReadUintFromArr(Node.StatData, 0);
                if(BlockNum > BlockWas && BlockNum < GetCurrentBlockNumByTime() - 3)
                    this.УстановитьСтатДанные(Node, Item.StatData)
            }
        }
        return Node;
    }
    NodesArrSort()
    {
        this.NodesArr.sort(SortNodeBlockProcessCount)
        if(!this.LoadHistoryMode && (new Date()) - this.StartTime > 120 * 1000)
        {
            var arr = this.GetDirectNodesArray(true).slice(1);
            SaveParams(GetDataPath("nodes.lst"), arr)
        }
    }
    LoadNodesFromFile()
    {
        var arr = LoadParams(GetDataPath("nodes.lst"), []);
        arr.sort(SortNodeBlockProcessCount)
        for(var i = 0; i < arr.length; i++)
        {
            if(arr[i].LastTime)
            {
                if(typeof arr[i].LastTime === "string")
                    arr[i].LastTime = 0
            }
            this.AddToArrNodes(arr[i], true)
        }
    }
    GetLevelEnum(Node)
    {
        var Level = this.AddrLevelNode(Node);
        var arr0 = this.LevelNodes[Level];
        if(!arr0)
        {
            Node.LevelEnum = 1
            return 1;
        }
        var arr = [].concat(arr0);
        var bWas = 0;
        for(var n = 0; n < arr.length; n++)
        {
            if(arr[n] === Node)
            {
                bWas = 1
                break;
            }
        }
        if(!bWas)
            arr.push(Node)
        arr.sort(SortNodeBlockProcessCount)
        for(var n = 0; n < arr.length; n++)
        {
            if(arr[n] === Node)
            {
                Node.LevelEnum = 1 + n
                break;
            }
        }
        return Node.LevelEnum;
    }
    StartAddLevelConnect(Node)
    {
        if(!global.CAN_START)
            return ;
        ADD_TO_STAT("NETCONFIGURATION")
        if(Node.Active && Node.CanHot)
            this.SendF(Node, {"Method":"ADDLEVELCONNECT", "Context":{}, "Data":this.GetLevelEnum(Node)})
    }
    static
    ADDLEVELCONNECT_F()
    {
        return "uint";
    }
    ADDLEVELCONNECT(Info, CurTime)
    {
        Info.Node.LevelCount = this.DataFromF(Info)
        var ret;
        var Count;
        if(!global.CAN_START)
            return ;
        var Count = this.GetLevelEnum(Info.Node);
        var bAdd = this.AddLevelConnect(Info.Node);
        if(bAdd)
        {
            ret = {result:1, Count:Count}
        }
        else
        {
            ret = {result:0, Count:Count}
        }
        AddNodeInfo(Info.Node, "GET ADDLEVELCONNECT, DO bAdd=" + bAdd)
        this.SendF(Info.Node, {"Method":"RETADDLEVELCONNECT", "Context":Info.Context, "Data":ret})
    }
    AddLevelConnect(Node)
    {
        if(!global.CAN_START)
            return false;
        var Level = this.AddrLevelNode(Node);
        Node.Hot = true
        var arr = this.LevelNodes[Level];
        if(!arr)
        {
            arr = []
            this.LevelNodes[Level] = arr
        }
        var bWas = 0;
        for(var i = 0; i < arr.length; i++)
            if(arr[i] === Node)
            {
                bWas = 1
            }
        if(!bWas)
            arr.push(Node)
        Node.TransferCount = 0
        if(this.LoadHistoryMode)
            Node.LastTimeTransfer = (GetCurrentTime() - 0) + 30 * 1000
        else
            Node.LastTimeTransfer = (GetCurrentTime() - 0) + 10 * 1000
        Node.CanHot = true
        this.CheckDisconnectHot(Level)
        if(!Node.CanHot)
            return false;
        this.SendGetMessage(Node)
        ADD_TO_STAT("NETCONFIGURATION")
        ADD_TO_STAT("AddLevelConnect")
        AddNodeInfo(Node, "Add Level connect")
        return true;
    }
    static
    RETADDLEVELCONNECT_F()
    {
        return "{result:byte,Count:uint}";
    }
    RETADDLEVELCONNECT(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        AddNodeInfo(Info.Node, "GET RETADDLEVELCONNECT: " + Data.result)
        if(Data.result === 1)
        {
            this.AddLevelConnect(Info.Node)
        }
        else
        {
            this.AddCheckErrCount(Info.Node, 1)
        }
        Info.Node.LevelCount = Data.Count
    }
    DeleteBadConnectingByTimer()
    {
        if(glStopNode)
            return ;
        var CurTime = GetCurrentTime();
        var arr = SERVER.NodesArr;
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            var Status = GetSocketStatus(Node.Socket);
            if(Node.Active && Status < 100)
            {
                var Delta = CurTime - Node.LastTime;
                if(Delta > MAX_WAIT_PERIOD_FOR_STATUS)
                {
                    AddNodeInfo(Node, "Close bad connecting by time")
                    this.DeleteNodeFromActive(Node)
                }
            }
        }
    }
    CheckDisconnectHot(Level)
    {
        var CurTime = GetCurrentTime() - 0;
        var MaxCountChilds;
        if(Level < 3)
            MaxCountChilds = 4
        else
            MaxCountChilds = MAX_CONNECT_CHILD
        var arr = this.LevelNodes[Level];
        if(arr)
        {
            for(var n = arr.length - 1; n >= 0; n--)
            {
                var Node = arr[n];
                if(Node)
                {
                    var DeltaTime = CurTime - Node.LastTimeTransfer;
                    if(!Node.Hot || DeltaTime > MAX_WAIT_PERIOD_FOR_HOT)
                    {
                        this.StartDisconnectHot(Node, "TimeDisconnectHot")
                    }
                }
            }
            arr.sort(SortNodeBlockProcessCount)
            var ChildCount = arr.length;
            for(var n = arr.length - 1; n >= MIN_CONNECT_CHILD; n--)
            {
                var Node = arr[n];
                if(Node)
                {
                    if(ChildCount > MaxCountChilds)
                    {
                        ChildCount--
                        Node.CanHot = false
                        this.StartDisconnectHot(Node, "MAX_CONNECT_CHILD")
                        ADD_TO_STAT("DisconnectChild")
                        continue;
                    }
                    if(ChildCount > (MIN_CONNECT_CHILD) && Node.LevelCount > MIN_CONNECT_CHILD)
                    {
                        ChildCount--
                        Node.CanHot = false
                        this.AddCheckErrCount(Node, 1)
                        this.StartDisconnectHot(Node, "MIN_CONNECT_CHILD:" + Node.LevelCount + " LevelEnum:" + (n + 1))
                        ADD_TO_STAT("DisconnectChild")
                        continue;
                    }
                }
            }
        }
    }
    SetTime(NewTime)
    {
        ToLog("Set new time: " + NewTime)
        global.DELTA_CURRENT_TIME = NewTime - (GetCurrentTime(0) - 0)
        SAVE_CONST(true)
    }
    ConnectToAll()
    {
        var Count = 0;
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Node = this.NodesArr[i];
            if(!Node.Active && this.IsCanConnect(Node) && !Node.WasAddToConnect)
            {
                AddNodeInfo(Node, "To connect all")
                Node.NextConnectDelta = 1000
                Node.WasAddToConnect = 1
                ArrConnect.push(Node)
                Count++
            }
        }
        return Count;
    }
    GetHotTimeNodes()
    {
        if(this.LoadHistoryMode || !global.CAN_START)
            return this.GetActualNodes();
        else
            return this.GetHotNodes();
    }
    CorrectTime()
    {
        var ArrNodes = this.GetHotTimeNodes();
        var CountNodes = ArrNodes.length;
        var DeltaArr = [];
        var NodesSet = new Set();
        for(var i = 0; i < ArrNodes.length; i++)
        {
            var Node = ArrNodes[i];
            if(!Node.Times)
                continue;
            if(Node.Times.Count < 2)
                continue;
            if(this.PerioadAfterCanStart >= PERIOD_FOR_START_CHECK_TIME)
                if(Node.Times.Count < 5)
                    continue;
            NodesSet.add(Node)
        }
        for(var Node of NodesSet)
        {
            DeltaArr.push(Node.Times.AvgDelta)
        }
        if(DeltaArr.length < 1)
            return ;
        if(DeltaArr.length < CountNodes / 2)
            return ;
        if(this.PerioadAfterCanStart >= PERIOD_FOR_START_CHECK_TIME)
        {
            if(DeltaArr.length < 3 * CountNodes / 4)
                return ;
        }
        DeltaArr.sort(function (a,b)
        {
            return a - b;
        })
        var start, finish;
        if(Math.floor(DeltaArr.length / 2) === DeltaArr.length / 2)
        {
            start = DeltaArr.length / 2 - 1
            finish = start + 1
        }
        else
        {
            start = Math.floor(DeltaArr.length / 2)
            finish = start
        }
        var Sum = 0;
        var Count = 0;
        for(var i = start; i <= finish; i++)
        {
            Sum = Sum + DeltaArr[i]
            Count++
        }
        var AvgDelta = Sum / Count;
        if(this.PerioadAfterCanStart < PERIOD_FOR_START_CHECK_TIME)
        {
            var KT = (PERIOD_FOR_START_CHECK_TIME - this.PerioadAfterCanStart) / PERIOD_FOR_START_CHECK_TIME;
            AvgDelta = AvgDelta * KT
        }
        else
        {
            MAX_TIME_CORRECT = 25
        }
        if(AvgDelta < ( - MAX_TIME_CORRECT))
            AvgDelta =  - MAX_TIME_CORRECT
        else
            if(AvgDelta > MAX_TIME_CORRECT)
                AvgDelta = MAX_TIME_CORRECT
        AvgDelta = Math.trunc(AvgDelta)
        if(Math.abs(AvgDelta) < 15)
        {
            return ;
        }
        if(AvgDelta > 0)
            ADD_TO_STAT("CORRECT_TIME_UP", AvgDelta)
        else
            ADD_TO_STAT("CORRECT_TIME_DOWN", AvgDelta)
        global.DELTA_CURRENT_TIME = Math.trunc(global.DELTA_CURRENT_TIME + AvgDelta)
        this.ClearTimeStat()
        SAVE_CONST()
    }
    ClearTimeStat()
    {
        var ArrNodes = this.GetHotTimeNodes();
        for(var Node of ArrNodes)
        {
            Node.Times = undefined
        }
    }
    TimeDevCorrect()
    {
        if(CHECK_DELTA_TIME.bUse)
        {
            var BlockNum = GetCurrentBlockNumByTime();
            if(CHECK_DELTA_TIME.StartBlockNum <= BlockNum && CHECK_DELTA_TIME.EndBlockNum > BlockNum)
            {
                if(!global.DELTA_CURRENT_TIME)
                    global.DELTA_CURRENT_TIME = 0
                var CorrectTime = 0;
                if(CHECK_DELTA_TIME.bAddTime)
                    CorrectTime = CHECK_DELTA_TIME.DeltaTime
                else
                    CorrectTime =  - CHECK_DELTA_TIME.DeltaTime
                global.DELTA_CURRENT_TIME += CorrectTime
                this.ClearTimeStat()
                SAVE_CONST(true)
            }
        }
    }
    SetNodePrioritet(Node, Prioritet)
    {
        if(Node.Prioritet === Prioritet)
            return ;
        if(Node.addrArr)
        {
            var Item = this.ActualNodes.find(Node);
            if(Item)
            {
                this.ActualNodes.remove(Node)
                Node.Prioritet = Prioritet
                this.ActualNodes.insert(Node)
            }
        }
        Node.Prioritet = Prioritet
    }
    AddNodeToActive(Node)
    {
        if(Node.addrArr)
        {
            if(CompareArr(Node.addrArr, this.addrArr) === 0)
            {
                return ;
            }
            this.CheckNodeMap(Node)
            this.ActualNodes.insert(Node)
        }
        Node.ResetNode()
        Node.Active = true
        Node.NextConnectDelta = 1000
        if(!Node.FirstTime)
        {
            Node.FirstTime = GetCurrentTime() - 0
            Node.FirstTimeStr = "" + GetStrTimeUTC()
        }
        ADD_TO_STAT("AddToActive")
    }
    DeleteNodeFromActive(Node)
    {
        Node.Active = false
        if(Node.Hot)
            this.StartDisconnectHot(Node, "NotActive", 1)
        Node.Hot = false
        this.ActualNodes.remove(Node)
        CloseSocket(Node.Socket, "DeleteNodeFromActive")
        CloseSocket(Node.Socket2, "DeleteNodeFromActive")
        Node.ResetNode()
    }
    StartReconnect()
    {
        return ;
        var arr = this.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            if(Node.Socket && Node.Socket.ConnectToServer)
            {
                if(!Node.SocketStart)
                    Node.SocketStart = (new Date) - 0
                var DeltaTime = (new Date) - Node.SocketStart;
                if(DeltaTime >= PERIOD_FOR_RECONNECT)
                {
                    if(random(100) >= 90)
                        Node.CreateReconnection()
                }
            }
        }
    }
    IsLocalIP(addr)
    {
        if(addr.substr(0, 7) === "192.168" || addr.substr(0, 3) === "10.")
            return 1;
        else
            return 0;
    }
    GetActualsServerIP(bFlag)
    {
        var arr = this.GetActualNodes();
        var Str = "";
        arr.sort(function (a,b)
        {
            if(a.ip > b.ip)
                return  - 1;
            else
                if(a.ip < b.ip)
                    return 1;
                else
                    return 0;
        })
        if(bFlag)
            return arr;
        for(var i = 0; i < arr.length; i++)
        {
            Str += arr[i].ip + ", "
        }
        return Str.substr(0, Str.length - 2);
    }
    AddrLevelNode(Node)
    {
        if(Node.GrayConnect)
            return MAX_LEVEL_SPECIALIZATION - 1;
        return AddrLevelArr(this.addrArr, Node.addrArr);
    }
    GetNodesLevelCount()
    {
        var Count = 0;
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
                if(arr[n].Hot)
                {
                    Count++
                    break;
                }
        }
        return Count;
    }
    GetHotNodes()
    {
        var ArrNodes = [];
        for(var L = 0; L < this.LevelNodes.length; L++)
        {
            var arr = this.LevelNodes[L];
            for(let j = 0; arr && j < arr.length; j++)
            {
                ArrNodes.push(arr[j])
            }
        }
        return ArrNodes;
    }
    DeleteNodeFromHot(Node)
    {
        if(Node.Hot)
        {
            Node.Hot = false
        }
        Node.CanHot = false
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
                if(arr[n] === Node)
                {
                    arr.splice(n, 1)
                    ADD_TO_STAT("DeleteLevelConnect")
                    ADD_TO_STAT("NETCONFIGURATION")
                    break;
                }
        }
    }
    DeleteAllNodesFromHot(Str)
    {
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
            {
                var Node = arr[n];
                if(Node.Hot)
                {
                    ADD_TO_STAT("DeleteAllNodesFromHot")
                    this.StartDisconnectHot(Node, Str, 1)
                }
            }
        }
    }
    GetTransferTree()
    {
        var HotArr = [];
        for(var Level = 0; Level < this.LevelNodes.length; Level++)
        {
            var arr = this.LevelNodes[Level];
            HotArr[Level] = []
            for(var n = 0; arr && n < arr.length; n++)
            {
                var Node = arr[n];
                if(Node)
                {
                    Node.Hot = 1
                    Node.Level = Level
                    HotArr[Level].push(Node)
                }
            }
        }
        var arr = this.NodesArr;
        for(var n = 0; arr && n < arr.length; n++)
        {
            var Node = arr[n];
            if(!Node)
                continue;
            if(Node.Hot)
                continue;
            if(!this.IsCanConnect(Node))
                continue;
            Node.Level = this.AddrLevelNode(Node)
            if(!HotArr[Node.Level])
                HotArr[Node.Level] = []
            HotArr[Node.Level].push(Node)
        }
        return HotArr;
    }
    StartCheckTransferTree()
    {
        var ArrTree = this.GetTransferTree();
        this.TransferTree = ArrTree
        var CurTime = (new Date) - 0;
        for(var Level = 0; Level < ArrTree.length; Level++)
        {
            var arr = ArrTree[Level];
            if(!arr)
                continue;
            arr.sort(SortNodeBlockProcessCount)
            var WasDoConnect = 0;
            var WasDoHot = 0;
            var length = Math.min(arr.length, 10);
            for(var n = 0; n < length; n++)
            {
                var Node = arr[n];
                var DeltaTime = CurTime - Node.StartTimeConnect;
                if(!Node.Active && WasDoConnect < 5 && !Node.WasAddToConnect && DeltaTime >= Node.NextConnectDelta)
                {
                    AddNodeInfo(Node, "To connect")
                    Node.WasAddToConnect = 1
                    ArrConnect.push(Node)
                    WasDoConnect++
                }
                DeltaTime = CurTime - Node.StartTimeHot
                if(Node.Active && !Node.Hot && WasDoHot < MIN_CONNECT_CHILD && DeltaTime > Node.NextHotDelta)
                {
                    AddNodeInfo(Node, "To hot level")
                    this.StartAddLevelConnect(Node)
                    Node.StartTimeHot = CurTime
                    Node.NextHotDelta = Node.NextHotDelta * 2
                    WasDoHot++
                }
                if(Node.Hot)
                    WasDoHot++
            }
            this.CheckDisconnectHot(Level)
        }
    }
    ValueToXOR(StrType, Str)
    {
        var Arr1 = toUTF8Array(Str);
        var Arr2 = shaarr(this.CommonKey + ":" + this.addrStr + ":" + StrType);
        return WALLET.XORHash(Arr1, Arr2, 32);
    }
    ValueFromXOR(Node, StrType, Arr1)
    {
        var Arr2 = shaarr(this.CommonKey + ":" + Node.addrStr + ":" + StrType);
        var Arr = WALLET.XORHash(Arr1, Arr2, 32);
        var Str = Utf8ArrayToStr(Arr);
        return Str;
    }
    ValueToXORDevelop(StrName, Data, Type)
    {
        var Arr1;
        if(Type === "uint")
        {
            Arr1 = []
            WriteUintToArr(Arr1, Data)
        }
        else
            if(Type === "hash")
            {
                Arr1 = Data
            }
            else
                if(Type === "str")
                {
                    Arr1 = toUTF8Array(Data)
                }
        var Arr2 = shaarr(this.КодДляРазработчикаХекс + ":" + StrName);
        return WALLET.XORHash(Arr1, Arr2, Arr1.length);
    }
    ValueFromXORDevelop(Node, StrName, Arr1, Type)
    {
        if(!Node.КодДляРазработчикаХекс)
        {
            Node.КодДляРазработчикаХекс = GetHexFromArr(WALLET.KeyPair.computeSecret(Node.PubKey, null))
        }
        var Arr2 = shaarr(Node.КодДляРазработчикаХекс + ":" + StrName);
        var Arr = WALLET.XORHash(Arr1, Arr2, Arr1.length);
        if(Type === "uint")
        {
            return ReadUintFromArr(Arr, 0);
        }
        else
            if(Type === "hash")
            {
                return Arr;
            }
        var Str = Utf8ArrayToStr(Arr);
        return Str;
    }
};

function SortNodeBlockProcessCount(a,b)
{
    if(b.BlockProcessCount !== a.BlockProcessCount)
        return b.BlockProcessCount - a.BlockProcessCount;
    if(a.DeltaTime !== b.DeltaTime)
        return a.DeltaTime - b.DeltaTime;
    return a.id - b.id;
};
global.SortNodeBlockProcessCount = SortNodeBlockProcessCount;
